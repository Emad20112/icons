import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { config } from './config/env.js'
import { iconRoutes } from './routes/iconRoutes.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { AppError } from './errors/AppError.js'
import { metrics } from './monitoring/metrics.js'

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: config.nodeEnv === 'development' ? { level: 'info' } : { level: 'warn' },
    trustProxy: true,
  })

  // Security Headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  })

  // CORS Configuration
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return cb(null, true)

      if (
        config.nodeEnv === 'development' ||
        origin === config.frontendOrigin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost')
      ) {
        return cb(null, true)
      }

      return cb(new Error('Not allowed by CORS policy'), false)
    },
    methods: ['GET', 'HEAD', 'OPTIONS'],
    credentials: true,
  })

  // Request Latency & Metrics Hook
  server.addHook('onRequest', async (req) => {
    (req as any).startTime = Date.now()
  })

  server.addHook('onResponse', async (req, reply) => {
    const startTime = (req as any).startTime
    if (startTime) {
      const duration = Date.now() - startTime
      metrics.recordLatency(duration)
    }

    if (reply.statusCode === 429) {
      metrics.recordRateLimitViolation()
    }
  })

  // Centralized Structured Error Handler
  server.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode === 429) {
        reply.header('Retry-After', (error as any).retryAfterSeconds || 60)
      }

      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details || null,
        },
      })
    }

    // Fastify native validation or schema errors
    if ((error as any).validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
      })
    }

    req.log.error(error)

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.nodeEnv === 'production' ? 'An unexpected internal error occurred' : error.message,
        statusCode: 500,
      },
    })
  })

  // Register Routes
  await server.register(healthRoutes)
  await server.register(iconRoutes, { prefix: '/api/v1/icons' })

  return server
}
