/**
 * Phase 6: Font Metadata Extraction Engine
 * Architecture Layer: Typography & Binary Inspection (opentype.js with robust fallback tables)
 */

import opentype from 'opentype.js'
import type { FontFileFormat, VariableAxis } from '../../types/fonts'

export interface ExtractedFontMetadata {
  familyName: string
  subfamilyName: string
  fullName: string
  postscriptName: string
  designer?: string
  foundry?: string
  copyright?: string
  license?: string
  licenseUrl?: string
  version?: string
  weight: number // 100 - 900
  style: 'normal' | 'italic' | 'oblique'
  isVariable: boolean
  variableAxes?: Record<string, VariableAxis>
  characterCount: number
  unicodeRanges: string[]
  hasArabicCoverage: boolean
  hasLatinCoverage: boolean
  rawFormat: FontFileFormat
  technicalMetadata: Record<string, any>
}

export class FontMetadataService {
  /**
   * Parses font metadata from a memory buffer.
   */
  public static async extractFontMetadata(
    buffer: Buffer,
    hintFileName = '',
    hintFormat: FontFileFormat = 'TTF'
  ): Promise<ExtractedFontMetadata> {
    return this.parseFontBuffer(buffer, hintFileName, hintFormat)
  }

  public static async parseFontBuffer(
    buffer: Buffer,
    hintFileName = '',
    hintFormat: FontFileFormat = 'TTF'
  ): Promise<ExtractedFontMetadata> {
    try {
      // Convert Node Buffer to ArrayBuffer for opentype.js
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      const font = opentype.parse(arrayBuffer)
      return this.extractFromOpenType(font, buffer, hintFileName, hintFormat)
    } catch (err: any) {
      console.warn(`opentype.js parse failed for '${hintFileName}', utilizing binary heuristic fallback:`, err.message)
      return this.heuristicFallback(buffer, hintFileName, hintFormat)
    }
  }

  /**
   * Helper to retrieve a name property across opentype.js flat or platform-nested structures.
   */
  private static getNameRecord(names: any, key: string): any {
    if (!names) return undefined
    if (names[key] !== undefined) return names[key]
    if (names.windows && names.windows[key] !== undefined) return names.windows[key]
    if (names.macintosh && names.macintosh[key] !== undefined) return names.macintosh[key]
    if (names.unicode && names.unicode[key] !== undefined) return names.unicode[key]
    return undefined
  }

