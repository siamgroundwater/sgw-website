import { test, expect, type Page } from '@playwright/test'
import { companyContact } from '../../src/lib/company-contact'

const locales = ['th', 'en', 'zh', 'ja'] as const
const screens = [
  { width: 320, height: 740, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 458, height: 844, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 1440, height: 1000, touch: false },
]

function controls(page: Page) {
  return {
    root: page.locator('[data-contact-fab]'),
    toggle: page.locator('[data-contact-fab-toggle]'),
    panel: page.locator('[data-contact-fab-panel]'),
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(dimensions.html, 'The document should fit its viewport.').toBeLessThanOrEqual(dimensions.viewport + 1)
  expect(dimensions.body, 'The page body should not drag sideways.').toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function expectPanelFits(page: Page) {
  const box = await controls(page).panel.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
  const navbarBottom = await page.locator('.navbar:visible, .navbar-mobile:visible').evaluateAll(elements =>
    Math.max(0, ...elements.map(element => element.getBoundingClientRect().bottom))
  )
  expect(box!.y, 'The panel should begin below the fixed public navigation.').toBeGreaterThanOrEqual(navbarBottom - 1)
  await expectNoHorizontalOverflow(page)
}

async function expectToggleIsNotCovered(page: Page) {
  const { toggle } = controls(page)
  const receivesPointer = await toggle.evaluate(element => {
    const box = element.getBoundingClientRect()
    return [box.y + 2, box.y + box.height / 2, box.bottom - 2].every(y =>
      element.contains(document.elementFromPoint(box.x + box.width / 2, y))
    )
  })
  expect(receivesPointer, 'The circular contact toggle must stay visible and usable when open.').toBe(true)
}

for (const screen of screens) {
  test.describe(`${screen.width}px ${screen.touch ? 'touch' : 'desktop'}`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: screen.touch,
      hasTouch: screen.touch,
    })

    for (const locale of locales) {
      test(`${locale} contact actions are localized, safe and contained`, async ({ page }) => {
        const prefix = locale === 'th' ? '' : `/${locale}`
        const pageErrors: string[] = []
        page.on('pageerror', error => pageErrors.push(error.message))
        await page.goto(`${prefix}/contact`)
        const { root, toggle, panel } = controls(page)
        await expect(root).toHaveCount(1)
        await expect(toggle).toBeVisible()
        await expect(toggle).toHaveAccessibleName(/\S/)
        await expect(toggle).toHaveText('')
        const triggerBox = (await toggle.boundingBox())!
        expect(Math.abs(triggerBox.width - triggerBox.height), 'Use one compact, circular trigger.').toBeLessThanOrEqual(1)
        expect(triggerBox.width, 'Keep the trigger large enough for touch.').toBeGreaterThanOrEqual(44)
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(panel).not.toBeVisible()
        await expect(page.locator('.footer-back-to-top')).toHaveCount(0)
        await expectNoHorizontalOverflow(page)
        await page.screenshot({ path: `test-results/contact-fab/${locale}-${screen.width}-closed.png` })

        if (screen.touch) await toggle.tap()
        else await toggle.click()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        await expect(panel).toBeVisible()
        await expect(panel).toHaveAttribute('id', await toggle.getAttribute('aria-controls') || '')
        await expect(panel).toHaveAccessibleName(/\S/)
        await expect(panel).toHaveJSProperty('tagName', 'NAV')
        await expect(panel.locator('header, h2, button')).toHaveCount(0)
        await expect(root.locator('button')).toHaveCount(1)
        await expect(panel.locator('a')).toHaveCount(6)
        expect(await panel.evaluate(element => getComputedStyle(element).backgroundColor), 'Use separate floating actions, not a large background card.').toBe('rgba(0, 0, 0, 0)')
        await expect(panel.locator('a').first()).toBeFocused()
        for (const contact of [companyContact.office, companyContact.wasin, companyContact.toeng, companyContact.email]) {
          const link = panel.locator(`a[href="${contact.href}"]`)
          await expect(link).toHaveCount(1)
          await expect(link).toContainText(contact.value)
          await expect(link).toHaveAccessibleName(/\S/)
        }
        const emailLabel = panel.locator(`a[href="${companyContact.email.href}"] > span`).first()
        expect(await emailLabel.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'The email text should fit its label without clipping or horizontal scrolling.').toBe(true)
        await expect(emailLabel).toHaveCSS('white-space', 'normal')
        await expect(panel.locator('strong, small')).toHaveCount(0)
        for (const label of await panel.locator(`a:not([href="${companyContact.email.href}"]) > span:first-child`).all()) {
          await expect(label).toHaveCSS('white-space', 'nowrap')
        }
        const iconSizes = await panel.locator('a > span:last-child').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width))
        expect(iconSizes.every(size => size >= 52), 'Contact icons should be larger while the open/close control keeps its own size.').toBe(true)
        if (locale === 'th') {
          for (const line of [
            'LINE: @SGW_TH',
            `สำนักงาน: ${companyContact.office.value}`,
            `คุณวศิน: ${companyContact.wasin.value}`,
            `คุณเติ้ง: ${companyContact.toeng.value}`,
            `อีเมล: ${companyContact.email.value}`,
            'ตำแหน่งที่ตั้ง:',
          ]) await expect(panel.getByText(line, { exact: true })).toHaveCount(1)
        }
        const line = companyContact.social[0]
        const lineLink = panel.locator(`a[href="${line.href}"]`)
        await expect(lineLink).toHaveCount(1)
        await expect(lineLink).toHaveAttribute('target', '_blank')
        await expect(lineLink).toHaveAttribute('rel', /noopener/)
        await expect(lineLink).toHaveAttribute('rel', /noreferrer/)
        await expect(lineLink).toHaveAccessibleName(/LINE/i)
        for (const removedSocial of companyContact.social.slice(1)) {
          await expect(panel.locator(`a[href="${removedSocial.href}"]`)).toHaveCount(0)
        }
        await expect(panel.locator(`a[href="${prefix}/contact"]`)).toHaveCount(1)
        await expectPanelFits(page)
        const actionBounds = await panel.locator('a').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect()
          return { top: box.top, bottom: box.bottom }
        }))
        for (let index = 1; index < actionBounds.length; index++) {
          expect(actionBounds[index].top, 'Stack each contact action on its own row.').toBeGreaterThanOrEqual(actionBounds[index - 1].bottom - 1)
        }
        await expectToggleIsNotCovered(page)
        await page.screenshot({ path: `test-results/contact-fab/${locale}-${screen.width}-open.png` })
        expect(pageErrors, 'The floating contact controls must not introduce client errors.').toEqual([])
      })
    }
  })
}

