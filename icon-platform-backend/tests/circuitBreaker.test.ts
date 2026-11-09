import { describe, it, expect } from 'vitest'
import { CircuitBreaker } from '../src/client/circuitBreaker.js'
import { CircuitBreakerOpenError } from '../src/errors/AppError.js'

describe('CircuitBreaker Pattern', () => {
  it('starts in CLOSED state and allows successful calls', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 })
    expect(cb.getState()).toBe('CLOSED')

    const res = await cb.execute(async () => 'OK')
    expect(res).toBe('OK')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('trips to OPEN state after reaching failure threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 })

    await expect(cb.execute(async () => { throw new Error('fail 1') })).rejects.toThrow('fail 1')
    expect(cb.getState()).toBe('CLOSED')

    await expect(cb.execute(async () => { throw new Error('fail 2') })).rejects.toThrow('fail 2')
    expect(cb.getState()).toBe('OPEN')

    // Third call must immediately fail with CircuitBreakerOpenError without invoking the action
    let invoked = false
    await expect(cb.execute(async () => {
      invoked = true
      return 'should not run'
    })).rejects.toThrow(CircuitBreakerOpenError)

    expect(invoked).toBe(false)
  })

  it('transitions to HALF_OPEN after reset window and resets on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 40 })

    await expect(cb.execute(async () => { throw new Error('boom') })).rejects.toThrow()
    expect(cb.getState()).toBe('OPEN')

    await new Promise((res) => setTimeout(res, 50))

    expect(cb.getState()).toBe('HALF_OPEN')

    // Successful test invocation closes the circuit
    const res = await cb.execute(async () => 'recovered')
    expect(res).toBe('recovered')
    expect(cb.getState()).toBe('CLOSED')
  })
})
