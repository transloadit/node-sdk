import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/test/**', '**/alphalib/**'],
      reporter: ['json', 'lcov', 'text', 'clover', 'json-summary', 'html'],
      provider: 'v8',
      thresholds: {
        // We want to boost this to 80%, but that should happen in a separate PR
        statements: 2,
        branches: 2,
        functions: 0,
        lines: 2,
        perFile: true,
      },
    },
    globals: true,
  },
})
