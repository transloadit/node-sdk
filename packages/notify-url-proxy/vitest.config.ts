import { defineConfig } from 'vitest/config'

const includeRealE2E = process.env.RUN_REAL_E2E === '1'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: includeRealE2E ? [] : ['test/real.e2e.test.ts'],
  },
})