test('keyboard disclosure, Escape, close, outside pointer and Tab behave predictably', async ({ page }) => {
  await page.goto('/en/contact')
  const { toggle, panel, root } = controls(page)
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(panel).toBeVisible()
  await expect(panel.locator('a').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).not.toBeVisible()
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await page.keyboard.press('Space')
  await expect(panel).toBeVisible()
  await expect(panel.locator('a').first()).toBeFocused()
  await toggle.click()
  await expect(panel).not.toBeVisible()
  await expect(toggle).toBeFocused()

  await toggle.click()
  await page.locator('main h1').first().click()
  await expect(panel).not.toBeVisible()
  await expect(toggle).not.toBeFocused()

  await toggle.click()
  await expect(panel.locator('a').first()).toBeFocused()
  await panel.locator('a, button').last().focus()
  // The popover is not modal: Tab is allowed to return to normal page content.
  for (let steps = 0; steps < 4; steps++) {
    await page.keyboard.press('Tab')
    if (!(await root.evaluate(element => element.contains(document.activeElement)))) break
  }
  await expect(panel).not.toBeVisible()
  expect(await root.evaluate(element => element.contains(document.activeElement))).toBe(false)
})

test('local contact navigation closes the panel and preserves the selected language', async ({ page }) => {
  await page.goto('/ja/groundwater-learning')
  const { toggle, panel } = controls(page)
  await toggle.click()
  await panel.locator('a[href="/ja/contact"]').click()
  await expect(page).toHaveURL(/\/ja\/contact$/)
  await expect(panel).not.toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(panel).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/ja\/groundwater-learning$/)
  await expect(panel).not.toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('the trigger remains fixed while scrolling and an open panel survives responsive resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/groundwater-learning')
  const { toggle, panel } = controls(page)
  const initial = await toggle.boundingBox()
  expect(initial).not.toBeNull()
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  const scrolled = await toggle.boundingBox()
  expect(Math.abs(scrolled!.x - initial!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(scrolled!.y - initial!.y)).toBeLessThanOrEqual(1)
  await expect(page.locator('.footer-back-to-top')).toHaveCount(0)
  await toggle.click()
  for (const screen of [screens[0], screens[3], screens[2], screens[1]]) {
    await page.setViewportSize({ width: screen.width, height: screen.height })
    await expect(panel).toBeVisible()
    await expectPanelFits(page)
  }
  await toggle.click()
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  const privacy = page.locator('footer a[href="/privacy"]')
  await expect(privacy).toBeInViewport()
  const privacyBox = (await privacy.boundingBox())!
  const triggerBox = (await toggle.boundingBox())!
  const overlap = privacyBox.x < triggerBox.x + triggerBox.width && privacyBox.x + privacyBox.width > triggerBox.x
    && privacyBox.y < triggerBox.y + triggerBox.height && privacyBox.y + privacyBox.height > triggerBox.y
  expect(overlap, 'The floating contact trigger must not cover the footer privacy link.').toBe(false)
  await page.screenshot({ path: 'test-results/contact-fab/th-390-footer.png' })
})

test('large text and a short mobile viewport keep contact actions reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/contact')
  await page.evaluate(() => {
    const size = parseFloat(getComputedStyle(document.documentElement).fontSize)
    document.documentElement.style.fontSize = `${size * 2}px`
  })
  const { toggle, panel } = controls(page)
  await toggle.click()
  await expectPanelFits(page)
  const contactPage = panel.locator('a[href="/contact"]')
  await contactPage.scrollIntoViewIfNeeded()
  await expect(contactPage).toBeInViewport()
  await expect(toggle).toBeInViewport()
  await expectToggleIsNotCovered(page)
  await page.screenshot({ path: 'test-results/contact-fab/th-320-text-200-percent.png' })
})

test('CMS login has no public contact FAB', async ({ page }) => {
  await page.goto('/cms/login')
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
  await expect(controls(page).root).toHaveCount(0)
})
