import { expect, test, type Page } from '@playwright/test'
import { learningPaths } from '../../scripts/e2e-learning-routes.mjs'

const calculatorPath = '/en/learn/groundwater-calculator-tools'
const learningHubPath = '/en/groundwater-learning'
const basicsPath = '/en/learn/groundwater-basics-thailand'
const caseStudiesPath = '/en/learn/groundwater-case-studies-problems'
const faqPath = '/en/learn/groundwater-faq-thailand'
const lawPath = '/en/learn/groundwater-law-regulation-thailand'
const ownerPath = '/en/learn/groundwater-guide-factory-hotel-resort'
const clientErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  clientErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  // The suite must never submit contact forms or write to CMS/provider APIs.
  await page.route('**/*', (route) => ['GET', 'HEAD'].includes(route.request().method())
    ? route.continue()
    : route.abort('blockedbyclient'))
})

test.afterEach(async ({ page }) => {
  expect(clientErrors.get(page) || [], 'No uncaught learning-page client errors').toEqual([])
})

for (const [locale, htmlLang] of [['th', 'th'], ['en', 'en'], ['zh', 'zh-CN'], ['ja', 'ja']]) {
  test(`${locale}: all seven learning routes render and fit a narrow viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 })
    for (const path of learningPaths) {
      const response = await page.goto(`${locale === 'th' ? '' : `/${locale}`}${path}`)
      expect(response?.status(), path).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', htmlLang)
      await expect(page.locator('main h1')).toHaveCount(1)
      await expect(page.locator('main h1')).not.toBeEmpty()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), { message: `${locale}${path}: no horizontal overflow` }).toBe(true)
    }
  })
}

test('calculator preserves blank and invalid drafts, recovers decimals, and resets', async ({ page }) => {
  await page.goto(calculatorPath)
  const hours = page.locator('#gw-demand-hours')
  const daily = page.locator('#gw-demand-daily')
  const copy = page.getByRole('button', { name: 'Copy results', exact: true })
  await hours.fill('')
  await expect(hours).toHaveValue('')
  await expect(hours).toHaveAttribute('aria-invalid', 'true')
  await expect(copy).toBeDisabled()
  await expect(page.locator('.gw-primary-result')).toHaveCount(0)
  await hours.fill('25')
  await expect(hours).toHaveValue('25')
  await expect(hours).toHaveAttribute('aria-invalid', 'true')
  await hours.fill('8')
  await daily.fill('250.5')
  await expect(daily).toHaveValue('250.5')
  await expect(copy).toBeEnabled()
  await expect(page.locator('.gw-primary-result')).toBeVisible()
  await page.getByRole('button', { name: 'Reset values', exact: true }).click()
  await expect(hours).not.toHaveAttribute('aria-invalid', 'true')
  await expect(daily).not.toHaveValue('250.5')
  await expect(copy).toBeEnabled()
})

test('calculator report includes inputs, units, example status, results and limitations', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { (window as any).__learningCopiedReport = text },
    } })
  })
  await page.goto(calculatorPath)
  await page.getByRole('button', { name: 'Copy results', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__learningCopiedReport || '')).toContain('Daily water demand')
  const exampleReport = await page.evaluate(() => (window as any).__learningCopiedReport as string)
  expect(exampleReport).toMatch(/example/i)
  expect(exampleReport).toContain('m³/day')
  expect(exampleReport).toContain('m³/h')
  expect(exampleReport).toContain('preliminary')
  expect(exampleReport).toContain('not construction design')
  expect(exampleReport).toContain('/en/learn/groundwater-calculator-tools')
  await page.locator('#gw-demand-daily').fill('321.5')
  await page.getByRole('button', { name: 'Copy results', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__learningCopiedReport || '')).toContain('321.5')
})

test('clipboard denial produces understandable feedback instead of a false success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Test denied', 'NotAllowedError') },
    } })
  })
  await page.goto(calculatorPath)
  await page.getByRole('button', { name: 'Copy results', exact: true }).click()
  await expect(page.locator('#gw-copy-feedback')).toContainText(/could not|couldn't|unable|failed/i)
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toHaveCount(0)
})

test('calculator tool selection moves keyboard focus and invalid drafts do not leak between tools', async ({ page }) => {
  await page.goto(calculatorPath)
  await page.locator('#gw-demand-hours').fill('')
  await page.locator('#gw-tab-storage').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#gw-tab-storage')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#gw-active-tool-title')).toBeFocused()
  await expect(page.locator('#gw-storage-daily')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy results', exact: true })).toBeEnabled()
})

test('FAQ supports search, no results, selected filters and keyboard-expanded answers', async ({ page }) => {
  await page.goto(faqPath)
  const input = page.locator('#gwf-search')
  await input.fill('TDS')
  await expect(page.locator('.gwf-faq-item')).toHaveCount(1)
  const question = page.locator('.gwf-question').first()
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.gwf-answer')).toContainText('No.')
  await input.fill('zzzzz-no-groundwater-result')
  await expect(page.locator('.gwf-empty')).toBeVisible()
  await expect(page.locator('.gwf-faq-item')).toHaveCount(0)
  await input.fill('')
  await page.locator('.gwf-category-filter summary').click()
  const category = page.locator('.gwf-category-filter button').nth(1)
  await category.click()
  await expect(category).toHaveAttribute('aria-pressed', 'true')
})

test('FAQ recommendation opens and focuses the requested question and share hashes survive reload', async ({ page }) => {
  await page.goto(faqPath)
  await page.locator('.gwf-recommended button').first().click()
  await expect(page.locator('.gwf-question[aria-expanded="true"]')).toBeFocused()
  const questionID = await page.locator('.gwf-question[aria-expanded="true"]').locator('..').getAttribute('id')
  expect(questionID).toMatch(/^faq-/)
  await page.goto(`${faqPath}#${questionID}`)
  await expect(page.locator(`#${questionID} .gwf-question`)).toHaveAttribute('aria-expanded', 'true')
})

