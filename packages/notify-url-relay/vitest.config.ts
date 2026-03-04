import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const includeRealE2E = process.env.RUN_REAL_E2E === '1'
const transloaditPath = fileURLToPath(new URL('../node/src/Transloadit.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [{ find: /^transloadit$/, replacement: transloaditPath }],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: includeRealE2E ? [] : ['test/real.e2e.test.ts'],
  },
})
