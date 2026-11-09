export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean
  public readonly details?: any

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class RateLimitExceededError extends AppError {
  public readonly retryAfterSeconds: number

  constructor(message = 'Rate limit exceeded, please retry later', retryAfterSeconds = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds })
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class UpstreamServiceError extends AppError {
  constructor(message = 'Upstream service error from Iconify API', statusCode = 502) {
    super(message, statusCode, 'UPSTREAM_SERVICE_ERROR')
  }
}

export class CircuitBreakerOpenError extends AppError {
  constructor(message = 'Upstream service is currently unavailable. Circuit breaker is OPEN.') {
    super(message, 503, 'CIRCUIT_BREAKER_OPEN')
  }
}
