import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { slugify } from '../../lib/sanitizer/filenameSanitizer'
import { ValidationError, AuthorizationError, NotFoundError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Asset, AssetFile, AssetStatus, AssetType, UserRole } from '../../types/database'

export interface ListAssetsFilter {
  type?: AssetType
  categorySlug?: string
  licenseSlug?: string
  search?: string
  status?: AssetStatus
  isFeatured?: boolean
  limit?: number
  offset?: number
}

export class AssetService {
  /**
   * List assets respecting Row Level Security (RLS) rules.
   */
  public static async listAssets(
    filter: ListAssetsFilter,
    currentUserId: string | null,
    currentUserRole: UserRole | null
  ): Promise<{ assets: Asset[]; total: number }> {
    // 1. Try Remote Supabase if available
    const admin = getSupabaseAdminClient()
    if (admin) {
      let query = admin
        .from('assets')
        .select(`
          *,
          author:profiles(*),
          category:categories(*),
          license:licenses(*),
          files:asset_files(*)
        `, { count: 'exact' })

      // Apply RLS filter:
      if (currentUserRole !== 'ADMIN') {
        if (currentUserId) {
          query = query.or(`status.eq.PUBLISHED,author_id.eq.${currentUserId}`)
        } else {
          query = query.eq('status', 'PUBLISHED')
        }
      }

      if (filter.type) query = query.eq('type', filter.type)
      if (filter.status && currentUserRole === 'ADMIN') query = query.eq('status', filter.status)
      if (filter.isFeatured !== undefined) query = query.eq('is_featured', filter.isFeatured)

      query = query.order('created_at', { ascending: false })
      if (filter.limit) query = query.limit(filter.limit)
      if (filter.offset) query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1)

      const { data, count, error } = await query
      if (!error && data) {
        return { assets: data as Asset[], total: count || data.length }
      }
    }

    // 2. In-Memory Store Query with RLS Enforcement
    let items = dbStore.filterAssetsByRLS(currentUserId, currentUserRole)

    if (filter.type) {
      items = items.filter(a => a.type === filter.type)
    }

    if (filter.status) {
      // If user is requesting specific status, ensure authorized
      if (currentUserRole === 'ADMIN' || filter.status === 'PUBLISHED') {
        items = items.filter(a => a.status === filter.status)
      } else if (currentUserId) {
        items = items.filter(a => a.status === filter.status && a.author_id === currentUserId)
      }
    }

    if (filter.categorySlug) {
      const cat = Array.from(dbStore.categories.values()).find(c => c.slug === filter.categorySlug)
      if (cat) {
        items = items.filter(a => a.category_id === cat.id)
      }
    }

    if (filter.licenseSlug) {
      const lic = Array.from(dbStore.licenses.values()).find(l => l.slug === filter.licenseSlug)
      if (lic) {
        items = items.filter(a => a.license_id === lic.id)
      }
    }

    if (filter.search) {
      const query = filter.search.toLowerCase()
      items = items.filter(a => 
        a.name.toLowerCase().includes(query) ||
        (a.description && a.description.toLowerCase().includes(query)) ||
        a.slug.toLowerCase().includes(query)
      )
    }

    const total = items.length
    const offset = filter.offset || 0
    const limit = filter.limit || 50
    const paged = items.slice(offset, offset + limit)

    // Populate relations
    const enriched = paged.map(asset => this.enrichAsset(asset))

