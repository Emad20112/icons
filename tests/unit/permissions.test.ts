import { describe, it, expect } from 'vitest'
import { AssetService } from '../../server/services/assetService'
import { AuthService } from '../../server/services/authService'
import { dbStore } from '../../server/utils/mockStore'
import { AuthorizationError } from '../../lib/errors/AppError'

describe('Row Level Security & Permissions Boundaries', () => {
  const adminId = 'a0000000-0000-0000-0000-000000000001'
  const user1Id = 'u0000000-0000-0000-0000-000000000001'
  const user2Id = 'u0000000-0000-0000-0000-000000000002'

  it('RLS: Anonymous visitor only receives PUBLISHED assets', async () => {
    const result = await AssetService.listAssets({}, null, null)
    expect(result.assets.length).toBeGreaterThan(0)
    for (const a of result.assets) {
      expect(a.status).toBe('PUBLISHED')
    }
  })

  it('RLS: Author receives both PUBLISHED assets and their own DRAFT assets', async () => {
    // Create a draft for user1
    const draft = await AssetService.createAsset(
      { name: 'User 1 Private Draft', type: 'ICON', status: 'DRAFT' },
      user1Id,
      'USER'
    )

    const user1List = await AssetService.listAssets({}, user1Id, 'USER')
    const hasOwnDraft = user1List.assets.some(a => a.id === draft.id)
    expect(hasOwnDraft).toBe(true)

    // User 2 must NOT see user1 draft under RLS
    const user2List = await AssetService.listAssets({}, user2Id, 'USER')
    const user2SeesDraft = user2List.assets.some(a => a.id === draft.id)
    expect(user2SeesDraft).toBe(false)
  })

  it('RLS: Regular user cannot modify an asset owned by another user', async () => {
    const user1Asset = await AssetService.createAsset(
      { name: 'User 1 Shield', type: 'ICON', status: 'DRAFT' },
      user1Id,
      'USER'
    )

    await expect(
      AssetService.updateAsset(user1Asset.id, { name: 'Tampered Name' }, user2Id, 'USER')
    ).rejects.toThrow(AuthorizationError)
  })

  it('RLS: Regular user cannot delete another user asset', async () => {
    const user1Asset = await AssetService.createAsset(
      { name: 'User 1 Widget', type: 'ICON', status: 'DRAFT' },
      user1Id,
      'USER'
    )

    await expect(
      AssetService.deleteAsset(user1Asset.id, user2Id, 'USER')
    ).rejects.toThrow(AuthorizationError)
  })

  it('Admin: Admin can manage and update any asset', async () => {
    const user1Asset = await AssetService.createAsset(
      { name: 'User 1 Asset To Moderate', type: 'ICON', status: 'DRAFT' },
      user1Id,
      'USER'
    )

    const updated = await AssetService.updateAsset(
      user1Asset.id,
      { is_featured: true },
      adminId,
      'ADMIN'
    )

    expect(updated.is_featured).toBe(true)
  })

  it('Role Protection: User cannot elevate their own role to ADMIN', async () => {
    await expect(
      AuthService.updateProfile(user1Id, { role: 'ADMIN' }, user1Id, 'USER')
    ).rejects.toThrow(AuthorizationError)
  })
})
