import { describe, it, expect } from 'vitest'
import {
  FontAiClassificationSchema,
  FontAiClassificationService,
} from '../../server/services/fontAiClassificationService'

describe('Font AI Multimodal Classification & Zod Schema', () => {
  describe('FontAiClassificationSchema', () => {
    it('validates a complete Arabic calligraphy classification', () => {
      const validArabic = {
        category: 'arabic_calligraphy',
        arabicStyle: 'kufi',
        tags: ['geometric', 'monumental', 'historic', 'kufic'],
        mood: ['traditional', 'authoritative'],
        contrast: 'low',
        intendedUse: ['headline', 'display'],
        descriptionAr: 'خط كوفي هندسي متناسق ملائم للعناوين والشعارات.',
        descriptionEn: 'Geometric Kufic typeface ideal for monumental headlines.',
        confidence: 0.95,
      }

      const result = FontAiClassificationSchema.safeParse(validArabic)
      expect(result.success).toBe(true)
    })

    it('validates a modern Latin sans-serif font classification', () => {
      const validLatin = {
        category: 'sans-serif',
        arabicStyle: null,
        tags: ['minimal', 'ui', 'neutral', 'screen'],
        mood: ['modern', 'accessible'],
        contrast: 'low',
        intendedUse: ['ui', 'body'],
        descriptionAr: 'خط لاتيني بدون ذيل ملائم للشاشات وواجهات المستخدم.',
        descriptionEn: 'Clean modernist sans-serif engineered for UI displays.',
        confidence: 0.98,
      }

      const result = FontAiClassificationSchema.safeParse(validLatin)
      expect(result.success).toBe(true)
    })

    it('rejects an unsupported category', () => {
      const invalidCategory = {
        category: 'retro-pixel-art', // Not in enum
        arabicStyle: null,
        tags: ['pixel'],
        mood: ['nostalgic'],
        contrast: 'high',
        intendedUse: ['display'],
        confidence: 0.8,
      }

      const result = FontAiClassificationSchema.safeParse(invalidCategory)
      expect(result.success).toBe(false)
    })

    it('rejects an invalid Arabic style', () => {
      const invalidStyle = {
        category: 'arabic_calligraphy',
        arabicStyle: 'futuristic-cyber-arabic', // Not in approved taxonomy
        tags: ['cyber'],
        mood: ['edgy'],
        contrast: 'medium',
        intendedUse: ['display'],
        confidence: 0.7,
      }

      const result = FontAiClassificationSchema.safeParse(invalidStyle)
      expect(result.success).toBe(false)
    })
  })

  describe('FontAiClassificationService Heuristic Classifier', () => {
    it('correctly classifies Cairo as Kufi / Arabic Modern', () => {
      const cairoResult = FontAiClassificationService.fallbackHeuristicClassification({
        familyName: 'Cairo',
        subfamilyName: 'Bold',
        metadata: {
          familyName: 'Cairo',
          subfamilyName: 'Bold',
          fullName: 'Cairo Bold',
          postscriptName: 'Cairo-Bold',
          weight: 700,
          weightName: 'Bold',
          style: 'normal',
          isItalic: false,
          isVariable: false,
          format: 'ttf',
          supportedScripts: ['Arabic', 'Latin'],
          supportedLanguages: ['arabic', 'latin'],
          isArabic: true,
          isLatin: true,
          numGlyphs: 654,
        },
      })

      expect(cairoResult.category).toBe('arabic_modern')
      expect(cairoResult.intendedUse).toContain('ui')
      expect(cairoResult.confidence).toBeGreaterThan(0.7)
    })

    it('correctly classifies Amiri as Naskh / Classical Calligraphy', () => {
      const amiriResult = FontAiClassificationService.fallbackHeuristicClassification({
        familyName: 'Amiri',
        subfamilyName: 'Regular',
        metadata: {
          familyName: 'Amiri',
          subfamilyName: 'Regular',
          fullName: 'Amiri Regular',
          postscriptName: 'Amiri-Regular',
          weight: 400,
          weightName: 'Regular',
          style: 'normal',
          isItalic: false,
          isVariable: false,
          format: 'ttf',
          supportedScripts: ['Arabic', 'Latin'],
          supportedLanguages: ['arabic', 'latin'],
          isArabic: true,
          isLatin: true,
          numGlyphs: 1420,
        },
      })

      expect(amiriResult.category).toBe('arabic_calligraphy')
      expect(amiriResult.arabicStyle).toBe('naskh')
      expect(amiriResult.tags).toContain('quranic')
    })

    it('correctly classifies Inter as Sans-Serif UI', () => {
      const interResult = FontAiClassificationService.fallbackHeuristicClassification({
        familyName: 'Inter',
        subfamilyName: 'Regular',
        metadata: {
          familyName: 'Inter',
          subfamilyName: 'Regular',
          fullName: 'Inter Regular',
          postscriptName: 'Inter-Regular',
          weight: 400,
          weightName: 'Regular',
          style: 'normal',
          isItalic: false,
          isVariable: false,
          format: 'woff2',
          supportedScripts: ['Latin'],
          supportedLanguages: ['latin'],
          isArabic: false,
          isLatin: true,
          numGlyphs: 2450,
        },
      })

      expect(interResult.category).toBe('sans-serif')
      expect(interResult.arabicStyle).toBeNull()
      expect(interResult.intendedUse).toContain('ui')
    })
  })
})
