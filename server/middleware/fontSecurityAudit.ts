import { defineEventHandler, getRequestHeader, createError } from 'h3'

const downloadRateLimits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_DOWNLOADS_PER_WINDOW = 60 // 60 downloads per minute

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''

  // Only apply rate-limiting to font download endpoints
  if (url.includes('/api/v1/fonts/') && url.includes('/download')) {
    const ip = getRequestHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress || 'unknown'
    const now = Date.now()

    let record = downloadRateLimits.get(ip)
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + WINDOW_MS }
      downloadRateLimits.set(ip, record)
    } else {
      record.count++
      if (record.count > MAX_DOWNLOADS_PER_WINDOW) {
        throw createError({
          statusCode: 429,
          statusMessage: 'Too Many Requests',
          message: 'Font download rate limit exceeded. Please wait a moment before downloading more font files.',
        })
      }
    }
  }
})
