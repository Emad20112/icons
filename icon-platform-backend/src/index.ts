import { buildServer } from './server.js'
import { config } from './config/env.js'

async function main() {
  const server = await buildServer()

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}. Gracefully closing icon-platform-backend...`)
      try {
        await server.close()
        console.log('Server closed gracefully.')
        process.exit(0)
      } catch (err) {
        console.error('Error during shutdown:', err)
        process.exit(1)
      }
    })
  }

  try {
    await server.listen({
      port: config.port,
      host: config.host,
    })
    console.log(`🚀 Iconify Backend Service running at http://${config.host}:${config.port}`)
    console.log(`📦 Health endpoint: http://${config.host}:${config.port}/health`)
    console.log(`🔍 Icons API: http://${config.host}:${config.port}/api/v1/icons/search`)
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  main()
}
