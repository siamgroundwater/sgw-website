import { defineConfig } from '@playwright/test'

// Run against an already running local server; these checks never sign in or write data.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'contact-fab.spec.ts',
  outputDir: './test-results/contact-fab/artifacts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.CONTACT_E2E_BASE_URL || 'http://localhost:3000',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
