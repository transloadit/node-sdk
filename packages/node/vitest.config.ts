import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const utilsIndexPath = fileURLToPath(new URL('../utils/src/index.ts', import.meta.url))
const utilsNodePath = fileURLToPath(new URL('../utils/src/node.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@transloadit\/utils\/node$/, replacement: utilsNodePath },
      { find: /^@transloadit\/utils$/, replacement: utilsIndexPath },
    ],
  },
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/test/**', '**/alphalib/**', '**/cli/**'],
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
    testTimeout: 100000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'test/e2e/cli/test-utils.ts',
      'test/e2e/cli/OutputCtl.ts',
    ],
  },
})
