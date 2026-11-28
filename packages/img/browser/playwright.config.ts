import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  outputDir: '../../../test-results/viewer-documents',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  use: { viewport: { width: 390, height: 844 } },
})
