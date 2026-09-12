import { resolve } from 'node:path'

import { defineConfig } from '@playwright/test'

const outputDir = process.env.IMG_FIXTURE_OUTPUT_DIR ?? 'test-results'

export default defineConfig({
  forbidOnly: true,
  outputDir,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  reporter: [['list'], ['json', { outputFile: resolve(outputDir, 'results.json') }]],
  retries: 0,
  testMatch: 'browser.spec.ts',
  timeout: 45_000,
  use: {
    baseURL: process.env.IMG_FIXTURE_BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  workers: 1,
})