  /**
   * Extracts typed metadata from a parsed opentype.Font instance.
   */
  private static extractFromOpenType(
    font: opentype.Font,
    buffer: Buffer,
    hintFileName: string,
    hintFormat: FontFileFormat
  ): ExtractedFontMetadata {
    const names: any = font.names || {}

    // Family Name: Prefer Typographic Family (16), then Font Family (1)
    const rawFamily =
      this.getLocalizedName(this.getNameRecord(names, 'typographicFamily')) ||
      this.getLocalizedName(this.getNameRecord(names, 'fontFamily')) ||
      this.inferFamilyFromFilename(hintFileName)

    // Subfamily / Weight name: Prefer Typographic Subfamily (17), then Subfamily (2)
    const rawSubfamily =
      this.getLocalizedName(this.getNameRecord(names, 'typographicSubfamily')) ||
      this.getLocalizedName(this.getNameRecord(names, 'fontSubfamily')) ||
      'Regular'

    const fullName =
      this.getLocalizedName(this.getNameRecord(names, 'fullName')) ||
      `${rawFamily} ${rawSubfamily}`.trim()

    const postscriptName =
      this.getLocalizedName(this.getNameRecord(names, 'postScriptName')) ||
      fullName.replace(/\s+/g, '-')

    const designer = this.getLocalizedName(this.getNameRecord(names, 'designer'))
    const foundry = this.getLocalizedName(this.getNameRecord(names, 'manufacturer')) || this.getLocalizedName(this.getNameRecord(names, 'vendorId'))
    const copyright = this.getLocalizedName(this.getNameRecord(names, 'copyright'))
    const license = this.getLocalizedName(this.getNameRecord(names, 'license'))
    const licenseUrl = this.getLocalizedName(this.getNameRecord(names, 'licenseURL'))
    const version = this.getLocalizedName(this.getNameRecord(names, 'version'))

    // Weight extraction: Check OS/2 usWeightClass, fallback to subfamily name analysis
    let weight = 400
    if (font.tables.os2 && font.tables.os2.usWeightClass) {
      weight = font.tables.os2.usWeightClass
    } else {
      weight = this.inferWeightFromSubfamily(rawSubfamily)
    }
    // Clamp to 100 - 900
    weight = Math.min(900, Math.max(100, Math.round(weight / 100) * 100))

    // Style extraction: Italic vs Normal
    let style: 'normal' | 'italic' | 'oblique' = 'normal'
    const lowerSub = rawSubfamily.toLowerCase()
    if (lowerSub.includes('italic')) {
      style = 'italic'
    } else if (lowerSub.includes('oblique') || lowerSub.includes('slanted')) {
      style = 'oblique'
    } else if (font.tables.os2 && (font.tables.os2.fsSelection & 0x01)) {
      style = 'italic'
    }

    // Variable Font Detection (fvar table)
    let isVariable = false
    const variableAxes: Record<string, VariableAxis> = {}
    if (font.tables.fvar && font.tables.fvar.axes && font.tables.fvar.axes.length > 0) {
      isVariable = true
      for (const axis of font.tables.fvar.axes) {
        variableAxes[axis.tag] = {
          tag: axis.tag,
          name: this.getLocalizedName(axis.name) || axis.tag,
          min: axis.minValue,
          max: axis.maxValue,
          default: axis.defaultValue
        }
      }
    }

    // Unicode Range & Character Coverage
    const { unicodeRanges, characterCount, hasArabicCoverage, hasLatinCoverage } = this.inspectGlyphCoverage(font)

    return {
      familyName: rawFamily,
      subfamilyName: rawSubfamily,
      fullName,
      postscriptName,
      designer,
      foundry,
      copyright,
      license,
      licenseUrl,
      version,
      weight,
      style,
      isVariable,
      variableAxes: isVariable ? variableAxes : undefined,
      characterCount,
      unicodeRanges,
      hasArabicCoverage,
      hasLatinCoverage,
      rawFormat: hintFormat,
      technicalMetadata: {
        unitsPerEm: font.unitsPerEm,
        ascender: font.ascender,
        descender: font.descender,
        glyphCount: font.numGlyphs || (font.glyphs ? font.glyphs.length : 0),
        format: font.outlinesFormat || 'truetype'
      }
    }
  }

  /**
   * Inspects unicode character coverage across font glyphs.
   */
  private static inspectGlyphCoverage(font: opentype.Font): {
    unicodeRanges: string[]
    characterCount: number
    hasArabicCoverage: boolean
    hasLatinCoverage: boolean
  } {
    const ranges = new Set<string>()
    let characterCount = 0
    let hasArabicCoverage = false
    let hasLatinCoverage = false

    if (font.glyphs && font.glyphs.length > 0) {
      for (let i = 0; i < font.glyphs.length; i++) {
        const glyph = font.glyphs.get(i)
        if (!glyph) continue

        const unicodes = glyph.unicodes || (glyph.unicode ? [glyph.unicode] : [])
        for (const u of unicodes) {
          if (!u || u === 0) continue
          characterCount++

          // Latin Basic: 0x0020 - 0x007E
          if (u >= 0x0020 && u <= 0x007e) {
            ranges.add('Basic Latin')
            hasLatinCoverage = true
          }
          // Latin-1 Supplement: 0x00A0 - 0x00FF
          else if (u >= 0x00a0 && u <= 0x00ff) {
            ranges.add('Latin-1 Supplement')
            hasLatinCoverage = true
          }
          // Arabic Core: 0x0600 - 0x06FF
          else if (u >= 0x0600 && u <= 0x06ff) {
            ranges.add('Arabic')
            hasArabicCoverage = true
          }
          // Arabic Supplement & Extended: 0x0750 - 0x077F, 0x08A0 - 0x08FF
          else if ((u >= 0x0750 && u <= 0x077f) || (u >= 0x08a0 && u <= 0x08ff)) {
            ranges.add('Arabic Extended')
            hasArabicCoverage = true
          }
          // Arabic Presentation Forms A & B: 0xFB50 - 0xFDFF, 0xFE70 - 0xFEFF
          else if ((u >= 0xfb50 && u <= 0xfdff) || (u >= 0xfe70 && u <= 0xfeff)) {
            ranges.add('Arabic Presentation Forms')
            hasArabicCoverage = true
          }
          // Cyrillic: 0x0400 - 0x04FF
          else if (u >= 0x0400 && u <= 0x04ff) {
            ranges.add('Cyrillic')
          }
          // Greek: 0x0370 - 0x03FF
          else if (u >= 0x0370 && u <= 0x03ff) {
            ranges.add('Greek')
          }
          // Hebrew: 0x0590 - 0x05FF
          else if (u >= 0x0590 && u <= 0x05ff) {
            ranges.add('Hebrew')
          }
          // CJK: 0x4E00 - 0x9FFF
          else if (u >= 0x4e00 && u <= 0x9fff) {
            ranges.add('CJK Unified Ideographs')
          }
        }
      }
    }

    return {
      unicodeRanges: Array.from(ranges),
      characterCount,
      hasArabicCoverage,
      hasLatinCoverage
    }
  }

