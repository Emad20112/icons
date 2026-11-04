import { describe, it, expect } from 'vitest'
import { FontMetadataService } from '../../server/services/fontMetadataService'
import { FontFamilyGrouper } from '../../server/services/fontFamilyGrouper'

describe('Font Metadata & Family Grouping Engine', () => {
  describe('FontMetadataService.inferArabicStyle', () => {
    it('detects Kufi styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Cairo Kufi Bold')).toBe('kufi')
      expect(FontMetadataService.inferArabicStyle('Al-Kufi Square')).toBe('kufi')
    })

    it('detects Naskh styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Amiri Quran Naskh')).toBe('naskh')
      expect(FontMetadataService.inferArabicStyle('Uthman Taha Naskh Regular')).toBe('naskh')
    })

    it('detects Ruqah styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Aref Ruqaa Regular')).toBe('ruqah')
      expect(FontMetadataService.inferArabicStyle('Ruka Handwriting')).toBe('ruqah')
    })

    it('detects Thuluth styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Thuluth Titling Gold')).toBe('thuluth')
    })

    it('detects Diwani styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Farisi Diwani Flow')).toBe('diwani')
    })

    it('detects Nastaliq styles accurately', () => {
      expect(FontMetadataService.inferArabicStyle('Iran Nastaliq Jali')).toBe('nastaliq')
    })

    it('defaults to modern for contemporary digital fonts', () => {
      expect(FontMetadataService.inferArabicStyle('Tajawal Screen')).toBe('modern')
    })
  })

  describe('FontMetadataService.parseWeightFromSubfamily', () => {
    it('maps standard weight names to numeric values', () => {
      expect(FontMetadataService.parseWeightFromSubfamily('Thin')).toBe(100)
      expect(FontMetadataService.parseWeightFromSubfamily('ExtraLight')).toBe(200)
      expect(FontMetadataService.parseWeightFromSubfamily('Light')).toBe(300)
      expect(FontMetadataService.parseWeightFromSubfamily('Regular')).toBe(400)
      expect(FontMetadataService.parseWeightFromSubfamily('Medium')).toBe(500)
      expect(FontMetadataService.parseWeightFromSubfamily('SemiBold')).toBe(600)
      expect(FontMetadataService.parseWeightFromSubfamily('Bold')).toBe(700)
      expect(FontMetadataService.parseWeightFromSubfamily('ExtraBold')).toBe(800)
      expect(FontMetadataService.parseWeightFromSubfamily('Black')).toBe(900)
      expect(FontMetadataService.parseWeightFromSubfamily('Heavy')).toBe(900)
    })

    it('handles compound subfamilies like Bold Italic', () => {
      expect(FontMetadataService.parseWeightFromSubfamily('Bold Italic')).toBe(700)
      expect(FontMetadataService.parseWeightFromSubfamily('Light Oblique')).toBe(300)
    })
  })

  describe('FontFamilyGrouper', () => {
    it('normalizes family names by stripping redundant weight suffixes', () => {
      expect(FontFamilyGrouper.normalizeFamilyName('Cairo-Bold')).toBe('Cairo')
      expect(FontFamilyGrouper.normalizeFamilyName('Amiri Regular')).toBe('Amiri')
      expect(FontFamilyGrouper.normalizeFamilyName('Inter ExtraLight Italic')).toBe('Inter')
    })

    it('generates URL-safe slugs for Arabic and Latin families', () => {
      expect(FontFamilyGrouper.slugify('Cairo')).toBe('cairo')
      expect(FontFamilyGrouper.slugify('Amiri Quran')).toBe('amiri-quran')
      expect(FontFamilyGrouper.slugify('خط النسخ الرقمي')).toBe('خط-النسخ-الرقمي')
    })

    it('groups multiple weight files into a single family structure', () => {
      const mockItems: any[] = [
        {
          fileId: 'file-1',
          originalFileName: 'Cairo-Regular.ttf',
          storagePath: 'fonts/cairo/Cairo-Regular.ttf',
          fileSize: 1000,
          format: 'ttf',
          sha256: 'hash-1',
          metadata: {
            familyName: 'Cairo',
            subfamilyName: 'Regular',
            weight: 400,
            weightName: 'Regular',
            style: 'normal',
            isArabic: true,
            isLatin: true,
            supportedScripts: ['Arabic', 'Latin'],
            supportedLanguages: ['arabic', 'latin'],
            license: 'OFL',
          },
        },
        {
          fileId: 'file-2',
          originalFileName: 'Cairo-Bold.ttf',
          storagePath: 'fonts/cairo/Cairo-Bold.ttf',
          fileSize: 1100,
          format: 'ttf',
          sha256: 'hash-2',
          metadata: {
            familyName: 'Cairo',
            subfamilyName: 'Bold',
            weight: 700,
            weightName: 'Bold',
            style: 'normal',
            isArabic: true,
            isLatin: true,
            supportedScripts: ['Arabic', 'Latin'],
            supportedLanguages: ['arabic', 'latin'],
            license: 'OFL',
          },
        },
      ]

      const grouped = FontFamilyGrouper.groupFonts(mockItems)
      expect(grouped).toHaveLength(1)
      expect(grouped[0].name).toBe('Cairo')
      expect(grouped[0].slug).toBe('cairo')
      expect(grouped[0].weights).toEqual([400, 700])
      expect(grouped[0].filesCount).toBe(2)
      expect(grouped[0].isArabic).toBe(true)
    })
  })
})
