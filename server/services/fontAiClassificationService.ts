import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { FontCategory, FontArabicStyle, ExtractedFontMetadata } from '~/types/fonts'
import { FontPreviewService } from './fontPreviewService'

export const FontAiClassificationSchema = z.object({
  category: z.enum([
    'serif',
    'sans-serif',
    'display',
    'handwriting',
    'monospace',
    'arabic_calligraphy',
    'arabic_modern',
  ]),
  arabicStyle: z
    .enum([
      'naskh',
      'kufi',
      'ruqah',
      'thuluth',
      'diwani',
      'nastaliq',
      'modern',
      'maghrebi',
      'square_kufic',
      'hybrid',
    ])
    .nullable()
    .optional(),
  tags: z.array(z.string()).default([]),
  mood: z.array(z.string()).default([]),
  contrast: z.enum(['low', 'medium', 'high']).default('medium'),
  intendedUse: z.array(z.enum(['headline', 'body', 'display', 'calligraphy', 'ui'])).default(['body']),
  descriptionAr: z.string().default(''),
  descriptionEn: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.85),
})

export type FontAiClassificationResult = z.infer<typeof FontAiClassificationSchema>

export interface ClassifyFontInput {
  familyName: string
  subfamilyName?: string
  metadata: ExtractedFontMetadata
  fontDataBuffer?: Buffer
  format?: string
}

export class FontAiClassificationService {
  private static aiClient: GoogleGenAI | null = null

  private static getClient(): GoogleGenAI | null {
    if (this.aiClient) return this.aiClient
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null
    this.aiClient = new GoogleGenAI({})
    return this.aiClient
  }

  /**
   * Classify a font family using Gemini 3.8 Flash multimodal reasoning,
   * with automated heuristic fallback if offline or API key is absent.
   */
  public static async classifyFont(input: ClassifyFontInput): Promise<FontAiClassificationResult> {
    const client = this.getClient()

    if (!client) {
      return this.fallbackHeuristicClassification(input)
    }

    try {
      // Generate preview specimen SVG as visual representation
      const specimenSvg = FontPreviewService.generateSpecimenSvg({
        familyName: input.familyName,
        subfamilyName: input.subfamilyName,
        weight: input.metadata.weight,
        isArabic: input.metadata.isArabic,
        isLatin: input.metadata.isLatin,
        category: input.metadata.category,
        designer: input.metadata.designer,
        fontDataBuffer: input.fontDataBuffer,
        format: input.format,
      })

      const prompt = `You are a master typographer and Arabic calligraphy scholar specializing in digital font classification.
Analyze this font family and its specimen:
Font Name: "${input.familyName}"
Subfamily: "${input.subfamilyName || 'Regular'}"
Weight: ${input.metadata.weight} (${input.metadata.weightName})
Is Arabic: ${input.metadata.isArabic}
Is Latin: ${input.metadata.isLatin}
Supported Scripts: ${input.metadata.supportedScripts.join(', ')}
Total Glyphs: ${input.metadata.numGlyphs}
Designer/Foundry: ${input.metadata.designer || 'Unknown'} / ${input.metadata.foundry || 'Unknown'}

Specimen SVG preview snippet:
${specimenSvg.slice(0, 3000)}

Classify the font according to:
1. Category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace' | 'arabic_calligraphy' | 'arabic_modern'
2. Arabic Style (if Arabic supported): 'naskh' | 'kufi' | 'ruqah' | 'thuluth' | 'diwani' | 'nastaliq' | 'modern' | 'maghrebi' | 'square_kufic' | 'hybrid' | null
3. Tags: 4-8 keywords (e.g., geometric, clean, elegant, quranic, branding, editorial, tech)
4. Mood: 2-4 emotional qualities (e.g., traditional, modern, formal, friendly, authoritative)
5. Contrast: 'low' | 'medium' | 'high'
6. Intended Use: array containing subset of ['headline', 'body', 'display', 'calligraphy', 'ui']
7. descriptionAr: 1-2 concise Arabic sentences summarizing characteristics and recommended use.
8. descriptionEn: 1-2 concise English sentences.
9. confidence: float between 0.0 and 1.0.

Respond ONLY with valid JSON conforming to the schema. No markdown formatting.`

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })

