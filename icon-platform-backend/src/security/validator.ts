import { ValidationError } from '../errors/AppError.js'

export class RequestValidator {
  private static readonly PREFIX_REGEX = /^[a-z0-9][a-z0-9-]{0,49}$/
  private static readonly NAME_REGEX = /^[a-z0-9][a-z0-9-_:]{0,99}$/
  private static readonly COLOR_REGEX = /^(currentColor|transparent|#[0-9a-fA-F]{3,8}|rgba?\([0-9\s,%.]+\)|[a-z]{3,20})$/i

  private static readonly ALLOWED_HOSTS = new Set([
    'api.iconify.design',
    'api.simplesvg.com',
    'api.unisvg.com'
  ])

  /**
   * Validates and normalizes an icon collection prefix (e.g., 'lucide', 'heroicons')
   */
  public static validatePrefix(prefix: string): string {
    if (!prefix || typeof prefix !== 'string') {
      throw new ValidationError('Collection prefix is required and must be a string')
    }
    const clean = prefix.trim().toLowerCase()
    if (!this.PREFIX_REGEX.test(clean)) {
      throw new ValidationError(`Invalid collection prefix '${prefix}'. Only lowercase alphanumeric characters and hyphens allowed (1-50 chars).`)
    }
    return clean
  }

  /**
   * Validates and normalizes an icon name (e.g., 'home', 'arrow-left', 'chevron_right')
   */
  public static validateIconName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Icon name is required and must be a string')
    }
    const clean = name.trim().toLowerCase()
    if (!this.NAME_REGEX.test(clean)) {
      throw new ValidationError(`Invalid icon name '${name}'. Only lowercase alphanumeric characters, dashes, and underscores allowed (1-100 chars).`)
    }
    return clean
  }

  /**
   * Validates and normalizes search queries
   */
  public static validateSearchQuery(query: any): string {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query parameter is required')
    }
    const clean = query.trim()
    if (clean.length < 1 || clean.length > 100) {
      throw new ValidationError('Search query must be between 1 and 100 characters')
    }
    // Reject control characters or null bytes
    if (/[\x00-\x1F\x7F]/.test(clean)) {
      throw new ValidationError('Search query contains forbidden control characters')
    }
    return clean
  }

  /**
   * Validates pagination parameters safely
   */
  public static validatePagination(limitRaw: any, startRaw: any): { limit: number; start: number } {
    let limit = 40
    let start = 0

    if (limitRaw !== undefined && limitRaw !== null && limitRaw !== '') {
      const parsed = parseInt(String(limitRaw), 10)
      if (isNaN(parsed) || parsed < 1 || parsed > 100) {
        throw new ValidationError('Limit must be an integer between 1 and 100')
      }
      limit = parsed
    }

    if (startRaw !== undefined && startRaw !== null && startRaw !== '') {
      const parsed = parseInt(String(startRaw), 10)
      if (isNaN(parsed) || parsed < 0 || parsed > 10000) {
        throw new ValidationError('Start must be a non-negative integer <= 10000')
      }
      start = parsed
    }

    return { limit, start }
  }

  /**
   * Validates color inputs for SVG generation
   */
  public static validateColor(colorRaw: any): string | undefined {
    if (!colorRaw) return undefined
    const str = String(colorRaw).trim()
    if (!this.COLOR_REGEX.test(str)) {
      throw new ValidationError('Invalid color format. Use hex (#fff, #3b82f6), rgb, rgba, or currentColor')
    }
    return str
  }

  /**
   * Validates size/dimension parameters (8 to 1024)
   */
  public static validateDimension(sizeRaw: any): number | undefined {
    if (sizeRaw === undefined || sizeRaw === null || sizeRaw === '') return undefined
    const parsed = parseInt(String(sizeRaw), 10)
    if (isNaN(parsed) || parsed < 8 || parsed > 1024) {
      throw new ValidationError('Dimension size must be an integer between 8 and 1024')
    }
    return parsed
  }

  /**
   * Strictly ensures destination URL belongs to official approved Iconify hosts (SSRF Prevention)
   */
  public static validateUpstreamUrl(urlStr: string): void {
    try {
      const parsed = new URL(urlStr)
      if (parsed.protocol !== 'https:') {
        throw new ValidationError('Only secure HTTPS protocol allowed for upstream requests')
      }
      if (!this.ALLOWED_HOSTS.has(parsed.hostname)) {
        throw new ValidationError(`SSRF Security Rejection: Host '${parsed.hostname}' is not in the approved Iconify API whitelist.`)
      }
    } catch (err: any) {
      if (err instanceof ValidationError) throw err
      throw new ValidationError(`Malformed upstream URL: ${err.message}`)
    }
  }
}
