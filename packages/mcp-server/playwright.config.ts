import { defineConfig } from '@playwright/test'

import { hostOrigin } from './test/visual/host.ts'

// Baselines are rendered in the official Playwright image (see `test:visual:docker`), so they do
// not depend on the fonts of whoever regenerates them; hence no platform suffix in their names.
export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: '../../test-results/mcp-widget-visual',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  retries: 0,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  testDir: 'test/visual',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  use: {
    baseURL: hostOrigin,
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    viewport: { width: 860, height: 900 },
  },
})
