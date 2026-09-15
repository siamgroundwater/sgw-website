import { test, expect, type Page } from '@playwright/test'

async function clipboard(page: Page, primary: 'success' | 'denied' | 'missing', fallback: 'success' | 'false' | 'throw') {
  await page.addInitScript(({ primary, fallback }) => {
    const observations: { values: string[]; fallbackCalls: number } = { values: [], fallbackCalls: 0 }
    Object.assign(window, { __contactClipboard: observations })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: primary === 'missing' ? undefined : {
        writeText: async (value: string) => {
          if (primary === 'denied') throw new DOMException('Clipboard denied', 'NotAllowedError')
          observations.values.push(value)
        },
      },
    })
    document.execCommand = command => {
      if (command !== 'copy') return false
      observations.fallbackCalls += 1
      if (fallback === 'throw') throw new Error('Clipboard unavailable')
      if (fallback === 'false') return false
      observations.values.push((document.activeElement as HTMLTextAreaElement).value)
      return true
    }
  }, { primary, fallback })
}

async function openContact(page: Page, path = '/en/contact') {
  // The map is unrelated to clipboard behavior and should not require a third-party service.
  await page.route('https://www.openstreetmap.org/**', route => route.fulfill({ status: 200, body: '<html><body>Map stub</body></html>', contentType: 'text/html' }))
  await page.goto(path)
  await expect(page.locator('.contact-copy-button').first()).toBeVisible()
}

test('contact copy reports success only after the native clipboard accepts the exact value', async ({ page }) => {
  await clipboard(page, 'success', 'throw')
  await openContact(page)
  const copy = page.locator('.contact-card').filter({ has: page.locator('a[href="mailto:sgw_th@outlook.com"]') }).getByRole('button')
  await copy.click()
  await expect(copy).toHaveClass(/is-copied/)
  const state = await page.evaluate(() => (window as any).__contactClipboard)
  expect(state.values).toEqual(['sgw_th@outlook.com'])
  expect(state.fallbackCalls).toBe(0)
  await expect(copy).not.toHaveClass(/is-copied/, { timeout: 4000 })
})

test('contact copy uses the fallback when the modern API is missing', async ({ page }) => {
  await clipboard(page, 'missing', 'success')
  await openContact(page)
  const copy = page.locator('.contact-copy-button').first()
  await copy.click()
  await expect(copy).toHaveClass(/is-copied/)
  expect(await page.evaluate(() => (window as any).__contactClipboard)).toEqual({ values: ['0-2735-0789'], fallbackCalls: 1 })
  await expect(page.locator('textarea')).toHaveCount(0)
})

for (const fallback of ['false', 'throw'] as const) {
  test(`contact copy does not claim success or leak a textarea when both clipboard methods fail (${fallback})`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await clipboard(page, 'denied', fallback)
    await openContact(page)
    const copy = page.locator('.contact-copy-button').first()
    await copy.click()
    // A visible actionable error is important; silently doing nothing is also a bug.
    await expect(page.locator('.contact-main').getByRole('alert')).toContainText(/copy|select/i)
    await expect(copy).not.toHaveClass(/is-copied/)
    await expect(page.locator('textarea')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('address copy failure is announced and can be retried successfully', async ({ page }) => {
  await clipboard(page, 'denied', 'false')
  await openContact(page)
  const copy = page.locator('.contact-map-address button')
  await copy.click()
  await expect(page.locator('.contact-main').getByRole('alert')).toBeVisible()
  await expect(copy).not.toHaveClass(/is-copied/)
  await page.evaluate(() => { navigator.clipboard.writeText = async () => {} })
  await copy.click()
  await expect(copy).toHaveClass(/is-copied/)
  await expect(page.locator('.contact-main').getByRole('alert')).toHaveCount(0)
})