test('quiz answers expose selection and feedback, and retry clears answers', async ({ page }) => {
  await page.goto(basicsPath)
  const questions = page.locator('.gb-quiz-questions fieldset')
  const count = await questions.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    const choice = questions.nth(i).getByRole('button').first()
    await choice.focus()
    await page.keyboard.press('Space')
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await expect(questions.nth(i).getByRole('status')).not.toBeEmpty()
  }
  await page.locator('.gb-quiz-result button').click()
  await expect(page.locator('.gb-quiz-questions button[aria-pressed="true"]')).toHaveCount(0)
})

test('buttons, disclosures and links have visible non-hover click cues', async ({ page }) => {
  await page.goto(calculatorPath)
  const button = page.locator('#gw-tab-storage')
  await expect(button).toBeVisible()
  expect(await button.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThanOrEqual(1)
  expect(await button.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
  await button.focus()
  expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none')
  const summary = page.locator('.gw-more-tools summary')
  expect(await summary.evaluate((element) => getComputedStyle(element).listStyleType)).not.toBe('none')
  const link = page.locator('.learning-article-breadcrumb a').first()
  expect(await link.evaluate((element) => getComputedStyle(element).textDecorationLine)).toContain('underline')
})

test('numbers and icons share the heading or strong text element they label', async ({ page }) => {
  const checks: Array<[string, string[]]> = [
    [learningHubPath, ['.groundwater-learning-journey h3 > .groundwater-learning-icon > svg', '.groundwater-learning-start-text strong > svg', '.learning-search h2 > svg']],
    [basicsPath, ['.gb-module-heading h2 > span > svg', '.gb-workflow h3 > span > svg', '.gb-well-parts h3 > svg', '.gb-quality-grid h3 > svg', '.gb-monitor-grid h4 > svg', '.gb-next h2 > svg', '.learning-diagram-key strong > span']],
    [calculatorPath, ['.gw-suite-header h2 .gw-suite-mark > svg', '.gw-tool-tabs strong > svg', '#gw-active-tool-title > span > svg', '.gw-suite-disclaimer strong > svg']],
    [caseStudiesPath, ['.gcs-heading h2 > span > svg', '.gcs-stop-card h3 > svg', '.gcs-action-grid strong > svg', '.gcs-workflow h3 > span', '.gcs-cases h3 > span', '.gcs-records h4 > svg', '.gcs-next h2 > svg']],
    [faqPath, ['.gwf-question strong .gwf-question-icon > svg', '.gwf-answer aside strong > svg', '.gwf-notice h2 > svg', '.gwf-next h2 > svg']],
    [lawPath, ['.gwl-heading h2 > span > svg', '.gwl-layers h3 > span', '.gwl-sections h4 > span', '.gwl-lifecycle h3 > span', '.gwl-duties h3 > svg', '.gwl-deadlines h3 > svg', '.gwl-penalties h3 > span', '.gwl-next h2 > svg']],
    [ownerPath, ['.gog-facility-grid strong > svg', '.gog-priority-panel strong > svg', '.gog-roadmap strong > .gog-step-marker', '.gog-principles h3 > svg', '.gog-handover-grid h3 > svg']],
  ]

  for (const [path, selectors] of checks) {
    await page.goto(path)
    for (const selector of selectors) {
      expect(await page.locator(selector).count(), `${path}: ${selector}`).toBeGreaterThan(0)
    }
  }
})

test('checklists save only after opting in, survive locale changes, reset and forget', async ({ page }) => {
  await page.goto(basicsPath)
  const item = page.locator('.gb-checklist label').filter({ has: page.locator('input[type="checkbox"]:not([id$="-save"])') }).first()
  const checkbox = item.locator('input')
  const save = page.locator('#learning-progress-basics-save')
  await expect(save).toBeEnabled()
  await item.click()
  await expect(checkbox).toBeChecked()
  expect(await page.evaluate(() => localStorage.getItem('sgw:learning-progress:basics:v1'))).toBeNull()
  await page.reload()
  await expect(save).toBeEnabled()
  await expect(checkbox).not.toBeChecked()
  await item.click()
  await save.check()
  await expect(page.locator('[data-checklist="basics"] .learning-progress-status')).toContainText('Saved on this device')
  await page.reload()
  await expect(checkbox).toBeChecked()
  await expect(save).toBeChecked()
  await page.goto('/learn/groundwater-basics-thailand')
  await expect(checkbox).toBeChecked()
  await expect(save).toBeChecked()
  await page.goto(basicsPath)
  await page.getByRole('button', { name: 'Reset checklist', exact: true }).click()
  await expect(checkbox).not.toBeChecked()
  await page.reload()
  await expect(checkbox).not.toBeChecked()
  await page.getByRole('button', { name: 'Forget saved progress', exact: true }).click()
  await expect(save).not.toBeChecked()
  expect(await page.evaluate(() => localStorage.getItem('sgw:learning-progress:basics:v1'))).toBeNull()
})

test('checklists remain usable when local storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('sgw:learning-progress:')) throw new DOMException('Test quota', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto(basicsPath)
  const item = page.locator('.gb-checklist label').filter({ has: page.locator('input[type="checkbox"]:not([id$="-save"])') }).first()
  await item.click()
  await page.locator('#learning-progress-basics-save').check()
  await expect(page.locator('[data-checklist="basics"] .learning-progress-status')).toContainText('storage is unavailable or full')
  await expect(item.locator('input')).toBeChecked()
  await item.click()
  await expect(item.locator('input')).not.toBeChecked()
})

test('unrecognised stored progress is ignored without breaking hydration', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sgw:learning-progress:basics:v1', JSON.stringify({ version: 100, optedIn: true, checked: ['unknown'] }))
  })
  await page.goto(basicsPath)
  await expect(page.locator('#learning-progress-basics-save')).toBeEnabled()
  await expect(page.locator('#learning-progress-basics-save')).not.toBeChecked()
  await expect(page.locator('.gb-checklist input:checked')).toHaveCount(0)
})

