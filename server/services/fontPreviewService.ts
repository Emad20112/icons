export interface FontSpecimenOptions {
  familyName: string
  subfamilyName?: string
  weight?: number
  isArabic?: boolean
  isLatin?: boolean
  category?: string
  arabicStyle?: string
  designer?: string
  fontDataBuffer?: Buffer
  format?: string
  theme?: 'dark' | 'light'
  width?: number
  height?: number
}

export class FontPreviewService {
  /**
   * Generates a rich SVG specimen card for a font family or variant
   */
  public static generateSpecimenSvg(options: FontSpecimenOptions): string {
    const width = options.width || 1200
    const height = options.height || 630
    const isDark = options.theme !== 'light'

    const bgColor = isDark ? '#090d16' : '#ffffff'
    const cardBg = isDark ? '#111827' : '#f8fafc'
    const borderColor = isDark ? '#1f2937' : '#e2e8f0'
    const textColor = isDark ? '#f9fafb' : '#0f172a'
    const mutedColor = isDark ? '#9ca3af' : '#64748b'
    const accentColor = '#3b82f6'
    const badgeBg = isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'
    const badgeBorder = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'

    const familyName = this.escapeXml(options.familyName || 'Untitled Font')
    const subfamily = this.escapeXml(options.subfamilyName || 'Regular')
    const weight = options.weight || 400
    const category = this.escapeXml(options.category || 'Sans-Serif')
    const arabicStyle = options.arabicStyle ? this.escapeXml(options.arabicStyle) : null
    const designer = options.designer ? this.escapeXml(options.designer) : null

    // Font Face embedding if binary buffer provided
    let fontFaceCss = ''
    let fontFamilyStyle = `font-family: '${familyName}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`

    if (options.fontDataBuffer && options.fontDataBuffer.length > 0) {
      const mime = options.format === 'woff2' ? 'font/woff2' : options.format === 'woff' ? 'font/woff' : 'font/truetype'
      const base64Data = options.fontDataBuffer.toString('base64')
      fontFaceCss = `
        @font-face {
          font-family: 'Embedded_${familyName}';
          src: url('data:${mime};charset=utf-8;base64,${base64Data}') format('${options.format || 'truetype'}');
          font-weight: ${weight};
          font-style: normal;
        }
      `
      fontFamilyStyle = `font-family: 'Embedded_${familyName}', '${familyName}', system-ui, sans-serif;`
    }

    const isArabic = options.isArabic !== false
    const isLatin = options.isLatin !== false

    const arabicHeadline = 'القاهرة عاصمة التاريخ والحضارة'
    const arabicSubtext = 'ملتقى الفنون ومنارة الإبداع العربي عبر العصور • أبجد هوز حطي كلمن'
    const latinHeadline = 'Sphinx of black quartz, judge my vow'
    const latinSubtext = 'The quick brown fox jumps over the lazy dog • 0123456789'

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${fontFaceCss}
      .specimen-title { font-weight: 700; fill: ${textColor}; }
      .specimen-muted { fill: ${mutedColor}; }
      .specimen-arabic { ${fontFamilyStyle} font-weight: ${weight}; fill: ${textColor}; direction: rtl; text-anchor: end; }
      .specimen-latin { ${fontFamilyStyle} font-weight: ${weight}; fill: ${textColor}; }
      .tag-text { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 600; fill: ${accentColor}; }
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}" />
      <stop offset="100%" stop-color="${cardBg}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="20" fill="${cardBg}" stroke="${borderColor}" stroke-width="2" />

  <!-- Header Section -->
  <g transform="translate(60, 70)">
    <!-- Family Title -->
    <text x="0" y="32" class="specimen-title" font-family="system-ui, sans-serif" font-size="34">${familyName}</text>
    <text x="0" y="60" class="specimen-muted" font-family="system-ui, sans-serif" font-size="16">
      ${subfamily} • Weight: ${weight} ${designer ? `• By ${designer}` : ''}
    </text>

    <!-- Badges -->
    <g transform="translate(${width - 420}, 10)">
      <rect x="0" y="0" width="100" height="30" rx="8" fill="${badgeBg}" stroke="${badgeBorder}" />
      <text x="50" y="20" class="tag-text" text-anchor="middle">${category}</text>

      ${arabicStyle ? `
      <rect x="110" y="0" width="110" height="30" rx="8" fill="${badgeBg}" stroke="${badgeBorder}" />
      <text x="165" y="20" class="tag-text" text-anchor="middle">${arabicStyle}</text>
      ` : ''}

      <rect x="${arabicStyle ? 230 : 110}" y="0" width="80" height="30" rx="8" fill="${badgeBg}" stroke="${badgeBorder}" />
      <text x="${arabicStyle ? 270 : 150}" y="20" class="tag-text" text-anchor="middle">w:${weight}</text>
    </g>
  </g>

  <!-- Divider Line -->
  <line x1="60" y1="160" x2="${width - 60}" y2="160" stroke="${borderColor}" stroke-width="1.5" />

  <!-- Arabic Specimen Section (Right-to-Left) -->
  ${isArabic ? `
  <g transform="translate(${width - 60}, 250)">
    <text x="0" y="0" class="specimen-arabic" font-size="52">${arabicHeadline}</text>
    <text x="0" y="55" class="specimen-arabic" font-size="24" fill="${mutedColor}">${arabicSubtext}</text>
  </g>
  ` : ''}

  <!-- Latin Specimen Section (Left-to-Right) -->
  ${isLatin ? `
  <g transform="translate(60, ${isArabic ? 390 : 270})">
    <text x="0" y="0" class="specimen-latin" font-size="44">${latinHeadline}</text>
    <text x="0" y="50" class="specimen-latin" font-size="22" fill="${mutedColor}">${latinSubtext}</text>
  </g>
  ` : ''}

  <!-- Footer Info / Character Glyph Sample -->
  <g transform="translate(60, ${height - 50})">
    <text x="0" y="0" class="specimen-muted" font-family="ui-monospace, monospace" font-size="14">
      Digital Assets Platform Font Engine • Phase 6 Vector Specimen
    </text>
    <text x="${width - 120}" y="0" class="specimen-muted" font-family="system-ui, sans-serif" font-size="14" text-anchor="end">
      A B C D E F G H I J K L M N O P Q R S T U V W X Y Z • أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي
    </text>
  </g>
</svg>
`
  }

  /**
   * Generates a Data URL from the specimen SVG
   */
  public static generateSpecimenDataUrl(options: FontSpecimenOptions): string {
    const svg = this.generateSpecimenSvg(options)
    const base64 = Buffer.from(svg, 'utf-8').toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
