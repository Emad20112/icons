import { defineEventHandler, getQuery, createError, setHeader, setResponseStatus } from 'h3'
import dns from 'node:dns'

// Force IPv4 first to avoid IPv6 timeout on Windows/Cloudflare environments
try {
  dns.setDefaultResultOrder('ipv4first')
} catch {
  // Ignore in environments where it's not supported
}

// Official Iconify API endpoint
const ICONIFY_API_BASE = 'https://api.iconify.design'

// Strict regex patterns for input validation
const PREFIX_REGEX = /^[a-z0-9][a-z0-9-]{0,31}$/
const NAME_REGEX = /^[a-z0-9][a-z0-9-_]{0,63}$/
const COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// In-memory bounded cache for Nitro proxy
interface CacheItem<T> {
  data: T
  expiresAt: number
}
const cache = new Map<string, CacheItem<any>>()
const MAX_CACHE_SIZE = 1500

function getFromCache<T>(key: string): T | null {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() > item.expiresAt) {
    cache.delete(key)
    return null
  }
  return item.data as T
}

function setInCache<T>(key: string, data: T, ttlMs: number) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<any>>()

async function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing as Promise<T>
  }
  const promise = fn().finally(() => {
    inFlightRequests.delete(key)
  })
  inFlightRequests.set(key, promise)
  return promise
}

