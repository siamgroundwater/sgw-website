import { expect, test, type Page } from '@playwright/test'

const hubPath = '/en/groundwater-learning'
const calculatorPath = '/en/learn/groundwater-calculator-tools'
const basicsPath = '/en/learn/groundwater-basics-thailand'
const progressKey = 'sgw:learning-progress:basics:v1'
const runtimeErrors = new WeakMap<Page, string[]>()
const nativeErrors = new WeakMap<Page, string[]>()
const resourceDiagnostics = new WeakMap<Page, string[]>()
const blockedWrites = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page, context, browserName, baseURL }) => {
  const errors: string[] = []
  const uncaught: string[] = []
  const diagnostics: string[] = []
  const writes: string[] = []
  runtimeErrors.set(page, errors)
  nativeErrors.set(page, uncaught)
  resourceDiagnostics.set(page, diagnostics)
  blockedWrites.set(page, writes)
  const origin = new URL(baseURL!).origin
  const watch = (openedPage: Page) => openedPage.on('pageerror', error => {
    // WebKit reports canceled same-origin Next prefetch resource diagnostics as
    // pageerror. Preserve those messages, and independently check real window
    // errors/unhandled rejections below. Every other pageerror still fails.
    const match = /^Fetch API cannot load (https?:\/\/\S+) due to access control checks\.(?:\n|$)/.exec(error.stack || '')
    if (browserName === 'webkit' && match) {
      const url = new URL(match[1])
      if (url.origin === origin && url.searchParams.get('_rsc')) {
        diagnostics.push(error.stack || error.message)
        return
      }
    }
    errors.push(error.message)
  })
  watch(page)
  context.on('page', watch)
  await context.exposeBinding('__compatibilityRuntimeError', (_source, error: string) => { uncaught.push(error) })
  await context.addInitScript(() => {
    const report = (window as typeof window & { __compatibilityRuntimeError: (message: string) => Promise<void> }).__compatibilityRuntimeError
    window.addEventListener('error', event => {
      if (event instanceof ErrorEvent) void report(`window error: ${event.message}`)
    })
    window.addEventListener('unhandledrejection', event => { void report(`unhandled rejection: ${String(event.reason)}`) })
  })
  await context.route('**/*', route => {
    const request = route.request()
    if (['GET', 'HEAD'].includes(request.method())) return route.continue()
    // Include method/path only: query strings or request bodies could contain
    // contact information. An unintended write is blocked and fails the test.
    writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort('blockedbyclient')
  })
})

test.afterEach(async ({ page }, testInfo) => {
  const diagnostics = resourceDiagnostics.get(page) || []
  if (diagnostics.length) await testInfo.attach('webkit-prefetch-resource-diagnostics', {
    body: Buffer.from(JSON.stringify(diagnostics, null, 2)),
    contentType: 'application/json',
  })
  expect(nativeErrors.get(page) || [], 'No window errors or unhandled promise rejections.').toEqual([])
  expect(runtimeErrors.get(page) || [], 'No uncaught browser errors during the complete workflow.').toEqual([])
  expect(blockedWrites.get(page) || [], 'Public reading workflows must not submit contact or CMS data.').toEqual([])
})

async function openPage(page: Page, path: string) {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
  // loading.tsx can make the final page exist temporarily in a hidden streaming
  // container. Wait for displayed content before geometry or interaction checks.
  await expect(page.locator('main h1').first()).toBeVisible()
  await expect(page.locator('main h1').first()).not.toBeEmpty()
  // This suite compares hydrated interactions across browser engines. Early
  // typing is tested separately in compatibility-hydration.spec.ts so waiting
  // for application scripts here cannot silently erase that regression.
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.documentElement.clientWidth,
  )), { message: 'Displayed content must stay within the viewport after interaction or resizing.' })
    .toBeLessThanOrEqual(1)
}