  /**
   * Localized name field helper (handles string or name record objects).
   */
  private static getLocalizedName(field: any): string | undefined {
    if (!field) return undefined
    if (typeof field === 'string') return field.trim() || undefined
    if (typeof field === 'object') {
      return (field.en || field['en-US'] || field.ar || Object.values(field)[0] || '').toString().trim() || undefined
    }
    return undefined
  }

  /**
   * Infers family name from file path if metadata tables are unreadable.
   */
  public static inferFamilyFromFilename(fileName: string): string {
    const base = fileName.split('/').pop() || fileName
    const nameWithoutExt = base.replace(/\.[^.]+$/, '')
    // E.g. Cairo-Bold -> Cairo, NotoSansArabic_Regular -> Noto Sans Arabic
    const familyCandidate = nameWithoutExt
      .replace(/[-_](regular|bold|italic|medium|light|thin|black|semibold|extrabold|demibold|heavy|ultra).*$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim()

    return familyCandidate || 'Unnamed Font'
  }

  /**
   * Infers CSS weight (100 - 900) from subfamily text tokens.
   */
  public static inferWeightFromSubfamily(subfamily: string): number {
    const s = subfamily.toLowerCase()
    if (s.includes('thin') || s.includes('hairline')) return 100
    if (s.includes('extralight') || s.includes('ultra light')) return 200
    if (s.includes('light')) return 300
    if (s.includes('medium')) return 500
    if (s.includes('semibold') || s.includes('demibold')) return 600
    if (s.includes('extrabold') || s.includes('ultra bold')) return 800
    if (s.includes('black') || s.includes('heavy')) return 900
    if (s.includes('bold')) return 700
    return 400
  }

  /**
   * Alias helper to parse weight from subfamily string
   */
  public static parseWeightFromSubfamily(subfamily: string): number {
    return this.inferWeightFromSubfamily(subfamily)
  }

  /**
   * Infers Arabic calligraphic school from name or keywords
   */
  public static inferArabicStyle(name: string): string {
    const s = name.toLowerCase()
    if (s.includes('kufi') || s.includes('kufic') || s.includes('square')) return 'kufi'
    if (s.includes('naskh') || s.includes('amiri') || s.includes('uthman') || s.includes('quran')) return 'naskh'
    if (s.includes('ruqaa') || s.includes('ruqah') || s.includes('ruka') || s.includes('aref')) return 'ruqah'
    if (s.includes('thuluth')) return 'thuluth'
    if (s.includes('diwani')) return 'diwani'
    if (s.includes('nastaliq') || s.includes('urdu') || s.includes('persian') || s.includes('jali')) return 'nastaliq'
    return 'modern'
  }

  /**
   * Fallback heuristic parser when opentype.js fails on compressed or unconventional binaries.
   */
  private static heuristicFallback(
    buffer: Buffer,
    hintFileName: string,
    hintFormat: FontFileFormat
  ): ExtractedFontMetadata {
    const familyName = this.inferFamilyFromFilename(hintFileName)
    const weight = this.inferWeightFromSubfamily(hintFileName)
    const isItalic = hintFileName.toLowerCase().includes('italic')

    return {
      familyName,
      subfamilyName: weight === 700 ? 'Bold' : weight === 300 ? 'Light' : 'Regular',
      fullName: `${familyName} ${weight === 700 ? 'Bold' : 'Regular'}`,
      postscriptName: `${familyName.replace(/\s+/g, '')}-${weight}`,
      weight,
      style: isItalic ? 'italic' : 'normal',
      isVariable: false,
      characterCount: 0,
      unicodeRanges: ['Basic Latin'],
      hasArabicCoverage: hintFileName.toLowerCase().includes('arabic'),
      hasLatinCoverage: true,
      rawFormat: hintFormat,
      technicalMetadata: { fallbackInferred: true, bufferSize: buffer.length }
    }
  }
}
