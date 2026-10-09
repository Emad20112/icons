import { describe, it, expect } from 'vitest'
import {
  AssetCreateSchema,
  CategoryCreateSchema,
  LicenseCreateSchema,
  FileUploadSchema
} from '../../lib/validation/schemas'

describe('Domain Validation Schemas', () => {
  describe('AssetCreateSchema', () => {
    it('allows valid DRAFT asset without license', () => {
      const validDraft = {
        name: 'Brand Shield Icon',
        type: 'ICON',
        status: 'DRAFT',
        description: 'A vector shield icon',
      }
      const result = AssetCreateSchema.safeParse(validDraft)
      expect(result.success).toBe(true)
    })

    it('rejects PUBLISHED asset without a license (Mandatory License Rule)', () => {
      const invalidPublished = {
        name: 'Brand Shield Icon',
        type: 'ICON',
        status: 'PUBLISHED',
        license_id: null, // No license!
      }
      const result = AssetCreateSchema.safeParse(invalidPublished)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Published assets must be assigned a valid license')
      }
    })

    it('accepts PUBLISHED asset with valid license UUID', () => {
      const validPublished = {
        name: 'Brand Shield Icon',
        type: 'ICON',
        status: 'PUBLISHED',
        license_id: '11111111-1111-1111-1111-111111111111',
      }
      const result = AssetCreateSchema.safeParse(validPublished)
      expect(result.success).toBe(true)
    })

    it('rejects asset with name shorter than 2 characters', () => {
      const result = AssetCreateSchema.safeParse({ name: 'A' })
      expect(result.success).toBe(false)
    })

    it('accepts all polymorphic asset types (ICON, FONT, ILLUSTRATION, LOGO, TEMPLATE)', () => {
      const types = ['ICON', 'FONT', 'ILLUSTRATION', 'LOGO', 'TEMPLATE'] as const
      for (const type of types) {
        const result = AssetCreateSchema.safeParse({ name: 'Test Asset', type })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('CategoryCreateSchema', () => {
    it('validates correct category payload', () => {
      const result = CategoryCreateSchema.safeParse({
        name: 'Artificial Intelligence',
        description: 'AI model assets'
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid slug with spaces or uppercase', () => {
      const result = CategoryCreateSchema.safeParse({
        name: 'AI',
        slug: 'AI Models'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('LicenseCreateSchema', () => {
    it('validates legal license parameters', () => {
      const result = LicenseCreateSchema.safeParse({
        name: 'Apache 2.0',
        url: 'https://opensource.org/licenses/Apache-2.0',
        commercial_use: true,
        redistribution: true,
        modification: true,
        attribution_required: true
      })
      expect(result.success).toBe(true)
    })
  })

  describe('FileUploadSchema', () => {
    it('rejects file larger than 50MB', () => {
      const result = FileUploadSchema.safeParse({
        asset_id: '11111111-1111-1111-1111-111111111111',
        format: 'SVG',
        file_name: 'test.svg',
        file_size: 60 * 1024 * 1024, // 60MB
        mime_type: 'image/svg+xml',
        content: '<svg></svg>'
      })
      expect(result.success).toBe(false)
    })
  })
})
