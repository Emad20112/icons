import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { slugify } from '../../lib/sanitizer/filenameSanitizer'
import { ValidationError, AuthorizationError, NotFoundError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Asset, AssetFile, AssetStatus, AssetType, UserRole } from '../../types/database'

export type SortOption = 'relevance' | 'newest' | 'downloads' | 'name_asc' | 'name_desc'

export interface ListAssetsFilter {
  type?: AssetType
  categorySlug?: string
  licenseSlug?: string
  tagSlugs?: string[] | string
  search?: string
  status?: AssetStatus
  isFeatured?: boolean
  sort?: SortOption
  page?: number
  limit?: number
  offset?: number
}

export interface ListAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  limit: number
  totalPages: number
  query?: string
}

export class AssetService {
  /**
   * List and search assets respecting Row Level Security (RLS) rules,
   * weighted relevance scoring, multi-faceted filtering, and sorting.
   */
  public static async listAssets(
    filter: ListAssetsFilter,
    currentUserId: string | null,
    currentUserRole: UserRole | null
  ): Promise<ListAssetsResponse> {
    const page = Math.max(1, Number(filter.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 24))
    const offset = filter.offset !== undefined ? Number(filter.offset) : (page - 1) * limit
    const sort = filter.sort || (filter.search?.trim() ? 'relevance' : 'newest')

    // 1. Try Remote Supabase if available and tables are ready
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        let query = admin
          .from('assets')
          .select(`
            *,
            author:profiles(*),
            category:categories(*),
            license:licenses(*),
            files:asset_files(*),
            asset_tags(tag:tags(*))
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

        if (filter.search?.trim()) {
          const cleanQ = filter.search.trim()
          query = query.or(`name.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%,slug.ilike.%${cleanQ}%`)
        }

        // Apply sorting
        if (sort === 'downloads') {
          query = query.order('download_count', { ascending: false })
        } else if (sort === 'name_asc') {
          query = query.order('name', { ascending: true })
        } else if (sort === 'name_desc') {
          query = query.order('name', { ascending: false })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        query = query.range(offset, offset + limit - 1)

        const { data, count, error } = await query
        if (!error && data) {
          const totalCount = count || data.length
          return {
            assets: data as Asset[],
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            query: filter.search
          }
        }
      } catch {
        // Fall through to resilient in-memory search engine
      }
    }

    // 2. In-Memory Search & Discovery Engine
    let items = dbStore.filterAssetsByRLS(currentUserId, currentUserRole)

    // Type Filter
    if (filter.type) {
      items = items.filter(a => a.type === filter.type)
    }

    // Status Filter (Admins or own assets only)
    if (filter.status) {
      if (currentUserRole === 'ADMIN' || filter.status === 'PUBLISHED') {
        items = items.filter(a => a.status === filter.status)
      } else if (currentUserId) {
        items = items.filter(a => a.status === filter.status && a.author_id === currentUserId)
      }
    }

    // Featured Filter
    if (filter.isFeatured !== undefined) {
      items = items.filter(a => a.is_featured === filter.isFeatured)
    }

    // Category Filter
    if (filter.categorySlug) {
      const cat = Array.from(dbStore.categories.values()).find(c => c.slug === filter.categorySlug)
      if (cat) {
        items = items.filter(a => a.category_id === cat.id)
      } else {
        items = []
      }
    }

    // License Filter
    if (filter.licenseSlug) {
      const targetSlug = filter.licenseSlug.toLowerCase()
      const lic = Array.from(dbStore.licenses.values()).find(
        l => l.slug.toLowerCase() === targetSlug || l.slug.toLowerCase().startsWith(targetSlug)
      )
      if (lic) {
        items = items.filter(a => a.license_id === lic.id)
      } else {
        items = []
      }
    }

    // Tag Filter (Supports multiple comma-separated or array of tags)
    const tagSlugsList = filter.tagSlugs
      ? (Array.isArray(filter.tagSlugs) ? filter.tagSlugs : filter.tagSlugs.split(','))
          .map(s => s.trim().toLowerCase())
          .filter(Boolean)
      : []

    if (tagSlugsList.length > 0) {
      const matchingTagIds = Array.from(dbStore.tags.values())
        .filter(t => tagSlugsList.includes(t.slug.toLowerCase()))
        .map(t => t.id)

      if (matchingTagIds.length > 0) {
        items = items.filter(asset => {
          const assetTagIds = dbStore.assetTags
            .filter(at => at.asset_id === asset.id)
            .map(at => at.tag_id)
          // Match if asset contains ANY of the filtered tags
          return matchingTagIds.some(tid => assetTagIds.includes(tid))
        })
      } else {
        items = []
      }
    }

    // Text Search & Relevance Scoring Pipeline
    const scores = new Map<string, number>()
    const rawSearch = filter.search?.trim()

    if (rawSearch) {
      const q = rawSearch.toLowerCase()
      const tokens = q.split(/\s+/).filter(t => t.length > 0)

      items = items.filter(asset => {
        let score = 0
        const nameLower = asset.name.toLowerCase()
        const descLower = (asset.description || '').toLowerCase()
        const slugLower = asset.slug.toLowerCase()

        // Get category info
        const category = asset.category_id ? dbStore.categories.get(asset.category_id) : null
        const catNameLower = category ? category.name.toLowerCase() : ''
        const catSlugLower = category ? category.slug.toLowerCase() : ''

        // Get tags info
        const assetTagIds = dbStore.assetTags.filter(at => at.asset_id === asset.id).map(at => at.tag_id)
        const tags = assetTagIds.map(tid => dbStore.tags.get(tid)).filter(Boolean) as any[]
        const tagStrings = tags.map(t => `${t.name} ${t.slug}`.toLowerCase())

        // Get metadata aliases and keywords
        const metadataAliases = Array.isArray(asset.metadata?.aliases)
          ? asset.metadata.aliases.map((a: string) => String(a).toLowerCase())
          : []
        const metadataKeywords = Array.isArray(asset.metadata?.keywords)
          ? asset.metadata.keywords.map((k: string) => String(k).toLowerCase())
          : []

        let phraseScore = 0

        // Exact & Prefix Matches (Highest Priority)
        if (nameLower === q) phraseScore += 200
        else if (nameLower.startsWith(q)) phraseScore += 120
        else if (nameLower.includes(q)) phraseScore += 60

        if (slugLower === q) phraseScore += 150
        else if (slugLower.includes(q)) phraseScore += 50

        // Aliases & Arabic/English keywords match
        for (const alias of metadataAliases) {
          if (alias === q) phraseScore += 160
          else if (alias.includes(q) || q.includes(alias)) phraseScore += 80
        }

        for (const kw of metadataKeywords) {
          if (kw === q) phraseScore += 90
          else if (kw.includes(q) || q.includes(kw)) phraseScore += 50
        }

        // Tags match
        for (const tag of tags) {
          const tName = tag.name.toLowerCase()
          const tSlug = tag.slug.toLowerCase()
          if (tName === q || tSlug === q) phraseScore += 100
          else if (tName.includes(q) || tSlug.includes(q)) phraseScore += 60
        }

        // Category match
        if (catNameLower === q || catSlugLower === q) phraseScore += 70
        else if (catNameLower.includes(q) || catSlugLower.includes(q)) phraseScore += 35

        // Description match
        if (descLower.includes(q)) phraseScore += 25

        let tokenScore = 0
        let tokenMatches = 0

        // Multi-token matches
        if (tokens.length > 1) {
          for (const token of tokens) {
            let matchedToken = false
            if (nameLower.includes(token)) {
              tokenScore += 35
              matchedToken = true
            }
            if (metadataAliases.some(a => a.includes(token))) {
              tokenScore += 30
              matchedToken = true
            }
            if (metadataKeywords.some(k => k.includes(token))) {
              tokenScore += 20
              matchedToken = true
            }
            if (tagStrings.some(t => t.includes(token))) {
              tokenScore += 25
              matchedToken = true
            }
            if (catNameLower.includes(token) || catSlugLower.includes(token)) {
              tokenScore += 15
              matchedToken = true
            }
            if (descLower.includes(token)) {
              tokenScore += 10
              matchedToken = true
            }
            if (matchedToken) tokenMatches++
          }

          // Full tokens coverage bonus
          if (tokenMatches === tokens.length) {
            tokenScore += 50
          }
        }

        // Determine if this is a genuine match:
        // Single token queries require phraseScore > 0.
        // Multi-token queries require phraseScore > 0 OR meeting token coverage threshold.
        const requiredTokenMatches = tokens.length <= 2 ? tokens.length : tokens.length - 1
        const isMultiTokenMatch = tokens.length > 1 && tokenMatches >= requiredTokenMatches

        if (phraseScore > 0 || isMultiTokenMatch) {
          let totalScore = phraseScore + tokenScore
          if (asset.is_featured) totalScore += 5
          totalScore += Math.min(10, Math.floor((asset.download_count || 0) / 200))
          scores.set(asset.id, totalScore)
          return true
        }

        return false
      })
    }

    // Apply Sorting
    items.sort((a, b) => {
      if (sort === 'relevance' && rawSearch) {
        const scoreA = scores.get(a.id) || 0
        const scoreB = scores.get(b.id) || 0
        if (scoreB !== scoreA) return scoreB - scoreA
      } else if (sort === 'downloads') {
        const diff = (b.download_count || 0) - (a.download_count || 0)
        if (diff !== 0) return diff
      } else if (sort === 'name_asc') {
        return a.name.localeCompare(b.name)
      } else if (sort === 'name_desc') {
        return b.name.localeCompare(a.name)
      }

      // Default: newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const total = items.length
    const paged = items.slice(offset, offset + limit)
    const enriched = paged.map(asset => this.enrichAsset(asset))

    return {
      assets: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query: rawSearch
    }
  }

  /**
   * Get related/similar icons for discovery on the asset details page.
   * Computes semantic similarity based on shared tags, category, and keywords,
   * strictly excluding the current asset itself.
   */
  public static async getRelatedAssets(
    assetId: string,
    limit = 8,
    currentUserId: string | null = null,
    currentUserRole: UserRole | null = null
  ): Promise<Asset[]> {
    const target = dbStore.assets.get(assetId)
    if (!target) {
      return []
    }

    // Get target tags
    const targetTagIds = new Set(
      dbStore.assetTags.filter(at => at.asset_id === target.id).map(at => at.tag_id)
    )

    // Candidates must be visible under RLS and cannot be the target asset
    const pool = dbStore.filterAssetsByRLS(currentUserId, currentUserRole)
      .filter(a => a.id !== target.id && a.type === target.type)

    const scoredCandidates = pool.map(candidate => {
      let similarityScore = 0

      // 1. Same category bonus
      if (candidate.category_id && candidate.category_id === target.category_id) {
        similarityScore += 40
      }

      // 2. Shared tags bonus (highest weighting)
      const candTagIds = dbStore.assetTags
        .filter(at => at.asset_id === candidate.id)
        .map(at => at.tag_id)

      for (const tid of candTagIds) {
        if (targetTagIds.has(tid)) {
          similarityScore += 35
        }
      }

      // 3. Name or keywords overlap
      const targetWords = `${target.name} ${target.slug}`.toLowerCase().split(/[\s-]+/)
      const candWords = `${candidate.name} ${candidate.slug}`.toLowerCase().split(/[\s-]+/)

      for (const tw of targetWords) {
        if (tw.length > 2 && candWords.includes(tw)) {
          similarityScore += 20
        }
      }

      return { candidate, similarityScore }
    })

    scoredCandidates.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore
      }
      return (b.candidate.download_count || 0) - (a.candidate.download_count || 0)
    })

    return scoredCandidates.slice(0, limit).map(sc => this.enrichAsset(sc.candidate))
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
