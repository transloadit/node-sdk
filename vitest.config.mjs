import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: 'src',
      reporter: ['json', 'lcov', 'text', 'clover', 'json-summary'],
    },
    globals: true,
  },
})
