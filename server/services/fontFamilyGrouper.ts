import type { FontCategory, FontArabicStyle, ExtractedFontMetadata } from '~/types/fonts'

export interface ExtractedFontWithStorage {
  fileId: string
  originalFileName: string
  storagePath: string
  fileSize: number
  format: 'ttf' | 'otf' | 'woff' | 'woff2'
  sha256: string
  metadata: ExtractedFontMetadata
}

export interface GroupedVariant {
  fileId: string
  originalFileName: string
  storagePath: string
  fileSize: number
  format: 'ttf' | 'otf' | 'woff' | 'woff2'
  sha256: string
  weight: number
  weightName: string
  style: 'normal' | 'italic' | 'oblique'
  postscriptName: string
  fullName: string
  isVariable: boolean
  variableAxes?: Array<{ tag: string; name: string; min: number; default: number; max: number }> | Record<string, any>
}

export interface GroupedFamily {
  name: string
  slug: string
  category: FontCategory
  arabicStyle?: FontArabicStyle
  isArabic: boolean
  isLatin: boolean
  scripts: string[]
  languages: string[]
  designer?: string
  foundry?: string
  license: string
  licenseUrl?: string
  description?: string
  sampleTextArabic: string
  sampleTextLatin: string
  weights: number[]
  styles: string[]
  isVariable: boolean
  variants: GroupedVariant[]
  filesCount: number
}

export class FontFamilyGrouper {
  /**
   * Slugify a font family name safely
   */
  public static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\u0600-\u06FF\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^-|-$/g, '') || 'font-family'
  }

  /**
   * Normalize and infer the typographic family name
   * Removes weight/style suffixes like "-Bold", " ExtraBold Italic", " Regular"
   */
  public static normalizeFamilyName(rawFamily: string, subfamily?: string): string {
    let family = (rawFamily || '').trim()
    if (!family && subfamily) {
      family = subfamily
    }

    if (!family) {
      return 'Untitled Font'
    }

    // Strip trailing weight and style words if appended directly to family name
    const suffixesToStrip = [
      /\s*[-_ ]\s*(thin|hairline|extralight|ultralight|light|regular|normal|book|medium|semibold|demibold|bold|extrabold|ultrabold|black|heavy|extrablack|italic|oblique|slanted)$/i,
      /\s*[-_ ]\s*(w\d{3}|v\d+[\.\d]*)$/i,
    ]

    let changed = true
    while (changed) {
      changed = false
      for (const pattern of suffixesToStrip) {
        if (pattern.test(family)) {
          family = family.replace(pattern, '').trim()
          changed = true
        }
      }
    }

    return family || rawFamily.trim() || 'Untitled Font'
  }

  /**
   * Clusters an array of extracted font items into cohesive font families
   */
  public static groupFonts(items: ExtractedFontWithStorage[]): GroupedFamily[] {
    const familyMap = new Map<string, GroupedFamily>()

    for (const item of items) {
      const meta = item.metadata
      const canonicalName = this.normalizeFamilyName(meta.familyName, meta.subfamilyName)
      const slug = this.slugify(canonicalName)

      let family = familyMap.get(slug)
      if (!family) {
        family = {
          name: canonicalName,
          slug,
          category: meta.category || 'sans-serif',
          arabicStyle: meta.arabicStyle,
          isArabic: Boolean(meta.isArabic),
          isLatin: Boolean(meta.isLatin),
          scripts: [...(meta.supportedScripts || [])],
          languages: [...(meta.supportedLanguages || [])],
          designer: meta.designer,
          foundry: meta.foundry,
          license: meta.license || 'OFL',
          licenseUrl: meta.licenseUrl,
          description: meta.description,
          sampleTextArabic: meta.sampleTextArabic || 'أبجد هوز حطي كلمن صعفض قرشت ثخذ ضظغ',
          sampleTextLatin: meta.sampleTextLatin || 'The quick brown fox jumps over the lazy dog',
          weights: [],
          styles: [],
          isVariable: false,
          variants: [],
          filesCount: 0,
        }
        familyMap.set(slug, family)
      }

      const activeFamily = family!

      // Add variant
      const variant: GroupedVariant = {
        fileId: item.fileId,
        originalFileName: item.originalFileName,
        storagePath: item.storagePath,
        fileSize: item.fileSize,
        format: item.format,
        sha256: item.sha256,
        weight: meta.weight,
        weightName: meta.weightName || 'Regular',
        style: meta.style,
        postscriptName: meta.postscriptName || `${canonicalName}-${meta.weight}`,
        fullName: meta.fullName || `${canonicalName} Regular`,
        isVariable: Boolean(meta.isVariable),
        variableAxes: meta.variableAxes,
      }

      // Deduplicate variants with same weight & style
      const existingVariantIndex = activeFamily.variants.findIndex(
        v => v.weight === variant.weight && v.style === variant.style
      )

      if (existingVariantIndex >= 0) {
        // Prefer woff2/woff over ttf/otf if available, or keep higher quality
        const currentVariant = activeFamily.variants[existingVariantIndex]
        if (variant.format === 'woff2' && currentVariant.format !== 'woff2') {
          activeFamily.variants[existingVariantIndex] = variant
        }
      } else {
        activeFamily.variants.push(variant)
      }

      // Merge scripts & languages
      for (const s of (meta.supportedScripts || [])) {
        if (!activeFamily.scripts.includes(s)) activeFamily.scripts.push(s)
      }
      for (const l of (meta.supportedLanguages || [])) {
        if (!activeFamily.languages.includes(l)) activeFamily.languages.push(l)
      }

      if (meta.isArabic) activeFamily.isArabic = true
      if (meta.isLatin) activeFamily.isLatin = true
      if (meta.isVariable) activeFamily.isVariable = true
      if (!activeFamily.arabicStyle && meta.arabicStyle) activeFamily.arabicStyle = meta.arabicStyle
      if (meta.category && activeFamily.category === 'sans-serif' && meta.category !== 'sans-serif') {
        activeFamily.category = meta.category
      }
    }

    // Post-process each family: sort weights, unique styles, count files
    const result: GroupedFamily[] = []
    for (const family of familyMap.values()) {
      family.variants.sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight
        return a.style.localeCompare(b.style)
      })

      family.weights = Array.from(new Set(family.variants.map(v => v.weight))).sort((a, b) => a - b)
      family.styles = Array.from(new Set(family.variants.map(v => v.style)))
      family.filesCount = family.variants.length

      result.push(family)
    }

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }
}