for (const locale of ['th', 'en', 'zh', 'ja']) {
  test(`${locale}: centre search finds real content, links to answers, resets and handles no matches`, async ({ page }) => {
    const prefix = locale === 'th' ? '' : `/${locale}`
    await page.goto(`${prefix}/groundwater-learning`)
    const search = page.locator('#learning-search-input')
    await expect(page.locator('.groundwater-learning-journeys')).toBeVisible()
    await search.fill('TDS')
    await expect(page.locator('.learning-search-result').first()).toBeVisible()
    await expect(page.locator('.groundwater-learning-journeys')).toHaveCount(0)
    await expect(page.locator('#learning-search-status')).not.toBeEmpty()
    await expect(page.locator('#learning-search-results mark').first()).toBeVisible()
    const answer = page.locator(`.learning-search-result[href="${prefix}/learn/groundwater-faq-thailand#faq-clear-water-safe"]`)
    await expect(answer).toBeVisible()
    await answer.click()
    await expect(page).toHaveURL(new RegExp(`${prefix}/learn/groundwater-faq-thailand#faq-clear-water-safe$`))
    await expect(page.locator('#faq-clear-water-safe .gwf-question')).toHaveAttribute('aria-expanded', 'true')
    await page.goto(`${prefix}/groundwater-learning`)
    await search.fill('zzzqvxyz')
    await expect(page.locator('.learning-search-empty')).toBeVisible()
    await expect(page.locator('.learning-search-result')).toHaveCount(0)
    await page.locator('.learning-search-empty button').click()
    await expect(search).toHaveValue('')
    await expect(search).toBeFocused()
    await expect(page.locator('.groundwater-learning-journeys')).toBeVisible()
    await search.fill('<img src=x onerror=alert(1)>')
    await expect(page.locator('#learning-search-results img')).toHaveCount(0)
  })
}