test('navigation supports keyboard dismissal, mobile resizing and service locale changes', async ({ page }) => {
  await openPage(page, '/en/services/survey')
  const narrow = page.viewportSize()!.width <= 1024
  if (narrow) {
    const toggle = page.locator('.navbar-mobile-toggle')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.navbar-mobile-close')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
    await toggle.click()
    await page.locator('.navbar-mobile-drawer a[href="/en/about"]').click()
    await expect(page).toHaveURL(/\/en\/about$/)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(toggle).toBeVisible()
  } else {
    const services = page.locator('.navbar-item').filter({ has: page.locator('.navbar-link[href="/en/services"]') })
    await services.locator('.navbar-link').focus()
    await expect(services.locator('.navbar-subnav')).toBeVisible()
    const link = services.locator('.navbar-subnav-link[href="/en/services/drilling"]')
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/en\/services\/drilling$/)
    await expect(services.locator('.navbar-subnav')).toBeHidden()
  }

  await openPage(page, '/en/services/survey')
  const navigation = page.locator(narrow ? '.navbar-mobile' : '.navbar')
  const language = navigation.locator(narrow ? '.navbar-mobile-lang-btn' : '.navbar-lang-btn')
  await language.click()
  await expect(language).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(language).toHaveAttribute('aria-expanded', 'false')
  await language.click()
  await navigation.locator('[role="menuitem"][hreflang="ja"]').click()
  await expect(page).toHaveURL(/\/ja\/services\/survey$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
  await expect(page.locator('main h1')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('learning search opens the exact FAQ answer and survives reload and history navigation', async ({ page }) => {
  await openPage(page, hubPath)
  await page.locator('#learning-search-input').fill('TDS')
  const answer = page.locator('.learning-search-result[href="/en/learn/groundwater-faq-thailand#faq-clear-water-safe"]')
  await expect(answer).toBeVisible()
  await answer.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/en\/learn\/groundwater-faq-thailand#faq-clear-water-safe$/)
  const question = page.locator('#faq-clear-water-safe .gwf-question')
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  // Opening a shared URL scrolls to the answer without taking keyboard focus.
  // Focus is moved only by the FAQ's own recommended-answer controls.
  await expect(question).toBeInViewport()
  await page.reload()
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  await expect(question).toBeInViewport()
  await page.goBack()
  await expect(page).toHaveURL(/\/en\/groundwater-learning$/)
  const search = page.locator('#learning-search-input')
  await search.fill('no-matching-groundwater-answer-xyz')
  await expect(page.locator('.learning-search-empty')).toBeVisible()
  await page.locator('.learning-search-empty button').click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(page.locator('.groundwater-learning-journeys')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('calculator keeps editable decimal drafts, blocks invalid reports and switches tools without losing input', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { document.documentElement.dataset.compatibilityReport = value },
    } })
  })
  await openPage(page, calculatorPath)
  const hours = page.locator('#gw-demand-hours')
  const demand = page.locator('#gw-demand-daily')
  const copy = page.getByRole('button', { name: 'Copy results', exact: true })
  await hours.fill('')
  await expect(hours).toHaveAttribute('aria-invalid', 'true')
  await expect(copy).toBeDisabled()
  await expect(page.locator('.gw-primary-result')).toHaveCount(0)
  await hours.fill('25')
  await expect(hours).toHaveValue('25')
  await expect(hours).toHaveAttribute('aria-invalid', 'true')
  await hours.fill('8')
  await demand.fill('250.5')
  await expect(copy).toBeEnabled()
  await copy.click()
  await expect.poll(() => page.locator('html').getAttribute('data-compatibility-report')).toContain('250.5')
  const report = await page.locator('html').getAttribute('data-compatibility-report')
  expect(report).toContain('m³/day')
  expect(report).toContain('not construction design')
  await page.locator('#gw-tab-storage').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#gw-active-tool-title')).toBeFocused()
  await expect(page.locator('#gw-storage-daily')).toBeVisible()
  await page.locator('#gw-tab-demand').click()
  await expect(demand).toHaveValue('250.5')
  for (const width of [320, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(demand).toHaveValue('250.5')
    await expectNoHorizontalOverflow(page)
  }
  await page.getByRole('button', { name: 'Reset values', exact: true }).click()
  await expect(demand).not.toHaveValue('250.5')
  await expect(hours).not.toHaveAttribute('aria-invalid', 'true')
})

test('checklist opt-in persists across locales and forgetting propagates to an already-open tab', async ({ page, context }) => {
  await openPage(page, basicsPath)
  const item = page.locator('.gb-checklist input[type="checkbox"]:not([id$="-save"])').first()
  const save = page.locator('#learning-progress-basics-save')
  await expect(save).toBeEnabled()
  await item.check()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull()
  await page.reload()
  await expect(save).toBeEnabled()
  await expect(item).not.toBeChecked()
  await item.check()
  await save.check()
  await expect(page.locator('[data-checklist="basics"] .learning-progress-status')).toContainText('Saved on this device')
  await page.reload()
  await expect(item).toBeChecked()
  await openPage(page, '/learn/groundwater-basics-thailand')
  await expect(item).toBeChecked()
  const other = await context.newPage()
  await openPage(other, basicsPath)
  await expect(other.locator('#learning-progress-basics-save')).toBeChecked()
  await other.getByRole('button', { name: 'Forget saved progress', exact: true }).click()
  await expect(save).not.toBeChecked()
  await expect(item).toBeChecked()
  await item.uncheck()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull()
  await page.reload()
  await expect(save).not.toBeChecked()
  await expect(item).not.toBeChecked()
  await expectNoHorizontalOverflow(page)
  await other.close()
})

test('project map dialog zooms, traps keyboard focus, resets and restores page scrolling', async ({ page }) => {
  await openPage(page, '/en/projects')
  await expectNoHorizontalOverflow(page)
  const opener = page.getByRole('button', { name: 'Open and zoom map', exact: true })
  await opener.scrollIntoViewIfNeeded()
  const originalScroll = await page.evaluate(() => window.scrollY)
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Nationwide project experience map' })
  const close = dialog.getByRole('button', { name: 'Close', exact: true })
  await expect(dialog).toBeVisible()
  await expect(close).toBeFocused()
  await expect(dialog.locator('output')).toHaveText('100%')
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(dialog.locator('output')).toHaveText('125%')
  const canvas = dialog.getByRole('img')
  await canvas.focus()
  await page.keyboard.press('+')
  await expect(dialog.locator('output')).toHaveText('150%')
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Zoom out', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(canvas).toBeFocused()
  await page.keyboard.press('0')
  await expect(dialog.locator('output')).toHaveText('100%')
  await expect(dialog.getByRole('button', { name: 'Reset view', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(originalScroll, 0)
  await expectNoHorizontalOverflow(page)
})

test('about carousel, team tabs and service gallery retain usable layout after resizing', async ({ page }) => {
  await openPage(page, '/en/about')
  const dots = page.locator('.about-hero-slider-dot')
  await expect(dots.first()).toBeVisible()
  if (await dots.count() > 1) {
    const track = page.locator('.about-hero-slider-track')
    const trackBox = await track.boundingBox()
    expect(trackBox).not.toBeNull()
    await page.mouse.move(trackBox!.x + trackBox!.width * 0.8, trackBox!.y + trackBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(trackBox!.x + trackBox!.width * 0.15, trackBox!.y + trackBox!.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect(dots.nth(1)).toHaveClass(/active/)
    await expect(track).not.toHaveClass(/is-dragging/)
    await expect.poll(() => track.evaluate(element => element.scrollLeft)).toBeGreaterThan(trackBox!.width)
  }
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(async () => {
      const rect = await page.locator('.about-hero-slide').first().boundingBox()
      return rect ? Math.abs(rect.width / rect.height - (width > 768 ? 3 : 16 / 9)) : Infinity
    }).toBeLessThan(0.1)
    await expectNoHorizontalOverflow(page)
  }
  const tabs = page.locator('.teams-selector [role="tab"]')
  await expect(tabs.first()).toBeVisible()
  await tabs.first().focus()
  await page.keyboard.press('End')
  await expect(tabs.last()).toBeFocused()
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#team-panel')).toHaveAttribute('aria-labelledby', await tabs.last().getAttribute('id') || '')
  await page.keyboard.press('Home')
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

  await openPage(page, '/en/services/survey')
  const gallery = page.locator('.service-detail-gallery-grid')
  await gallery.scrollIntoViewIfNeeded()
  await expect(gallery.locator('img').first()).toBeVisible()
  await expect.poll(() => gallery.locator('img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  // One image is a valid CMS configuration. Exercise scrolling whenever the
  // saved gallery contains enough images to overflow its viewport.
  if (await gallery.evaluate(element => element.scrollWidth > element.clientWidth)) {
    await gallery.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => gallery.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => gallery.evaluate(element => element.scrollLeft)).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(gallery).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