export default defineEventHandler(async (event) => {
  const path = event.context.params?.path || ''
  const query = getQuery(event)
  const clientIp = (event.node.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || event.node.req.socket.remoteAddress || '127.0.0.1'

  // If remote backend URL is provided, forward to the decoupled backend service
  const remoteBackendUrl = process.env.ICONIFY_BACKEND_URL || process.env.VITE_ICONIFY_BACKEND_URL
  if (remoteBackendUrl) {
    const cleanRemote = remoteBackendUrl.replace(/\/+$/, '')
    const targetUrl = `${cleanRemote}/api/v1/icons/${path}${event.node.req.url?.includes('?') ? '?' + event.node.req.url.split('?')[1] : ''}`
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'x-forwarded-for': clientIp,
          'Accept': (event.node.req.headers['accept'] as string) || 'application/json',
        },
      })
      setResponseStatus(event, response.status)
      const contentType = response.headers.get('content-type') || 'application/json'
      setHeader(event, 'content-type', contentType)
      return await response.text()
    } catch (err: any) {
      throw createError({ statusCode: 502, statusMessage: `Failed to proxy to remote backend: ${err.message}` })
    }
  }

  // --- Self-contained Nitro Gateway Proxy (No cross-imports to backend) ---

  // 1. Search icons: /api/v1/iconify/search
  if (path === 'search') {
    const rawQuery = String(query.q || query.query || '').trim()
    const prefix = query.prefix || query.collection ? String(query.prefix || query.collection).trim().toLowerCase() : ''

    if (prefix && !PREFIX_REGEX.test(prefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid collection prefix' })
    }

    // If query is empty or less than 2 characters
    if (!rawQuery || rawQuery.length < 2) {
      // If collection is selected, fetch collection icons list
      if (prefix) {
        const cacheKey = `collection_search_fallback:${prefix}`
        const cached = getFromCache(cacheKey)
        if (cached) {
          setHeader(event, 'x-cache', 'HIT')
          return cached
        }

        const result = await coalesce(cacheKey, async () => {
          const upstreamRes = await fetch(`${ICONIFY_API_BASE}/collection?prefix=${encodeURIComponent(prefix)}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          })
          if (!upstreamRes.ok) {
            return { icons: [], total: 0, limit: 48, start: 0 }
          }
          const collData = await upstreamRes.json()
          let iconNames: string[] = []
          if (Array.isArray(collData.uncategorized)) {
            iconNames.push(...collData.uncategorized)
          }
          if (collData.categories && typeof collData.categories === 'object') {
            for (const catIcons of Object.values(collData.categories)) {
              if (Array.isArray(catIcons)) {
                iconNames.push(...catIcons)
              }
            }
          }
          const fullIcons = iconNames.map(name => `${prefix}:${name}`)
          return {
            icons: fullIcons.slice(0, 100),
            total: fullIcons.length,
            limit: 48,
            start: 0,
            allIcons: fullIcons
          }
        })

        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '48'), 10) || 48))
        const start = Math.max(0, parseInt(String(query.start || '0'), 10) || 0)
        const paginatedIcons = (result.allIcons || result.icons).slice(start, start + limit)

        setInCache(cacheKey, result, 3600000)
        return {
          icons: paginatedIcons,
          total: result.total,
          limit,
          start
        }
      }

      // No query and no prefix -> return empty results cleanly without 400 error
      return { icons: [], total: 0, limit: 48, start: 0 }
    }

    const cleanQuery = rawQuery.slice(0, 100)
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '48'), 10) || 48))
    const start = Math.max(0, parseInt(String(query.start || '0'), 10) || 0)

    const cacheKey = `search:${cleanQuery}:${prefix || 'all'}:${limit}:${start}`
    const cached = getFromCache(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await coalesce(cacheKey, async () => {
      const params = new URLSearchParams({
        query: cleanQuery,
        limit: limit.toString(),
        start: start.toString(),
      })
      if (prefix) {
        params.set('prefix', prefix)
      }
      const upstreamRes = await fetch(`${ICONIFY_API_BASE}/search?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (!upstreamRes.ok) {
        throw createError({ statusCode: upstreamRes.status, statusMessage: 'Iconify API upstream error' })
      }
      return await upstreamRes.json()
    })

    setInCache(cacheKey, result, 60000) // 1 min TTL
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 2. Collections catalog: /api/v1/iconify/collections
  if (path === 'collections') {
    const cacheKey = 'collections:all'
    const cached = getFromCache(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await coalesce(cacheKey, async () => {
      const upstreamRes = await fetch(`${ICONIFY_API_BASE}/collections`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (!upstreamRes.ok) {
        throw createError({ statusCode: upstreamRes.status, statusMessage: 'Iconify API upstream error' })
      }
      return await upstreamRes.json()
    })

    setInCache(cacheKey, result, 3600000) // 1 hour TTL
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 3. Collection details: /api/v1/iconify/collections/:prefix
  if (path.startsWith('collections/')) {
    const rawPrefix = path.replace('collections/', '').trim().toLowerCase()
    if (!PREFIX_REGEX.test(rawPrefix)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid collection prefix format' })
    }

    const cacheKey = `collection:${rawPrefix}`
    const cached = getFromCache(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await coalesce(cacheKey, async () => {
      const upstreamRes = await fetch(`${ICONIFY_API_BASE}/collection?prefix=${encodeURIComponent(rawPrefix)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (!upstreamRes.ok) {
        throw createError({ statusCode: upstreamRes.status, statusMessage: 'Collection not found' })
      }
      return await upstreamRes.json()
    })

    setInCache(cacheKey, result, 3600000)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 4. Standalone SVG: /api/v1/iconify/:prefix/:name/svg
  const svgMatch = path.match(/^([^/]+)\/([^/]+)\/svg$/)
  if (svgMatch) {
    const prefix = svgMatch[1].trim().toLowerCase()
    const name = svgMatch[2].trim().toLowerCase()

    if (!PREFIX_REGEX.test(prefix) || !NAME_REGEX.test(name)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid icon identifier parameters' })
    }

    const color = query.color ? String(query.color).trim() : ''
    const size = query.size ? String(query.size).trim() : ''
    const isDownload = query.download === 'true' || query.download === '1'

    const cacheKey = `svg:${prefix}:${name}:${color || 'def'}:${size || 'def'}`
    let svgDoc = getFromCache<string>(cacheKey)

    if (!svgDoc) {
      svgDoc = await coalesce(cacheKey, async () => {
        const upstreamUrl = new URL(`${ICONIFY_API_BASE}/${prefix}/${name}.svg`)
        if (color && COLOR_REGEX.test(color)) {
          upstreamUrl.searchParams.set('color', color)
        }
        if (size && /^[0-9]+(px|em|rem|%)?$/.test(size)) {
          upstreamUrl.searchParams.set('width', size)
          upstreamUrl.searchParams.set('height', size)
        }

        const upstreamRes = await fetch(upstreamUrl.toString(), {
          signal: AbortSignal.timeout(6000),
        })
        if (!upstreamRes.ok) {
          throw createError({ statusCode: upstreamRes.status, statusMessage: 'Icon SVG not found' })
        }
        let rawSvg = await upstreamRes.text()

        // Sanitize dangerous content
        rawSvg = rawSvg
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
          .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
          .replace(/\s+href\s*=\s*["'](?:javascript|vbscript|data):[^"']*["']/gi, '')

        return rawSvg
      })

      if (svgDoc) {
        setInCache(cacheKey, svgDoc, 1800000) // 30 min TTL
      }
    }

    setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
    setHeader(event, 'cache-control', 'public, max-age=86400, s-maxage=86400')
    if (isDownload) {
      setHeader(event, 'content-disposition', `attachment; filename="${prefix}-${name}.svg"`)
    } else {
      setHeader(event, 'content-disposition', `inline; filename="${prefix}-${name}.svg"`)
    }
    return svgDoc
  }

  // 5. Icon data: /api/v1/iconify/:prefix/:name
  const iconMatch = path.match(/^([^/]+)\/([^/]+)$/)
  if (iconMatch) {
    const prefix = iconMatch[1].trim().toLowerCase()
    const name = iconMatch[2].trim().toLowerCase()

    if (!PREFIX_REGEX.test(prefix) || !NAME_REGEX.test(name)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid icon identifier parameters' })
    }

    const cacheKey = `icon_data:${prefix}:${name}`
    const cached = getFromCache(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await coalesce(cacheKey, async () => {
      const upstreamRes = await fetch(`${ICONIFY_API_BASE}/${prefix}.json?icons=${name}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (!upstreamRes.ok) {
        throw createError({ statusCode: upstreamRes.status, statusMessage: 'Icon data not found' })
      }
      return await upstreamRes.json()
    })

    setInCache(cacheKey, result, 1800000)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  throw createError({ statusCode: 404, statusMessage: `Endpoint /api/v1/iconify/${path} not found` })
})