test('Thai spacing is supported and more search results remain reachable', async ({ page }) => {
  await page.goto('/groundwater-learning')
  await page.locator('#learning-search-input').fill('น้ำ เค็ม')
  await expect(page.locator('.learning-search-result').first()).toBeVisible()
  await page.locator('#learning-search-input').fill('น้ำ')
  await expect(page.locator('.learning-search-result')).toHaveCount(8)
  await page.locator('.learning-search-more').click()
  await expect(page.locator('.learning-search-result')).toHaveCount(16)
  await page.locator('.learning-search-clear').click()
  await expect(page.locator('#learning-search-input')).toHaveValue('')
})

test('printing uses the complete estimate and excludes navigation and other tools', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => { (window as any).__learningPrintCalled = true }
  })
  await page.goto(calculatorPath)
  await page.locator('#gw-demand-daily').fill('222.5')
  await page.locator('.gw-print-results').click()
  await expect.poll(() => page.evaluate(() => (window as any).__learningPrintCalled)).toBe(true)
  await expect(page.locator('.gw-print-report')).toContainText('222.5')
  await expect(page.locator('.gw-print-report')).toContainText('not construction design')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.gw-print-report')).toBeVisible()
  await expect(page.locator('.gw-tool-picker')).toBeHidden()
  await expect(page.locator('.learning-article-breadcrumb')).toBeHidden()
})

test('forgetting a saved checklist in another tab cannot resurrect old progress', async ({ page, context }) => {
  await page.goto(basicsPath)
  const item = page.locator('.gb-checklist label').filter({ has: page.locator('input[type="checkbox"]:not([id$="-save"])') }).first()
  await item.click()
  await page.locator('#learning-progress-basics-save').check()
  const other = await context.newPage()
  await other.goto(basicsPath)
  await expect(other.locator('#learning-progress-basics-save')).toBeChecked()
  await other.getByRole('button', { name: 'Forget saved progress', exact: true }).click()
  await expect(page.locator('#learning-progress-basics-save')).not.toBeChecked()
  await expect(item.locator('input')).toBeChecked()
  await item.click()
  expect(await page.evaluate(() => localStorage.getItem('sgw:learning-progress:basics:v1'))).toBeNull()
  await other.close()
})

test('law and owner checklists have independent persisted progress', async ({ page }) => {
  await page.goto('/en/learn/groundwater-law-regulation-thailand')
  const lawItem = page.locator('.gwl-checklist label').filter({ has: page.locator('input[type="checkbox"]:not([id$="-save"])') }).first()
  await lawItem.click()
  await page.locator('#learning-progress-law-save').check()
  await page.reload()
  await expect(lawItem.locator('input')).toBeChecked()
  await page.goto('/en/learn/groundwater-guide-factory-hotel-resort')
  const step = page.locator('.gog-roadmap button').first()
  await expect(step).toHaveAttribute('aria-pressed', 'false')
  await step.click()
  await page.locator('#learning-progress-owner-save').check()
  await page.reload()
  await expect(step).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Forget saved progress', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('sgw:learning-progress:owner:v1'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('sgw:learning-progress:law:v1'))).not.toBeNull()
})

test('resizing retains search and calculator input state without sideways overflow', async ({ page }) => {
  await page.goto('/en/groundwater-learning')
  await page.locator('#learning-search-input').fill('TDS')
  for (const width of [390, 1280, 700, 320, 1024]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('#learning-search-input')).toHaveValue('TDS')
    await expect(page.locator('.learning-search-result').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  }
  await page.goto(calculatorPath)
  await page.locator('#gw-demand-daily').fill('250.5')
  for (const width of [320, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('#gw-demand-daily')).toHaveValue('250.5')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  }
})
