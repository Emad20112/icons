import { describe, it, expect } from 'vitest'
import { FontPreviewService } from '../../server/services/fontPreviewService'
import { FontLicensingService } from '../../server/services/fontLicensingService'
import { FontDownloadService } from '../../server/services/fontDownloadService'
import { dbStore } from '../../server/utils/mockStore'

describe('Font Services: Preview, Licensing, Downloads & RLS', () => {
  describe('FontPreviewService.generateSpecimenSvg', () => {
    it('renders a valid standalone SVG specimen card', () => {
      const svg = FontPreviewService.generateSpecimenSvg({
        familyName: 'Cairo',
        subfamilyName: 'Bold',
        weight: 700,
        isArabic: true,
        isLatin: true,
        category: 'sans-serif',
        arabicStyle: 'kufi',
        designer: 'Mohamed Gaber',
      })

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('Cairo')
      expect(svg).toContain('القاهرة عاصمة التاريخ والحضارة')
      expect(svg).toContain('Mohamed Gaber')
      expect(svg).toContain('w:700')
    })
  })

  describe('FontLicensingService', () => {
    it('classifies OFL, MIT, and Apache as PERMISSIVE and distributable', () => {
      const ofl = FontLicensingService.inspectLicense('OFL')
      expect(ofl.category).toBe('PERMISSIVE')
      expect(ofl.isDistributable).toBe(true)
      expect(ofl.isCommercialAllowed).toBe(true)

      const mit = FontLicensingService.inspectLicense('MIT')
      expect(mit.category).toBe('PERMISSIVE')
      expect(mit.isDistributable).toBe(true)

      const apache = FontLicensingService.inspectLicense('Apache-2.0')
      expect(apache.category).toBe('PERMISSIVE')
      expect(apache.isDistributable).toBe(true)
    })

    it('classifies Commercial licenses as RESTRICTED and blocks public publication without override', () => {
      const commercial = FontLicensingService.inspectLicense('Commercial Proprietary')
      expect(commercial.category).toBe('RESTRICTED')
      expect(commercial.isDistributable).toBe(false)
      expect(commercial.warning).toBeDefined()

      const pubCheck = FontLicensingService.validatePublicationEligibility('Commercial Proprietary', false)
      expect(pubCheck.allowed).toBe(false)
      expect(pubCheck.reason).toContain('Cannot publish font family')

      const adminOverride = FontLicensingService.validatePublicationEligibility('Commercial Proprietary', true)
      expect(adminOverride.allowed).toBe(true)
    })
  })

  describe('FontDownloadService', () => {
    it('prepares an individual font binary file download', async () => {
      const result = await FontDownloadService.prepareDownload('cairo', 'ff100000-0000-0000-0000-000000000001')
      expect(result.fileName).toBe('Cairo-Regular.ttf')
      expect(result.contentType).toBe('font/ttf')
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.buffer.length).toBeGreaterThan(0)
    })

    it('prepares a full family ZIP archive with README documentation', async () => {
      const result = await FontDownloadService.prepareDownload('cairo')
      expect(result.fileName).toBe('cairo-font-bundle.zip')
      expect(result.contentType).toBe('application/zip')
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.buffer.length).toBeGreaterThan(100)
    })
  })

  describe('Row Level Security (RLS) Query Filtering', () => {
    it('hides pending review font families from unauthenticated / regular users', () => {
      const publicList = dbStore.filterFontFamiliesByRLS(null, null)
      const arefRuqaa = publicList.find(f => f.slug === 'aref-ruqaa')
      expect(arefRuqaa).toBeUndefined() // Unpublished pending review!
    })

    it('allows ADMIN users to see all font families including drafts and pending review', () => {
      const adminList = dbStore.filterFontFamiliesByRLS('u1000000-0000-0000-0000-000000000001', 'ADMIN')
      const arefRuqaa = adminList.find(f => f.slug === 'aref-ruqaa')
      expect(arefRuqaa).toBeDefined()
      expect(arefRuqaa?.publication_status).toBe('PENDING_REVIEW')
    })
  })
})