    return { assets: enriched, total }
  }

  /**
   * Retrieve asset by ID or Slug.
   */
  public static async getAssetById(
    idOrSlug: string,
    currentUserId: string | null,
    currentUserRole: UserRole | null
  ): Promise<Asset> {
    const asset = Array.from(dbStore.assets.values()).find(a => a.id === idOrSlug || a.slug === idOrSlug)
    if (!asset) {
      throw new NotFoundError('Asset')
    }

    // RLS Read Check
    const isPublic = asset.status === 'PUBLISHED'
    const isAuthor = currentUserId && asset.author_id === currentUserId
    const isAdmin = currentUserRole === 'ADMIN'

    if (!isPublic && !isAuthor && !isAdmin) {
      throw new AuthorizationError('You do not have permission to view this non-published asset')
    }

    return this.enrichAsset(asset)
  }

  /**
   * Create an Asset.
   */
  public static async createAsset(
    data: {
      name: string
      type?: AssetType
      description?: string | null
      category_id?: string | null
      license_id?: string | null
      status?: AssetStatus
      is_featured?: boolean
      tag_ids?: string[]
      metadata?: Record<string, any>
    },
    authorId: string,
    authorRole: UserRole
  ): Promise<Asset> {
    const type = data.type || 'ICON'
    const status = data.status || 'DRAFT'

    // RLS Enforcement: Regular users CANNOT create assets directly in PUBLISHED status
    if (status === 'PUBLISHED' && authorRole !== 'ADMIN') {
      throw new AuthorizationError('Only Administrators can publish assets directly. Use DRAFT status.')
    }

    // Database Constraint: Published assets MUST have a license
    if (status === 'PUBLISHED' && !data.license_id) {
      throw new ValidationError('A published asset must have an assigned license')
    }

    // Generate unique slug
    let baseSlug = slugify(data.name)
    let slug = baseSlug
    let counter = 1
    while (Array.from(dbStore.assets.values()).some(a => a.slug === slug)) {
      slug = `${baseSlug}-${counter++}`
    }

    const assetId = `a${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date().toISOString()

    const newAsset: Asset = {
      id: assetId,
      type,
      name: data.name.trim(),
      slug,
      description: data.description || null,
      status,
      author_id: authorId,
      license_id: data.license_id || null,
      category_id: data.category_id || null,
      is_featured: authorRole === 'ADMIN' ? (data.is_featured || false) : false,
      download_count: 0,
      favorite_count: 0,
      metadata: data.metadata || {},
      created_at: now,
      updated_at: now
    }

    // Persist in store
    dbStore.assets.set(assetId, newAsset)

    // Associate tags if provided
    if (data.tag_ids && Array.isArray(data.tag_ids)) {
      for (const tagId of data.tag_ids) {
        if (dbStore.tags.has(tagId)) {
          dbStore.assetTags.push({ asset_id: assetId, tag_id: tagId })
        }
      }
    }

    // Emit Audit Log
    await AuditService.log({
      actorId: authorId,
      action: 'CREATE_ASSET',
      entityType: 'ASSET',
      entityId: assetId,
      metadata: { name: newAsset.name, type: newAsset.type, status: newAsset.status }
    })

    return this.enrichAsset(newAsset)
  }

  /**
   * Update an Asset (Enforces RLS modification rules).
   */
  public static async updateAsset(
    id: string,
    updates: Partial<Asset>,
    userId: string,
    userRole: UserRole
  ): Promise<Asset> {
    const asset = dbStore.assets.get(id)
    if (!asset) {
      throw new NotFoundError('Asset')
    }

    const isAuthor = asset.author_id === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isAuthor && !isAdmin) {
      throw new AuthorizationError('You are not authorized to update this asset')
    }

    // If author (non-admin), cannot modify published assets or change status to PUBLISHED
    if (!isAdmin) {
      if (asset.status === 'PUBLISHED') {
        throw new AuthorizationError('Authors cannot modify already published assets without administrative review')
      }
      if (updates.status && updates.status === 'PUBLISHED') {
        throw new AuthorizationError('Only Administrators can transition status to PUBLISHED')
      }
      if (updates.is_featured !== undefined) {
        throw new AuthorizationError('Only Administrators can set is_featured flag')
      }
    }

    // License constraint check
    const nextStatus = updates.status || asset.status
    const nextLicense = updates.license_id !== undefined ? updates.license_id : asset.license_id
    if (nextStatus === 'PUBLISHED' && !nextLicense) {
      throw new ValidationError('A published asset must have an assigned license')
    }

    // Apply updates
    const updated: Asset = {
      ...asset,
      ...updates,
      id: asset.id, // Immutable
      author_id: asset.author_id, // Immutable
      updated_at: new Date().toISOString()
    }

    dbStore.assets.set(id, updated)

    // Emit Audit Log
    await AuditService.log({
      actorId: userId,
      action: 'UPDATE_ASSET',
      entityType: 'ASSET',
      entityId: id,
      metadata: { previousStatus: asset.status, newStatus: updated.status, changes: Object.keys(updates) }
    })

    return this.enrichAsset(updated)
  }

  /**
   * Delete an Asset.
   */
  public static async deleteAsset(id: string, userId: string, userRole: UserRole): Promise<boolean> {
    const asset = dbStore.assets.get(id)
    if (!asset) {
      throw new NotFoundError('Asset')
    }

    const isAuthor = asset.author_id === userId
    const isAdmin = userRole === 'ADMIN'

    // Authors can only delete their own DRAFT assets
    if (!isAdmin && (!isAuthor || asset.status !== 'DRAFT')) {
      throw new AuthorizationError('Authors can only delete their own assets while in DRAFT status')
    }

    dbStore.assets.delete(id)
    // Remove tags
    dbStore.assetTags = dbStore.assetTags.filter(at => at.asset_id !== id)

    // Emit Audit Log
    await AuditService.log({
      actorId: userId,
      action: 'DELETE_ASSET',
      entityType: 'ASSET',
      entityId: id,
      metadata: { name: asset.name, status: asset.status }
    })

    return true
  }

  /**
   * Attach File to Asset.
   */
  public static async attachFile(
    fileData: Omit<AssetFile, 'id' | 'created_at'>,
    userId: string,
    userRole: UserRole
  ): Promise<AssetFile> {
    const asset = dbStore.assets.get(fileData.asset_id)
    if (!asset) {
      throw new NotFoundError('Asset')
    }

    const isAuthor = asset.author_id === userId
    const isAdmin = userRole === 'ADMIN'

    if (!isAuthor && !isAdmin) {
      throw new AuthorizationError('You do not have permission to attach files to this asset')
    }

    const fileId = `f${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newFile: AssetFile = {
      ...fileData,
      id: fileId,
      created_at: new Date().toISOString()
    }

    dbStore.assetFiles.set(fileId, newFile)

    await AuditService.log({
      actorId: userId,
      action: 'ATTACH_FILE',
      entityType: 'ASSET_FILE',
      entityId: fileId,
      metadata: { assetId: asset.id, format: newFile.format, size: newFile.file_size }
    })

    return newFile
  }

  private static enrichAsset(asset: Asset): Asset {
    const author = dbStore.profiles.get(asset.author_id)
    const category = asset.category_id ? dbStore.categories.get(asset.category_id) || null : null
    const license = asset.license_id ? dbStore.licenses.get(asset.license_id) || null : null

    // Get asset tags
    const tagIds = dbStore.assetTags.filter(at => at.asset_id === asset.id).map(at => at.tag_id)
    const tags = tagIds.map(tid => dbStore.tags.get(tid)).filter(Boolean) as any[]

    // Get files
    const files = Array.from(dbStore.assetFiles.values()).filter(f => f.asset_id === asset.id)

    return {
      ...asset,
      author,
      category,
      license,
      tags,
      files
    }
  }
}
