import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { slugify } from '../../lib/sanitizer/filenameSanitizer'
import { ValidationError, AuthorizationError, NotFoundError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Repository, RepositoryItem, RepositoryVisibility } from '../../types/repositories'
import type { Asset, UserRole } from '../../types/database'
import type { FontFamily } from '../../types/fonts'

export interface CreateRepositoryDTO {
  name: string
  slug?: string
  description?: string
  visibility?: RepositoryVisibility
}

export interface UpdateRepositoryDTO {
  name?: string
  slug?: string
  description?: string
  visibility?: RepositoryVisibility
}

export class RepositoryService {
  public static async listRepositories(
    currentUserId: string | null,
    currentUserRole: UserRole | null,
    options?: { ownerId?: string; search?: string }
  ): Promise<Repository[]> {
    let list = dbStore.filterRepositoriesByRLS(currentUserId, currentUserRole)

    if (options?.ownerId) {
      list = list.filter(r => r.owner_id === options.ownerId)
    }

    if (options?.search?.trim()) {
      const q = options.search.trim().toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      )
    }

    // Enrich with owner and counts
    return list.map(repo => this.enrichRepository(repo))
  }

  public static async getRepositoryById(
    id: string,
    currentUserId: string | null,
    currentUserRole: UserRole | null
  ): Promise<Repository> {
    const repo = dbStore.repositories.get(id)
    if (!repo) {
      throw new NotFoundError('Repository not found')
    }

    // Privacy Isolation check
    const isOwner = currentUserId && repo.owner_id === currentUserId
    const isAdmin = currentUserRole === 'ADMIN'

    if (repo.visibility === 'PRIVATE' && !isOwner && !isAdmin) {
      throw new AuthorizationError('This repository is private. Access denied.')
    }

    return this.enrichRepositoryWithDetails(repo)
  }

  public static async createRepository(
    dto: CreateRepositoryDTO,
    actorId: string,
    actorRole: UserRole
  ): Promise<Repository> {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new ValidationError('Repository name must be at least 2 characters')
    }

    const cleanName = dto.name.trim()
    const baseSlug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(cleanName)

    // Check unique slug per owner
    const existing = Array.from(dbStore.repositories.values()).find(
      r => r.owner_id === actorId && r.slug === baseSlug
    )
    if (existing) {
      throw new ValidationError(`You already have a repository named '${baseSlug}'`)
    }

    const repoId = `r${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date().toISOString()

    const newRepo: Repository = {
      id: repoId,
      owner_id: actorId,
      name: cleanName,
      slug: baseSlug,
      description: dto.description?.trim() || null,
      visibility: dto.visibility || 'PUBLIC',
      created_at: now,
      updated_at: now
    }

    dbStore.repositories.set(repoId, newRepo)

    await AuditService.log({
      actorId,
      action: 'CREATE_REPOSITORY',
      entityType: 'REPOSITORY',
      entityId: repoId,
      metadata: { name: newRepo.name, visibility: newRepo.visibility }
    })

    return this.enrichRepository(newRepo)
  }

  public static async updateRepository(
    id: string,
    dto: UpdateRepositoryDTO,
    actorId: string,
    actorRole: UserRole
  ): Promise<Repository> {
    const repo = dbStore.repositories.get(id)
    if (!repo) {
      throw new NotFoundError('Repository not found')
    }

    const isOwner = repo.owner_id === actorId
    const isAdmin = actorRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError('You do not have permission to edit this repository')
    }

    let finalSlug = repo.slug
    if (dto.slug && dto.slug.trim() !== repo.slug) {
      const candidateSlug = slugify(dto.slug.trim())
      const conflict = Array.from(dbStore.repositories.values()).find(
        r => r.owner_id === repo.owner_id && r.slug === candidateSlug && r.id !== id
      )
      if (conflict) {
        throw new ValidationError(`Repository slug '${candidateSlug}' is already in use`)
      }
      finalSlug = candidateSlug
    }

    const updated: Repository = {
      ...repo,
      name: dto.name?.trim() || repo.name,
      slug: finalSlug,
      description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : repo.description,
      visibility: dto.visibility || repo.visibility,
      updated_at: new Date().toISOString()
    }

    dbStore.repositories.set(id, updated)

    await AuditService.log({
      actorId,
      action: 'UPDATE_REPOSITORY',
      entityType: 'REPOSITORY',
      entityId: id,
      metadata: { changes: Object.keys(dto) }
    })

    return this.enrichRepository(updated)
  }

  public static async deleteRepository(
    id: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<boolean> {
    const repo = dbStore.repositories.get(id)
    if (!repo) {
      throw new NotFoundError('Repository not found')
    }

    const isOwner = repo.owner_id === actorId
    const isAdmin = actorRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError('You do not have permission to delete this repository')
    }

    // Cascade delete repository items
    const itemsToDelete = Array.from(dbStore.repositoryItems.entries())
      .filter(([_, item]) => item.repository_id === id)
      .map(([key]) => key)

    for (const key of itemsToDelete) {
      dbStore.repositoryItems.delete(key)
    }

    dbStore.repositories.delete(id)

    await AuditService.log({
      actorId,
      action: 'DELETE_REPOSITORY',
      entityType: 'REPOSITORY',
      entityId: id,
      metadata: { name: repo.name }
    })

    return true
  }

  public static async addItemToRepository(
    repositoryId: string,
    itemType: 'ASSET' | 'FONT',
    itemId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<RepositoryItem> {
    const repo = dbStore.repositories.get(repositoryId)
    if (!repo) {
      throw new NotFoundError('Repository not found')
    }

    const isOwner = repo.owner_id === actorId
    const isAdmin = actorRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError('You do not have permission to add items to this repository')
    }

    // Verify item exists
    if (itemType === 'ASSET' && !dbStore.assets.has(itemId)) {
      throw new NotFoundError('Target asset not found')
    }
    if (itemType === 'FONT' && !dbStore.fontFamilies.has(itemId)) {
      throw new NotFoundError('Target font not found')
    }

    // Check duplicate
    const existing = Array.from(dbStore.repositoryItems.values()).find(
      ri => ri.repository_id === repositoryId && ri.item_type === itemType && ri.item_id === itemId
    )
    if (existing) {
      return existing
    }

    const itemIdKey = `ri-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newItem: RepositoryItem = {
      id: itemIdKey,
      repository_id: repositoryId,
      item_type: itemType,
      item_id: itemId,
      created_at: new Date().toISOString()
    }

    dbStore.repositoryItems.set(itemIdKey, newItem)
    return newItem
  }

  public static async removeItemFromRepository(
    repositoryId: string,
    itemType: 'ASSET' | 'FONT',
    itemId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<boolean> {
    const repo = dbStore.repositories.get(repositoryId)
    if (!repo) {
      throw new NotFoundError('Repository not found')
    }

    const isOwner = repo.owner_id === actorId
    const isAdmin = actorRole === 'ADMIN'

    if (!isOwner && !isAdmin) {
      throw new AuthorizationError('You do not have permission to remove items from this repository')
    }

    const match = Array.from(dbStore.repositoryItems.entries()).find(
      ([_, item]) => item.repository_id === repositoryId && item.item_type === itemType && item.item_id === itemId
    )

    if (match) {
      dbStore.repositoryItems.delete(match[0])
      return true
    }

    return false
  }

  private static enrichRepository(repo: Repository): Repository {
    const owner = dbStore.profiles.get(repo.owner_id)
    const items = Array.from(dbStore.repositoryItems.values()).filter(ri => ri.repository_id === repo.id)
    const assetCount = items.filter(i => i.item_type === 'ASSET').length
    const fontCount = items.filter(i => i.item_type === 'FONT').length

    return {
      ...repo,
      owner,
      asset_count: assetCount,
      font_count: fontCount,
      items_count: items.length
    }
  }

  private static enrichRepositoryWithDetails(repo: Repository): Repository {
    const base = this.enrichRepository(repo)
    const items = Array.from(dbStore.repositoryItems.values()).filter(ri => ri.repository_id === repo.id)

    const assetIds = items.filter(i => i.item_type === 'ASSET').map(i => i.item_id)
    const fontIds = items.filter(i => i.item_type === 'FONT').map(i => i.item_id)

    const assets = assetIds.map(id => dbStore.assets.get(id)).filter(Boolean) as Asset[]
    const fonts = fontIds.map(id => dbStore.fontFamilies.get(id)).filter(Boolean) as FontFamily[]

    return {
      ...base,
      assets,
      fonts
    }
  }
}
