import { describe, it, expect, afterEach } from 'vitest'
import { MemoryRateLimiter } from '../src/security/rateLimiter.js'
import { RateLimitExceededError } from '../src/errors/AppError.js'

describe('MemoryRateLimiter', () => {
  let limiter: MemoryRateLimiter

  afterEach(() => {
    limiter?.destroy()
  })

  it('allows requests within limit', () => {
    limiter = new MemoryRateLimiter({ windowMs: 60000, defaultLimit: 5 })
    const key = 'ip-127.0.0.1'

    const r1 = limiter.check(key, 5)
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(4)

    const r2 = limiter.check(key, 5)
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(3)
  })

  it('blocks and throws RateLimitExceededError when limit is exhausted', () => {
    limiter = new MemoryRateLimiter({ windowMs: 60000, defaultLimit: 2 })
    const key = 'ip-10.0.0.1'

    limiter.enforce(key, 2)
    limiter.enforce(key, 2)

    expect(() => limiter.enforce(key, 2)).toThrow(RateLimitExceededError)
  })

  it('resets quota after window expiration', async () => {
    limiter = new MemoryRateLimiter({ windowMs: 50, defaultLimit: 1 })
    const key = 'quick-test'

    limiter.enforce(key, 1)
    expect(() => limiter.enforce(key, 1)).toThrow(RateLimitExceededError)

    await new Promise((res) => setTimeout(res, 60))

    const retryResult = limiter.check(key, 1)
    expect(retryResult.allowed).toBe(true)
  })
})
