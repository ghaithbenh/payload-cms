import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@payload-config': path.resolve(__dirname, 'payload.config.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      PAYLOAD_SECRET: 'test-secret-for-unit-tests',
      DATABASE_URL: 'mongodb://localhost:27017/test',
    },
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'app/api/**'],
      exclude: ['lib/__tests__'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
})
