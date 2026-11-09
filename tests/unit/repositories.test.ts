import { describe, it, expect, beforeEach } from 'vitest'
import { RepositoryService } from '../../server/services/repositoryService'
import { AuthService } from '../../server/services/authService'
import { dbStore } from '../../server/utils/mockStore'
import { AuthorizationError, ConflictError } from '../../lib/errors/AppError'

describe('Unit Test: Repositories System & Privacy Isolation', () => {
  const adminId = 'a0000000-0000-0000-0000-000000000001'
  const creatorId = 'u0000000-0000-0000-0000-000000000001'
  const strangerId = 'u9999999-9999-9999-9999-999999999999'

  beforeEach(() => {
    // Add stranger user profile if not present
    if (!dbStore.profiles.has(strangerId)) {
      dbStore.profiles.set(strangerId, {
        id: strangerId,
        email: 'stranger@platform.example',
        username: 'stranger',
        display_name: 'Stranger User',
        avatar_url: null,
        role: 'USER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  })

  it('allows owner to create a repository with public or private visibility', async () => {
    const repo = await RepositoryService.createRepository(
      {
        name: 'Private Security Icons',
        description: 'Internal security assets',
        visibility: 'PRIVATE'
      },
      creatorId,
      'USER'
    )

    expect(repo).toBeDefined()
    expect(repo.name).toBe('Private Security Icons')
    expect(repo.visibility).toBe('PRIVATE')
    expect(repo.owner_id).toBe(creatorId)
  })

  it('PRIVACY: stranger CANNOT access a private repository', async () => {
    // Creator creates a private repository
    const privateRepo = await RepositoryService.createRepository(
      {
        name: 'Secret Experiments',
        visibility: 'PRIVATE'
      },
      creatorId,
      'USER'
    )

    // Stranger attempts to fetch the private repository
    await expect(
      RepositoryService.getRepositoryById(privateRepo.id, strangerId, 'USER')
    ).rejects.toThrow(AuthorizationError)
  })

  it('PRIVACY: anonymous guest CANNOT access a private repository', async () => {
    const privateRepo = await RepositoryService.createRepository(
      {
        name: 'Top Secret Font Stash',
        visibility: 'PRIVATE'
      },
      creatorId,
      'USER'
    )

    await expect(
      RepositoryService.getRepositoryById(privateRepo.id, null, null)
    ).rejects.toThrow(AuthorizationError)
  })

  it('PRIVACY: owner CAN access their own private repository', async () => {
    const privateRepo = await RepositoryService.createRepository(
      {
        name: 'My Personal Vault',
        visibility: 'PRIVATE'
      },
      creatorId,
      'USER'
    )

    const fetched = await RepositoryService.getRepositoryById(privateRepo.id, creatorId, 'USER')
    expect(fetched.id).toBe(privateRepo.id)
    expect(fetched.visibility).toBe('PRIVATE')
  })

  it('ADMIN: administrator can access any private repository for governance', async () => {
    const privateRepo = await RepositoryService.createRepository(
      {
        name: 'Governed Vault',
        visibility: 'PRIVATE'
      },
      creatorId,
      'USER'
    )

    const fetched = await RepositoryService.getRepositoryById(privateRepo.id, adminId, 'ADMIN')
    expect(fetched.id).toBe(privateRepo.id)
  })

  it('allows adding and removing items in repository', async () => {
    const repo = await RepositoryService.createRepository(
      {
        name: 'Mixed Pack',
        visibility: 'PUBLIC'
      },
      creatorId,
      'USER'
    )

    // Add shopping cart icon
    const item = await RepositoryService.addItemToRepository(
      repo.id,
      'ASSET',
      'a2000000-0000-0000-0000-000000000001',
      creatorId,
      'USER'
    )
    expect(item).toBeDefined()
    expect(item.item_type).toBe('ASSET')

    // Fetch repository and check enriched items
    const details = await RepositoryService.getRepositoryById(repo.id, null, null)
    expect(details.assets?.length).toBeGreaterThanOrEqual(1)

    // Remove item
    const removed = await RepositoryService.removeItemFromRepository(
      repo.id,
      'ASSET',
      'a2000000-0000-0000-0000-000000000001',
      creatorId,
      'USER'
    )
    expect(removed).toBe(true)
  })
})
