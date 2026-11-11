import { config } from '../config/env.js'
import { AppError, NotFoundError, RateLimitExceededError, UpstreamServiceError } from '../errors/AppError.js'
import { RequestValidator } from '../security/validator.js'
import { CircuitBreaker } from './circuitBreaker.js'
import type {
  IconifyCollectionsResponse,
  IconifyCollectionDetails,
  IconifyIconData,
  IconifySearchResponse,
} from '../types/iconify.js'

export class IconifyClient {
  private readonly baseUrl: string
  private readonly fallbackUrl: string
  private readonly timeoutMs: number
  private readonly maxResponseBytes: number
  public readonly circuitBreaker: CircuitBreaker

  constructor(options: {
    baseUrl?: string
    fallbackUrl?: string
    timeoutMs?: number
    maxResponseBytes?: number
    circuitBreaker?: CircuitBreaker
  } = {}) {
    this.baseUrl = (options.baseUrl || config.iconifyApiBaseUrl).replace(/\/+$/, '')
    this.fallbackUrl = (options.fallbackUrl || config.iconifyApiFallbackUrl).replace(/\/+$/, '')
    this.timeoutMs = options.timeoutMs || config.upstreamTimeoutMs
    this.maxResponseBytes = options.maxResponseBytes || 5 * 1024 * 1024 // 5MB limit
    this.circuitBreaker = options.circuitBreaker || new CircuitBreaker({
      failureThreshold: config.circuitBreakerFailThreshold,
      resetTimeoutMs: config.circuitBreakerResetTimeoutMs,
    })
  }

  /**
   * Safe fetch with timeout, circuit breaker, size limits, and fallback host
   */
  public async fetchJson<T>(path: string, queryParams: Record<string, any> = {}): Promise<T> {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    }

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : ''
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    return this.circuitBreaker.execute(async () => {
      try {
        return await this.executeFetch<T>(`${this.baseUrl}${cleanPath}${queryString}`)
      } catch (err: any) {
        // If primary host fails and we have a fallback host, attempt fallback once
        if (this.fallbackUrl && this.fallbackUrl !== this.baseUrl && this.isRecoverableNetworkError(err)) {
          console.warn(`[IconifyClient] Primary host failed (${err.message}). Retrying on fallback ${this.fallbackUrl}...`)
          return await this.executeFetch<T>(`${this.fallbackUrl}${cleanPath}${queryString}`)
        }
        throw err
      }
    })
  }

  /**
   * Internal fetch executor with timeout and body size limit
   */
  private async executeFetch<T>(fullUrl: string): Promise<T> {
    RequestValidator.validateUpstreamUrl(fullUrl)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IconPlatform-Backend/1.0',
        },
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (response.status === 404) {
        throw new NotFoundError(`Requested resource was not found on Iconify API (${fullUrl})`)
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10)
        throw new RateLimitExceededError('Upstream Iconify API rate limit exceeded', retryAfter)
      }

      if (!response.ok) {
        throw new UpstreamServiceError(
          `Iconify API upstream error (HTTP ${response.status}: ${response.statusText})`,
          response.status >= 500 ? 502 : response.status
        )
      }

      // Read response with size guard
      const rawText = await response.text()
      if (rawText.length > this.maxResponseBytes) {
        throw new UpstreamServiceError('Upstream response exceeded safe size threshold of 5MB', 502)
      }

      try {
        return JSON.parse(rawText) as T
      } catch (jsonErr: any) {
        throw new UpstreamServiceError(`Failed to parse upstream Iconify JSON response: ${jsonErr.message}`, 502)
      }
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new UpstreamServiceError(`Iconify upstream request timed out after ${this.timeoutMs}ms`, 504)
      }
      if (err instanceof AppError) {
        throw err
      }
      throw new UpstreamServiceError(`Upstream network failure: ${err.message}`, 502)
    }
  }

  /**
   * Search icons using official Iconify search endpoint
   */
  public async search(params: {
    query: string
    limit?: number
    start?: number
    prefix?: string
    category?: string
  }): Promise<IconifySearchResponse> {
    const q = RequestValidator.validateSearchQuery(params.query)
    const { limit, start } = RequestValidator.validatePagination(params.limit, params.start)

    const queryObj: Record<string, any> = {
      query: q,
      limit,
      start,
    }

    if (params.prefix) {
      queryObj.prefix = RequestValidator.validatePrefix(params.prefix)
    }
    if (params.category) {
      queryObj.category = String(params.category).substring(0, 50)
    }

    return this.fetchJson<IconifySearchResponse>('/search', queryObj)
  }

  /**
   * Retrieves all available icon collections metadata
   */
  public async getCollections(prefixes?: string[]): Promise<IconifyCollectionsResponse> {
    const queryObj: Record<string, any> = {}
    if (prefixes && prefixes.length > 0) {
      const validated = prefixes.map(p => RequestValidator.validatePrefix(p))
      queryObj.prefixes = validated.join(',')
    }
    return this.fetchJson<IconifyCollectionsResponse>('/collections', queryObj)
  }

  /**
   * Retrieves collection details including categories and list of icons
   */
  public async getCollectionDetails(prefix: string): Promise<IconifyCollectionDetails> {
    const cleanPrefix = RequestValidator.validatePrefix(prefix)
    return this.fetchJson<IconifyCollectionDetails>('/collection', { prefix: cleanPrefix })
  }

  /**
   * Retrieves raw icon data (dimensions + body) for a given icon
   */
  public async getIconData(prefix: string, name: string): Promise<IconifyIconData> {
    const cleanPrefix = RequestValidator.validatePrefix(prefix)
    const cleanName = RequestValidator.validateIconName(name)

    // Query endpoint e.g. /lucide.json?icons=home
    interface IconSetResponse {
      prefix: string
      icons?: Record<string, IconifyIconData>
      aliases?: Record<string, { parent: string }>
      width?: number
      height?: number
    }

    const data = await this.fetchJson<IconSetResponse>(`/${cleanPrefix}.json`, {
      icons: cleanName,
    })

    if (!data || !data.icons || !data.icons[cleanName]) {
      // Check aliases
      if (data?.aliases && data.aliases[cleanName]?.parent && data.icons?.[data.aliases[cleanName].parent]) {
        const parent = data.aliases[cleanName].parent
        return {
          width: data.width || 16,
          height: data.height || 16,
          ...data.icons[parent],
        }
      }
      throw new NotFoundError(`Icon '${cleanPrefix}:${cleanName}' was not found in upstream collection.`)
    }

    const icon = data.icons[cleanName]
    return {
      width: icon.width || data.width || 16,
      height: icon.height || data.height || 16,
      left: icon.left || 0,
      top: icon.top || 0,
      body: icon.body,
      rotate: icon.rotate,
      hFlip: icon.hFlip,
      vFlip: icon.vFlip,
    }
  }

  private isRecoverableNetworkError(err: any): boolean {
    if (err instanceof RateLimitExceededError || err instanceof NotFoundError) return false
    return true
  }
}

export const iconifyClient = new IconifyClient()
