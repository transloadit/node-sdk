import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/test/**'],
      reporter: ['json', 'lcov', 'text', 'clover', 'json-summary', 'html'],
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: true,
      },
      clean: true,
      reportsDirectory: './coverage',
    },
    globals: true,
    environment: 'node',
  },
})
