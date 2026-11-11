import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../src/server.js'
import type { FastifyInstance } from 'fastify'

describe('Backend HTTP Routes & Injections', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('GET /health returns 200 OK and health payload', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/health',
    })

    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.status).toBe('healthy')
    expect(json.service).toBe('icon-platform-backend')
    expect(json.circuitBreaker.state).toBe('CLOSED')
  })

  it('GET /api/v1/health returns detailed metrics', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/health',
    })

    expect(res.statusCode).toBe(200)
    const json = JSON.parse(res.body)
    expect(json.metrics).toBeDefined()
    expect(json.rateLimiter).toBeDefined()
  })

  it('GET /api/v1/icons/search validates query and rejects missing parameter', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/icons/search',
    })

    expect(res.statusCode).toBe(400)
    const json = JSON.parse(res.body)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('GET /api/v1/icons/:prefix/:name rejects path traversal in prefix', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/icons/..%2f..%2fetc/home',
    })

    expect(res.statusCode).toBe(400)
    const json = JSON.parse(res.body)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })
})
