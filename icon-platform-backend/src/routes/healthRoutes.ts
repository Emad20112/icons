import type { FastifyPluginAsync } from 'fastify'
import { metrics } from '../monitoring/metrics.js'
import { iconifyClient } from '../client/iconifyClient.js'
import { rateLimiter } from '../security/rateLimiter.js'

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = async (_req: any, reply: any) => {
    const circuitState = iconifyClient.circuitBreaker.getState()
    const summary = metrics.getSummary()

    const isHealthy = circuitState !== 'OPEN'
    const status = isHealthy ? 'healthy' : 'degraded'

    reply.status(isHealthy ? 200 : 503)

    return {
      status,
      timestamp: new Date().toISOString(),
      service: 'icon-platform-backend',
      version: '1.0.0',
      circuitBreaker: {
        state: circuitState,
        failures: iconifyClient.circuitBreaker.getFailureCount(),
      },
      rateLimiter: {
        activeKeys: rateLimiter.getActiveKeysCount(),
      },
      metrics: summary,
    }
  }

  fastify.get('/health', handler)
  fastify.get('/api/v1/health', handler)
}
