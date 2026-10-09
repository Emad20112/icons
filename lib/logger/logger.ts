export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: any
}

// Redact sensitive keys from logged objects
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'service_role_key',
  'authorization',
  'secret',
  'key'
])

function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData)
  }

  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof val === 'object') {
      sanitized[key] = sanitizeLogData(val)
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

class Logger {
  private format(level: LogLevel, message: string, context?: string, data?: any): string {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(data && { data: sanitizeLogData(data) })
    }
    return JSON.stringify(entry)
  }

  info(message: string, context?: string, data?: any): void {
    console.info(this.format('info', message, context, data))
  }

  warn(message: string, context?: string, data?: any): void {
    console.warn(this.format('warn', message, context, data))
  }

  error(message: string, context?: string, data?: any): void {
    console.error(this.format('error', message, context, data))
  }

  debug(message: string, context?: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, context, data))
    }
  }
}

export const logger = new Logger()
