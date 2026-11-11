import { describe, it, expect } from 'vitest'
import { BoundedLruCache } from '../src/cache/lruCache.js'

describe('BoundedLruCache Engine', () => {
  it('stores and retrieves items correctly', () => {
    const cache = new BoundedLruCache<string>({ maxEntries: 10, defaultTtlMs: 5000 })
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
    expect(cache.has('key1')).toBe(true)
  })

  it('evicts least recently used items when capacity is reached', () => {
    const cache = new BoundedLruCache<string>({ maxEntries: 3, defaultTtlMs: 60000 })
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')

    // Access 'a' so 'b' becomes the oldest
    cache.get('a')

    // Add 'd', should evict 'b'
    cache.set('d', '4')

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('1')
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')

    const stats = cache.getStats()
    expect(stats.evictions).toBe(1)
    expect(stats.size).toBe(3)
  })

  it('expires entries after TTL', async () => {
    const cache = new BoundedLruCache<string>({ maxEntries: 10, defaultTtlMs: 50 })
    cache.set('temp', 'val', 30)

    expect(cache.get('temp')).toBe('val')

    await new Promise((res) => setTimeout(res, 50))

    expect(cache.get('temp')).toBeUndefined()
    expect(cache.has('temp')).toBe(false)
  })

  it('tracks cache hit and miss statistics accurately', () => {
    const cache = new BoundedLruCache<number>({ maxEntries: 5 })
    cache.set('num', 42)

    cache.get('num') // hit 1
    cache.get('num') // hit 2
    cache.get('missing') // miss 1

    const stats = cache.getStats()
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
  })
})
