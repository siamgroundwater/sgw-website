import { defineConfig } from '@playwright/test'

const externalBase = process.env.LEARNING_E2E_BASE_URL
const baseURL = externalBase || 'http://127.0.0.1:3005'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'learning.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'touch', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: externalBase ? undefined : {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3005',
    url: `${baseURL}/groundwater-learning`,
    reuseExistingServer: false,
    timeout: 45_000,
  },
})
