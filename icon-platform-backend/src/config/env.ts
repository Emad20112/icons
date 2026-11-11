export interface AppConfig {
  port: number
  host: string
  nodeEnv: string
  frontendOrigin: string
  iconifyApiBaseUrl: string
  iconifyApiFallbackUrl: string
  upstreamTimeoutMs: number
  maxUpstreamConcurrency: number
  searchRateLimit: number
  collectionsRateLimit: number
  iconRateLimit: number
  svgRateLimit: number
  globalUpstreamRateLimit: number
  cacheEnabled: boolean
  cacheMaxEntries: number
  searchCacheTtlMs: number
  collectionsCacheTtlMs: number
  iconCacheTtlMs: number
  svgCacheTtlMs: number
  circuitBreakerFailThreshold: number
  circuitBreakerResetTimeoutMs: number
}

export function loadConfig(env = process.env): AppConfig {
  return {
    port: parseInt(env.PORT || '4000', 10),
    host: env.HOST || '0.0.0.0',
    nodeEnv: env.NODE_ENV || 'development',
    frontendOrigin: env.FRONTEND_ORIGIN || 'http://localhost:3000',
    iconifyApiBaseUrl: env.ICONIFY_API_BASE_URL || 'https://api.iconify.design',
    iconifyApiFallbackUrl: env.ICONIFY_API_FALLBACK_URL || 'https://api.simplesvg.com',
    upstreamTimeoutMs: parseInt(env.UPSTREAM_TIMEOUT_MS || '8000', 10),
    maxUpstreamConcurrency: parseInt(env.MAX_UPSTREAM_CONCURRENCY || '50', 10),
    searchRateLimit: parseInt(env.SEARCH_RATE_LIMIT || '20', 10),
    collectionsRateLimit: parseInt(env.COLLECTIONS_RATE_LIMIT || '30', 10),
    iconRateLimit: parseInt(env.ICON_RATE_LIMIT || '60', 10),
    svgRateLimit: parseInt(env.SVG_RATE_LIMIT || '45', 10),
    globalUpstreamRateLimit: parseInt(env.GLOBAL_UPSTREAM_RATE_LIMIT || '200', 10),
    cacheEnabled: env.CACHE_ENABLED !== 'false',
    cacheMaxEntries: parseInt(env.CACHE_MAX_ENTRIES || '5000', 10),
    searchCacheTtlMs: parseInt(env.SEARCH_CACHE_TTL_MS || '120000', 10), // 2 mins
    collectionsCacheTtlMs: parseInt(env.COLLECTIONS_CACHE_TTL_MS || '3600000', 10), // 1 hour
    iconCacheTtlMs: parseInt(env.ICON_CACHE_TTL_MS || '600000', 10), // 10 mins
    svgCacheTtlMs: parseInt(env.SVG_CACHE_TTL_MS || '600000', 10), // 10 mins
    circuitBreakerFailThreshold: parseInt(env.CIRCUIT_BREAKER_FAIL_THRESHOLD || '5', 10),
    circuitBreakerResetTimeoutMs: parseInt(env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '30000', 10),
  }
}

export const config = loadConfig()
