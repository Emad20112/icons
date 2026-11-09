export class RequestCoalescer {
  private readonly inFlight: Map<string, Promise<any>> = new Map()
  private coalescedHits = 0

  /**
   * Executes an asynchronous task, coalescing duplicate concurrent invocations
   * sharing the same key onto a single underlying promise.
   */
  public async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key)
    if (existing) {
      this.coalescedHits++
      return existing as Promise<T>
    }

    const promise = fn()
      .then((res) => {
        this.inFlight.delete(key)
        return res
      })
      .catch((err) => {
        this.inFlight.delete(key)
        throw err
      })

    this.inFlight.set(key, promise)
    return promise
  }

  public getInFlightCount(): number {
    return this.inFlight.size
  }

  public getCoalescedHits(): number {
    return this.coalescedHits
  }

  public clear(): void {
    this.inFlight.clear()
    this.coalescedHits = 0
  }
}

export const requestCoalescer = new RequestCoalescer()
