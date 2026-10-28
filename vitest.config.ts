import { defineConfig } from 'vitest/config'
import path from 'path'
import fs from 'fs'

const pnpmH3 = path.resolve(__dirname, 'node_modules/.pnpm/h3@1.15.11/node_modules/h3')
const standardH3 = path.resolve(__dirname, 'node_modules/h3')
const h3Path = fs.existsSync(pnpmH3) ? pnpmH3 : standardH3

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, './'),
      h3: h3Path,
    },
  },
})
