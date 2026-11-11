export class SvgSanitizer {
  private static readonly FORBIDDEN_TAGS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi,
    /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  ]

  private static readonly FORBIDDEN_ATTRS = [
    /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, // on* event handlers (e.g. onload, onclick)
    /\bhref\s*=\s*(?:'(?:javascript|data|vbscript):[^']*'|"(?:javascript|data|vbscript):[^"]*"|(?:javascript|data|vbscript):[^\s>]+)/gi,
    /\bxlink:href\s*=\s*(?:'(?:javascript|data|vbscript):[^']*'|"(?:javascript|data|vbscript):[^"]*"|(?:javascript|data|vbscript):[^\s>]+)/gi,
  ]

  /**
   * Cleans SVG string from active scripting and injection payloads
   */
  public static sanitize(rawSvg: string): string {
    if (!rawSvg || typeof rawSvg !== 'string') return ''

    let cleaned = rawSvg

    // Remove forbidden tags
    for (const pattern of this.FORBIDDEN_TAGS) {
      cleaned = cleaned.replace(pattern, '')
    }

    // Remove forbidden attributes
    for (const pattern of this.FORBIDDEN_ATTRS) {
      cleaned = cleaned.replace(pattern, '')
    }

    // Verify it retains basic SVG opening and closing tags
    if (!cleaned.includes('<svg') || !cleaned.includes('</svg>')) {
      return ''
    }

    return cleaned.trim()
  }

  /**
   * Wraps Iconify icon body and geometry into a complete, standalone, safe SVG document
   */
  public static buildSvg(options: {
    body: string
    width?: number
    height?: number
    left?: number
    top?: number
    color?: string
    size?: number
    customWidth?: number
    customHeight?: number
  }): string {
    const rawWidth = options.width || 16
    const rawHeight = options.height || 16
    const left = options.left || 0
    const top = options.top || 0

    const targetWidth = options.size || options.customWidth || rawWidth
    const targetHeight = options.size || options.customHeight || rawHeight

    const viewBox = `${left} ${top} ${rawWidth} ${rawHeight}`
    const colorAttr = options.color ? ` color="${options.color}"` : ''

    const safeBody = this.sanitize(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${targetWidth}" height="${targetHeight}"${colorAttr}>${options.body}</svg>`
    )

    return safeBody
  }
}
