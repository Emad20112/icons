import type { FastifyPluginAsync } from 'fastify'
import { iconifyClient } from '../client/iconifyClient.js'
import { BoundedLruCache } from '../cache/lruCache.js'
import { requestCoalescer } from '../cache/requestCoalescer.js'
import { rateLimiter } from '../security/rateLimiter.js'
import { RequestValidator } from '../security/validator.js'
import { SvgSanitizer } from '../security/svgSanitizer.js'
import { config } from '../config/env.js'
import { metrics } from '../monitoring/metrics.js'

export const iconRoutes: FastifyPluginAsync = async (fastify) => {
  // Caches with bounded size and specific TTLs
  const searchCache = new BoundedLruCache({
    maxEntries: config.cacheMaxEntries,
    defaultTtlMs: config.searchCacheTtlMs,
  })

  const collectionsCache = new BoundedLruCache({
    maxEntries: 100,
    defaultTtlMs: config.collectionsCacheTtlMs,
  })

  const iconCache = new BoundedLruCache({
    maxEntries: config.cacheMaxEntries,
    defaultTtlMs: config.iconCacheTtlMs,
  })

  const svgCache = new BoundedLruCache<string>({
    maxEntries: config.cacheMaxEntries,
    defaultTtlMs: config.svgCacheTtlMs,
  })

  /**
   * Helper to resolve client IP
   */
  const getClientIp = (req: any): string => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    )
  }

  // 1. Search Icons
  fastify.get('/search', async (req, reply) => {
    const ip = getClientIp(req)
    rateLimiter.enforce(`search:${ip}`, config.searchRateLimit)
    metrics.recordRequest('search')

    const query = req.query as any
    const q = RequestValidator.validateSearchQuery(query.query || query.q)
    const { limit, start } = RequestValidator.validatePagination(query.limit, query.start)
    const prefix = query.prefix || query.collection ? RequestValidator.validatePrefix(query.prefix || query.collection) : undefined
    const category = query.category ? String(query.category).substring(0, 50) : undefined

    const cacheKey = `search:${q}:${prefix || 'all'}:${category || 'all'}:${limit}:${start}`

    if (config.cacheEnabled) {
      const cached = searchCache.get(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      metrics.recordUpstreamRequest()
      return await iconifyClient.search({
        query: q,
        limit,
        start,
        prefix,
        category,
      })
    })

    if (config.cacheEnabled) {
      searchCache.set(cacheKey, result)
    }

    reply.header('X-Cache', 'MISS')
    return result
  })

  // 2. Browse Collections
  fastify.get('/collections', async (req, reply) => {
    const ip = getClientIp(req)
    rateLimiter.enforce(`collections:${ip}`, config.collectionsRateLimit)
    metrics.recordRequest('collections')

    const query = req.query as any
    const prefixes = query.prefixes ? String(query.prefixes).split(',').map(p => p.trim()) : undefined
    const cacheKey = `collections:${prefixes ? prefixes.sort().join(',') : 'all'}`

    if (config.cacheEnabled) {
      const cached = collectionsCache.get(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      metrics.recordUpstreamRequest()
      return await iconifyClient.getCollections(prefixes)
    })

    if (config.cacheEnabled) {
      collectionsCache.set(cacheKey, result)
    }

    reply.header('X-Cache', 'MISS')
    return result
  })

  // 3. Collection Details
  fastify.get('/collections/:prefix', async (req, reply) => {
    const ip = getClientIp(req)
    rateLimiter.enforce(`collections:${ip}`, config.collectionsRateLimit)
    metrics.recordRequest('collection_details')

    const params = req.params as any
    const prefix = RequestValidator.validatePrefix(params.prefix)
    const cacheKey = `collection_meta:${prefix}`

    if (config.cacheEnabled) {
      const cached = collectionsCache.get(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      metrics.recordUpstreamRequest()
      return await iconifyClient.getCollectionDetails(prefix)
    })

    if (config.cacheEnabled) {
      collectionsCache.set(cacheKey, result)
    }

    reply.header('X-Cache', 'MISS')
    return result
  })

  // 4. Individual Icon Data
  fastify.get('/:prefix/:name', async (req, reply) => {
    const ip = getClientIp(req)
    rateLimiter.enforce(`icon:${ip}`, config.iconRateLimit)
    metrics.recordRequest('icon_data')

    const params = req.params as any
    const prefix = RequestValidator.validatePrefix(params.prefix)
    const name = RequestValidator.validateIconName(params.name)
    const cacheKey = `icon:${prefix}:${name}`

    if (config.cacheEnabled) {
      const cached = iconCache.get(cacheKey)
      if (cached) {
        reply.header('X-Cache', 'HIT')
        return cached
      }
    }

    const result = await requestCoalescer.execute(cacheKey, async () => {
      metrics.recordUpstreamRequest()
      return await iconifyClient.getIconData(prefix, name)
    })

    if (config.cacheEnabled) {
      iconCache.set(cacheKey, result)
    }

    reply.header('X-Cache', 'MISS')
    return result
  })

  // 5. Individual Icon SVG
  fastify.get('/:prefix/:name/svg', async (req, reply) => {
    const ip = getClientIp(req)
    rateLimiter.enforce(`svg:${ip}`, config.svgRateLimit)
    metrics.recordRequest('icon_svg')

    const params = req.params as any
    const query = req.query as any

    const prefix = RequestValidator.validatePrefix(params.prefix)
    const name = RequestValidator.validateIconName(params.name)
    const color = RequestValidator.validateColor(query.color)
    const size = RequestValidator.validateDimension(query.size)
    const customWidth = RequestValidator.validateDimension(query.width)
    const customHeight = RequestValidator.validateDimension(query.height)
    const isDownload = query.download === 'true' || query.download === '1'

    const cacheKey = `svg:${prefix}:${name}:${color || 'default'}:${size || 'auto'}:${customWidth || 'w'}:${customHeight || 'h'}`

    let svgDoc: string | undefined = undefined

    if (config.cacheEnabled) {
      svgDoc = svgCache.get(cacheKey)
    }

    if (!svgDoc) {
      svgDoc = await requestCoalescer.execute(cacheKey, async () => {
        // Retrieve raw icon data (cached or upstream)
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

      if (config.cacheEnabled && svgDoc) {
        svgCache.set(cacheKey, svgDoc)
      }
    }

    reply.header('Content-Type', 'image/svg+xml; charset=utf-8')
    reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')

    if (isDownload) {
      reply.header('Content-Disposition', `attachment; filename="${prefix}-${name}.svg"`)
    } else {
      reply.header('Content-Disposition', `inline; filename="${prefix}-${name}.svg"`)
    }

    return reply.send(svgDoc)
  })
}
