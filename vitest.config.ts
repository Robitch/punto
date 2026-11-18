import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Same alias as Nuxt.
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
