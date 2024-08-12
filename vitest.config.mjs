import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    target: 'node14',
    format: 'cjs',
  },
  test: {
    coverage: {
      include: 'src',
      reporter: ['json', 'lcov', 'text', 'clover', 'json-summary'],
    },
    globals: true,
  },
})
