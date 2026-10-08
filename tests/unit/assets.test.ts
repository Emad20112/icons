import { describe, it, expect, beforeEach } from 'vitest'
import { AssetService } from '../../server/services/assetService'
import { dbStore } from '../../server/utils/mockStore'
import { ValidationError, AuthorizationError } from '../../lib/errors/AppError'

describe('Asset Service & Business Rules', () => {
  const adminId = 'a0000000-0000-0000-0000-000000000001'
  const regularUserId = 'u0000000-0000-0000-0000-000000000001'
  const licenseId = 'l1000000-0000-0000-0000-000000000001'

  it('allows author to create DRAFT asset without a license', async () => {
    const asset = await AssetService.createAsset(
      {
        name: 'New Draft Icon',
        type: 'ICON',
        status: 'DRAFT',
      },
      regularUserId,
      'USER'
    )

    expect(asset).toBeDefined()
    expect(asset.id).toBeDefined()
    expect(asset.status).toBe('DRAFT')
    expect(asset.author_id).toBe(regularUserId)
    expect(asset.slug).toContain('new-draft-icon')
  })

  it('enforces automatic unique slug generation on collision', async () => {
    const asset1 = await AssetService.createAsset(
      { name: 'Duplicated Name', type: 'ICON' },
      regularUserId,
      'USER'
    )
    const asset2 = await AssetService.createAsset(
      { name: 'Duplicated Name', type: 'ICON' },
      regularUserId,
      'USER'
    )

    expect(asset1.slug).toBe('duplicated-name')
    expect(asset2.slug).toBe('duplicated-name-1')
  })

  it('blocks regular user from creating an asset directly in PUBLISHED status (Admin Protection)', async () => {
    await expect(
      AssetService.createAsset(
        {
          name: 'Unauthorized Published Asset',
          type: 'ICON',
          status: 'PUBLISHED',
          license_id: licenseId
        },
        regularUserId,
        'USER'
      )
    ).rejects.toThrow(AuthorizationError)
  })

  it('blocks publishing an asset without an assigned license', async () => {
    await expect(
      AssetService.createAsset(
        {
          name: 'Unlicensed Published Asset',
          type: 'ICON',
          status: 'PUBLISHED',
          license_id: null // Missing license!
        },
        adminId,
        'ADMIN'
      )
    ).rejects.toThrow(ValidationError)
  })

  it('allows ADMIN to publish an asset when valid license is assigned', async () => {
    const asset = await AssetService.createAsset(
      {
        name: 'Official Platform Icon',
        type: 'ICON',
        status: 'PUBLISHED',
        license_id: licenseId
      },
      adminId,
      'ADMIN'
    )

    expect(asset.status).toBe('PUBLISHED')
    expect(asset.license_id).toBe(licenseId)
  })
})
