import { defineEventHandler, getQuery, createError, setHeader, setResponseStatus } from 'h3'
import { SvgSanitizer } from '../../../icon-platform-backend/src/security/svgSanitizer'
import { RequestValidator } from '../../../icon-platform-backend/src/security/validator'
import { iconifyClient } from '../../../icon-platform-backend/src/client/iconifyClient'
import { BoundedLruCache } from '../../../icon-platform-backend/src/cache/lruCache'
import { requestCoalescer } from '../../../icon-platform-backend/src/cache/requestCoalescer'
import { rateLimiter } from '../../../icon-platform-backend/src/security/rateLimiter'

// In-process caches for local proxy mode
const proxySearchCache = new BoundedLruCache({ maxEntries: 2000, defaultTtlMs: 120000 })
const proxyCollectionsCache = new BoundedLruCache({ maxEntries: 100, defaultTtlMs: 3600000 })
const proxyIconCache = new BoundedLruCache({ maxEntries: 2000, defaultTtlMs: 600000 })
const proxySvgCache = new BoundedLruCache<string>({ maxEntries: 2000, defaultTtlMs: 600000 })

export default defineEventHandler(async (event) => {
  const path = event.context.params?.path || ''
  const query = getQuery(event)
  const clientIp = (event.node.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || event.node.req.socket.remoteAddress || '127.0.0.1'

  // If external backend URL is configured via environment, proxy directly to it
  const remoteBackendUrl = process.env.ICONIFY_BACKEND_URL || process.env.VITE_ICONIFY_BACKEND_URL
  if (remoteBackendUrl) {
    const cleanRemote = remoteBackendUrl.replace(/\/+$/, '')
    const targetUrl = `${cleanRemote}/api/v1/icons/${path}${event.node.req.url?.includes('?') ? '?' + event.node.req.url.split('?')[1] : ''}`
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'x-forwarded-for': clientIp,
          'Accept': event.node.req.headers['accept'] || 'application/json',
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

  // --- In-Process High-Performance Engine (Identical logic to icon-platform-backend) ---

  // 1. Search: /api/v1/iconify/search
  if (path === 'search') {
    rateLimiter.enforce(`proxy_search:${clientIp}`, 30)
    const q = RequestValidator.validateSearchQuery(query.query || query.q)
    const { limit, start } = RequestValidator.validatePagination(query.limit, query.start)
    const prefix = query.prefix || query.collection ? RequestValidator.validatePrefix(String(query.prefix || query.collection)) : undefined
    const category = query.category ? String(query.category).substring(0, 50) : undefined

    const cacheKey = `search:${q}:${prefix || 'all'}:${category || 'all'}:${limit}:${start}`
    const cached = proxySearchCache.get(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      return await iconifyClient.search({ query: q, limit, start, prefix, category })
    })

    proxySearchCache.set(cacheKey, result)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 2. Collections: /api/v1/iconify/collections
  if (path === 'collections') {
    rateLimiter.enforce(`proxy_collections:${clientIp}`, 40)
    const prefixes = query.prefixes ? String(query.prefixes).split(',').map(p => p.trim()) : undefined
    const cacheKey = `collections:${prefixes ? prefixes.sort().join(',') : 'all'}`

    const cached = proxyCollectionsCache.get(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      return await iconifyClient.getCollections(prefixes)
    })

    proxyCollectionsCache.set(cacheKey, result)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 3. Collection details: /api/v1/iconify/collections/:prefix
  if (path.startsWith('collections/')) {
    const prefix = path.replace('collections/', '')
    rateLimiter.enforce(`proxy_collections:${clientIp}`, 40)
    const cleanPrefix = RequestValidator.validatePrefix(prefix)
    const cacheKey = `collection_meta:${cleanPrefix}`

    const cached = proxyCollectionsCache.get(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      return await iconifyClient.getCollectionDetails(cleanPrefix)
    })

    proxyCollectionsCache.set(cacheKey, result)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  // 4. Standalone SVG: /api/v1/iconify/:prefix/:name/svg
  const svgMatch = path.match(/^([^/]+)\/([^/]+)\/svg$/)
  if (svgMatch) {
    const prefix = RequestValidator.validatePrefix(svgMatch[1])
    const name = RequestValidator.validateIconName(svgMatch[2])
    const color = RequestValidator.validateColor(query.color)
    const size = RequestValidator.validateDimension(query.size)
    const customWidth = RequestValidator.validateDimension(query.width)
    const customHeight = RequestValidator.validateDimension(query.height)
    const isDownload = query.download === 'true' || query.download === '1'

    rateLimiter.enforce(`proxy_svg:${clientIp}`, 60)
    const cacheKey = `svg:${prefix}:${name}:${color || 'def'}:${size || 'auto'}:${customWidth || 'w'}:${customHeight || 'h'}`

    let svgDoc = proxySvgCache.get(cacheKey)
    if (!svgDoc) {
      svgDoc = await requestCoalescer.execute(cacheKey, async () => {
        const iconData = await iconifyClient.getIconData(prefix, name)
        return SvgSanitizer.buildSvg({
          body: iconData.body,
          width: iconData.width,
          height: iconData.height,
          left: iconData.left,
          top: iconData.top,
          color,
          size,
          customWidth,
          customHeight,
        })
      })
      if (svgDoc) {
        proxySvgCache.set(cacheKey, svgDoc)
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
    const prefix = RequestValidator.validatePrefix(iconMatch[1])
    const name = RequestValidator.validateIconName(iconMatch[2])

    rateLimiter.enforce(`proxy_icon:${clientIp}`, 80)
    const cacheKey = `icon:${prefix}:${name}`

    const cached = proxyIconCache.get(cacheKey)
    if (cached) {
      setHeader(event, 'x-cache', 'HIT')
      return cached
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      return await iconifyClient.getIconData(prefix, name)
    })

    proxyIconCache.set(cacheKey, result)
    setHeader(event, 'x-cache', 'MISS')
    return result
  }

  throw createError({ statusCode: 404, statusMessage: `Endpoint /api/v1/iconify/${path} not found` })
})
