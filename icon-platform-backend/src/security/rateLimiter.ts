import { RateLimitExceededError } from '../errors/AppError.js'

export interface RateLimitBucket {
  tokens: number
  lastRefill: number
  resetTime: number
}

export interface RateLimitCheckResult {
  allowed: boolean
  remaining: number
  limit: number
  resetTime: number
  retryAfterSeconds: number
}

export class MemoryRateLimiter {
  private readonly buckets: Map<string, RateLimitBucket> = new Map()
  private readonly windowMs: number
  private readonly defaultLimit: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: { windowMs?: number; defaultLimit?: number } = {}) {
    this.windowMs = options.windowMs || 60000 // 1 minute window
    this.defaultLimit = options.defaultLimit || 60

    // Run passive cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 120000)
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  public check(key: string, limit = this.defaultLimit): RateLimitCheckResult {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket || now >= bucket.resetTime) {
      bucket = {
        tokens: limit - 1,
        lastRefill: now,
        resetTime: now + this.windowMs,
      }
      this.buckets.set(key, bucket)
      return {
        allowed: true,
        remaining: bucket.tokens,
        limit,
        resetTime: bucket.resetTime,
        retryAfterSeconds: 0,
      }
    }

    if (bucket.tokens <= 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000))
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetTime: bucket.resetTime,
        retryAfterSeconds,
      }
    }

    bucket.tokens--
    return {
      allowed: true,
      remaining: bucket.tokens,
      limit,
      resetTime: bucket.resetTime,
      retryAfterSeconds: 0,
    }
  }

  public enforce(key: string, limit = this.defaultLimit): RateLimitCheckResult {
    const result = this.check(key, limit)
    if (!result.allowed) {
      throw new RateLimitExceededError(
        `Too many requests. Limit of ${limit} per minute reached for this client.`,
        result.retryAfterSeconds
      )
    }
    return result
  }

  public reset(key?: string): void {
    if (key) {
      this.buckets.delete(key)
    } else {
      this.buckets.clear()
    }
  }

  public getActiveKeysCount(): number {
    return this.buckets.size
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetTime) {
        this.buckets.delete(key)
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.buckets.clear()
  }
}

export const rateLimiter = new MemoryRateLimiter()
