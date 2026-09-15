import { defineConfig } from '@playwright/test'

const browserName = process.env.CMS_E2E_BROWSER || 'chromium'
if (browserName !== 'chromium' && browserName !== 'firefox' && browserName !== 'webkit') {
  throw new Error('CMS_E2E_BROWSER must be chromium, firefox, or webkit.')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'cms*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.CMS_E2E_BASE_URL,
    browserName,
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