      const text = response.text?.trim() || '{}'
      const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(cleanJson)
      return FontAiClassificationSchema.parse(parsed)
    } catch (err) {
      console.warn('[FontAiClassificationService] Gemini API call failed, falling back to heuristics:', err)
      return this.fallbackHeuristicClassification(input)
    }
  }

  /**
   * Deterministic typographical heuristic classifier used for testing and fallback
   */
  public static fallbackHeuristicClassification(input: ClassifyFontInput): FontAiClassificationResult {
    const name = (input.familyName + ' ' + (input.subfamilyName || '')).toLowerCase()
    const isArabic = input.metadata.isArabic

    let category: FontCategory = 'sans-serif'
    let arabicStyle: FontArabicStyle | null = null
    const tags: string[] = []
    const mood: string[] = []
    let contrast: 'low' | 'medium' | 'high' = 'medium'
    const intendedUse: ('headline' | 'body' | 'display' | 'calligraphy' | 'ui')[] = ['body']

    // Detect Arabic styles from names or keywords
    if (isArabic) {
      if (name.includes('kufi') || name.includes('kufic') || name.includes('square')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'kufi'
        tags.push('geometric', 'historic', 'kufic', 'monumental')
        mood.push('traditional', 'authoritative')
        contrast = 'low'
        intendedUse.push('headline', 'display')
      } else if (name.includes('naskh') || name.includes('amiri') || name.includes('uthman') || name.includes('quran')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'naskh'
        tags.push('quranic', 'classical', 'editorial', 'legible')
        mood.push('traditional', 'reverent', 'formal')
        contrast = 'medium'
        intendedUse.push('body', 'calligraphy')
      } else if (name.includes('ruqaa') || name.includes('ruqah') || name.includes('aref')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'ruqah'
        tags.push('handwriting', 'compact', 'cursive')
        mood.push('expressive', 'warm')
        contrast = 'medium'
        intendedUse.push('headline', 'display')
      } else if (name.includes('thuluth')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'thuluth'
        tags.push('monumental', 'intricate', 'ornate')
        mood.push('majestic', 'formal')
        contrast = 'high'
        intendedUse.push('calligraphy', 'display')
      } else if (name.includes('diwani')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'diwani'
        tags.push('curved', 'decorative', 'flowing')
        mood.push('elegant', 'artistic')
        contrast = 'high'
        intendedUse.push('calligraphy', 'display')
      } else if (name.includes('nastaliq') || name.includes('urdu') || name.includes('persian')) {
        category = 'arabic_calligraphy'
        arabicStyle = 'nastaliq'
        tags.push('diagonal', 'poetic', 'flowing')
        mood.push('artistic', 'traditional')
        contrast = 'high'
        intendedUse.push('calligraphy', 'display')
      } else {
        // Modern Arabic UI fonts (like Cairo, Tajawal, Almarai)
        category = 'arabic_modern'
        arabicStyle = 'modern'
        tags.push('modern', 'ui', 'clean', 'web', 'digital')
        mood.push('contemporary', 'accessible')
        contrast = 'low'
        intendedUse.push('ui', 'headline')
      }
    } else {
      // Latin classification
      if (name.includes('mono') || name.includes('code') || name.includes('console')) {
        category = 'monospace'
        tags.push('code', 'developer', 'technical', 'tabular')
        mood.push('technical', 'precise')
        contrast = 'low'
        intendedUse.push('ui')
      } else if (name.includes('serif') || name.includes('roman') || name.includes('times') || name.includes('georgia')) {
        category = 'serif'
        tags.push('editorial', 'book', 'classic', 'publishing')
        mood.push('formal', 'traditional', 'literary')
        contrast = 'high'
        intendedUse.push('body', 'headline')
      } else if (name.includes('script') || name.includes('hand') || name.includes('brush') || name.includes('cursive')) {
        category = 'handwriting'
        tags.push('organic', 'casual', 'personal', 'fluid')
        mood.push('playful', 'friendly')
        contrast = 'medium'
        intendedUse.push('display')
      } else if (name.includes('display') || name.includes('poster') || name.includes('black') || input.metadata.weight >= 800) {
        category = 'display'
        tags.push('bold', 'attention-grabbing', 'poster')
        mood.push('impactful', 'loud')
        contrast = 'high'
        intendedUse.push('headline', 'display')
      } else {
        category = 'sans-serif'
        tags.push('clean', 'neutral', 'minimalist', 'interface')
        mood.push('modern', 'neutral')
        contrast = 'low'
        intendedUse.push('ui', 'body')
      }
    }

    const descAr = isArabic
      ? `خط ${input.familyName} يتميز بتصميمه ${arabicStyle ? `المستوحى من نمط ${arabicStyle}` : 'الحديث'}، ومثالي للاستخدام في ${intendedUse.join(' و')}.`
      : `خط ${input.familyName} بأسلوب ${category} متقن ومناسب لواجهات المستخدم والنصوص.`

    const descEn = `${input.familyName} is a ${category} font family well-suited for ${intendedUse.join(', ')} design applications.`

    return {
      category,
      arabicStyle,
      tags: Array.from(new Set(tags)),
      mood: Array.from(new Set(mood)),
      contrast,
      intendedUse: Array.from(new Set(intendedUse)),
      descriptionAr: descAr,
      descriptionEn: descEn,
      confidence: 0.88,
    }
  }
}
