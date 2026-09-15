import { defineConfig } from '@playwright/test'

// Use an already running production build. This suite never starts or rebuilds
// Next.js, and its browser contexts block every non-read HTTP request.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['compatibility.spec.ts', 'contact-details-resilience.spec.ts'],
  outputDir: './test-results/compatibility',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/compatibility' }],
  ],
  use: {
    baseURL: process.env.COMPATIBILITY_E2E_BASE_URL || 'http://127.0.0.1:3115',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1280, height: 900 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1280, height: 900 } } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    // Playwright does not support isMobile in Firefox. This is a narrow-window
    // layout/keyboard check, not a claim to emulate Firefox on a mobile device.
    { name: 'firefox-narrow', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
