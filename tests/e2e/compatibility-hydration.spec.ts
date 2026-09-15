import { expect, test } from '@playwright/test'

test('search retains early input or disables editing while application JavaScript is delayed', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  let releaseScripts!: () => void
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve })
  let delayedScripts = 0
  await context.route('**/*', async route => {
    const request = route.request()
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort('blockedbyclient')
    if (request.resourceType() === 'script' && new URL(request.url()).pathname.startsWith('/_next/static/')) {
      delayedScripts += 1
      await scriptsReady
    }
    return route.continue()
  })
  try {
    // Controlled slow-script delivery exposes SSR input before event handlers
    // attach; this test does not rely on machine speed or a guessed sleep.
    await page.goto('/en/groundwater-learning', { waitUntil: 'commit' })
    const input = page.locator('#learning-search-input')
    await expect(input).toBeVisible()
    expect(delayedScripts).toBeGreaterThan(0)
    const acceptsEarlyInput = await input.isEnabled()
    if (acceptsEarlyInput) await input.fill('TDS')
    releaseScripts()
    await page.waitForLoadState('networkidle')
    await expect(input).toBeEnabled()
    // Disabling the input until ready is also a valid implementation.
    if (!acceptsEarlyInput) await input.fill('TDS')
    await expect(input).toHaveValue('TDS')
    await expect(page.locator('.learning-search-result[href="/en/learn/groundwater-faq-thailand#faq-clear-water-safe"]')).toBeVisible()
    await expect(page.locator('#learning-search-status')).toContainText('results')
    expect(errors, 'Early editing must not cause a browser error.').toEqual([])
  } finally {
    releaseScripts()
  }
})
