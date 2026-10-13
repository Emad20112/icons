import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, './'),
      // h3 ships inside the pnpm store rather than the hoisted root, so tests
      // that exercise Nitro helpers (getHeader/getCookie) need an explicit path.
      h3: path.resolve(__dirname, 'node_modules/.pnpm/h3@1.15.11/node_modules/h3'),
    },
  },
})
