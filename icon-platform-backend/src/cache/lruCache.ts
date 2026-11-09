export interface CacheEntry<T> {
  value: T
  expiresAt: number
  accessedAt: number
}

export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  maxEntries: number
}

export class BoundedLruCache<T = any> {
  private readonly maxEntries: number
  private readonly defaultTtlMs: number
  private readonly store: Map<string, CacheEntry<T>>
  private hits = 0
  private misses = 0
  private evictions = 0

  constructor(options: { maxEntries?: number; defaultTtlMs?: number } = {}) {
    this.maxEntries = options.maxEntries || 5000
    this.defaultTtlMs = options.defaultTtlMs || 300000 // 5 minutes default
    this.store = new Map()
  }

  public get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      this.misses++
      return undefined
    }

    // Refresh LRU order (delete & set)
    this.store.delete(key)
    entry.accessedAt = Date.now()
    this.store.set(key, entry)
    this.hits++
    return entry.value
  }

  public set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs !== undefined ? ttlMs : this.defaultTtlMs)

    if (this.store.has(key)) {
      this.store.delete(key)
    } else if (this.store.size >= this.maxEntries) {
      // Evict oldest (first key in map)
      const oldestKey = this.store.keys().next().value
      if (oldestKey) {
        this.store.delete(oldestKey)
        this.evictions++
      }
    }

    this.store.set(key, {
      value,
      expiresAt,
      accessedAt: Date.now(),
    })
  }

  public has(key: string): boolean {
    return this.get(key) !== undefined
  }

  public delete(key: string): boolean {
    return this.store.delete(key)
  }

  public clear(): void {
    this.store.clear()
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  public getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.store.size,
      maxEntries: this.maxEntries,
    }
  }
}
