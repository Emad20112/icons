export class MetricsCollector {
  private totalRequests = 0
  private upstreamRequests = 0
  private upstreamErrors = 0
  private upstreamRateLimits = 0
  private rateLimitViolations = 0
  private endpointCounters: Record<string, number> = {}
  private latencies: number[] = []
  private readonly startTime = Date.now()

  public recordRequest(endpoint: string): void {
    this.totalRequests++
    this.endpointCounters[endpoint] = (this.endpointCounters[endpoint] || 0) + 1
  }

  public recordUpstreamRequest(): void {
    this.upstreamRequests++
  }

  public recordUpstreamError(isRateLimit = false): void {
    this.upstreamErrors++
    if (isRateLimit) {
      this.upstreamRateLimits++
    }
  }

  public recordRateLimitViolation(): void {
    this.rateLimitViolations++
  }

  public recordLatency(ms: number): void {
    this.latencies.push(ms)
    // Keep sliding sample of last 200 requests
    if (this.latencies.length > 200) {
      this.latencies.shift()
    }
  }

  public getSummary() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000)
    const avgLatencyMs =
      this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      upstreamRequests: this.upstreamRequests,
      upstreamErrors: this.upstreamErrors,
      upstreamRateLimits: this.upstreamRateLimits,
      rateLimitViolations: this.rateLimitViolations,
      avgLatencyMs,
      endpointCounters: { ...this.endpointCounters },
    }
  }
}

export const metrics = new MetricsCollector()
