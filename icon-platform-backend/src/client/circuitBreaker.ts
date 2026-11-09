import { CircuitBreakerOpenError } from '../errors/AppError.js'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number
  resetTimeoutMs?: number
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private lastFailureTime = 0
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeoutMs = options.resetTimeoutMs || 30000 // 30s
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now()
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN'
      }
    }
    return this.state
  }

  public getFailureCount(): number {
    return this.failureCount
  }

  public recordSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  public recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  public reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = 0
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState()

    if (currentState === 'OPEN') {
      throw new CircuitBreakerOpenError(
        `Upstream service circuit breaker is OPEN due to ${this.failureCount} consecutive failures. Retry after reset window.`
      )
    }

    try {
      const result = await action()
      this.recordSuccess()
      return result
    } catch (err: any) {
      this.recordFailure()
      throw err
    }
  }
}
