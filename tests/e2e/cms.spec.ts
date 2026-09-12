import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'node:crypto'

const database = process.env.CMS_E2E_DATABASE || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database)) throw new Error('Run CMS browser tests through npm run test:e2e:cms; an isolated database is required.')
const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
const sourceId = process.env.CMS_E2E_SOURCE_ID!
const origin = process.env.CMS_E2E_BASE_URL!
const password = process.env.CMS_E2E_PASSWORD!

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

async function loginApi(request: APIRequestContext, role = 'admin') {
  const response = await request.post('/api/cms/auth/login', { headers: { Origin: origin }, data: { username: 'qa-' + role, password } })
  expect(response.ok(), await response.text()).toBeTruthy()
}
async function login(page: Page, destination = '/cms/projects') {
  await page.goto('/cms/login?returnTo=' + encodeURIComponent(destination))
  await page.locator('input[autocomplete="username"]').fill('qa-admin')
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$'))
}

test('login redirects authenticated users and project search covers every saved record', async ({ page }) => {
  await login(page)
  await expect(page.locator('.cms-project-card')).toHaveCount(24)
  await page.locator('.cms-search input').fill('Needle beyond old limit')
  await expect(page.locator('.cms-project-card')).toHaveCount(1)
  await expect(page.locator('.cms-library-count')).toContainText('1')
  const columns = await page.locator('.cms-project-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(3)
  await page.goto('/cms/login')
  await expect(page).toHaveURL(/\/cms\/dashboard$/)
})

test('live save, idempotent retry, conflict, fallback, Trash and restore use the same data', async ({ request }) => {
  await loginApi(request)
  const response = await request.get('/api/cms/projects?id=' + sourceId)
  const source = (await response.json()).item
  expect(source.id).toBe(sourceId)
  const body = { ...source, id: undefined, slug: 'qa-live-' + randomUUID(), title: 'Immediate save test', sourceProjectId: sourceId, operationId: randomUUID() }
  const created = await request.post('/api/cms/projects', { headers: { Origin: origin }, data: body })
  expect(created.status(), await created.text()).toBe(201)
  const first = (await created.json()).item
  expect(first.status).toBe('active')
  expect(first).not.toHaveProperty('draft')
  expect(first).not.toHaveProperty('publishedVersion')
  const replay = await request.post('/api/cms/projects', { headers: { Origin: origin }, data: body })
  expect((await replay.json()).item.id).toBe(first.id)
  expect(await db.collection('cmsProjects').countDocuments({ slug: body.slug })).toBe(1)
  const receipt = await request.get('/api/cms/projects?operationId=' + body.operationId)
  expect((await receipt.json()).item.id).toBe(first.id)
  const different = await request.post('/api/cms/projects', { headers: { Origin: origin }, data: { ...body, title: 'Different body' } })
  expect(different.status()).toBe(409)
  const localized = await request.get('/zh/projects/' + first.id)
  expect(localized.status()).toBe(200)
  expect(await localized.text()).toContain('中文项目')
  expect(await localized.text()).toContain('English test summary')
  const japanese = await request.get('/ja/projects/' + first.id)
  expect(await japanese.text()).toContain('QA project 0')
  const update = { ...first, title: 'Saved immediately again', expectedUpdatedAt: first.updatedAt, operationId: randomUUID() }
  const updatedResponse = await request.put('/api/cms/projects', { headers: { Origin: origin }, data: update })
  expect(updatedResponse.status(), await updatedResponse.text()).toBe(200)
  const updated = (await updatedResponse.json()).item
  expect(await (await request.get('/projects/' + first.id)).text()).toContain(update.title)
  const conflict = await request.put('/api/cms/projects', { headers: { Origin: origin }, data: { ...update, operationId: randomUUID(), title: 'Stale edit' } })
  expect(conflict.status()).toBe(409)
  const remove = await request.delete('/api/cms/projects', { headers: { Origin: origin }, data: { id: first.id, expectedUpdatedAt: updated.updatedAt, operationId: randomUUID() } })
  expect(remove.ok(), await remove.text()).toBeTruthy()
  const trashed = (await remove.json()).item
  expect(await db.collection('cmsProjects').countDocuments({ slug: body.slug })).toBe(1)
  expect((await request.get('/projects/' + first.id)).status()).toBe(404)
  const restored = await request.patch('/api/cms/projects', { headers: { Origin: origin }, data: { action: 'restore', id: first.id, expectedUpdatedAt: trashed.updatedAt, operationId: randomUUID() } })
  expect(restored.ok(), await restored.text()).toBeTruthy()
  expect((await request.get('/projects/' + first.id)).status()).toBe(200)
  expect((await request.patch('/api/cms/projects', { headers: { Origin: origin }, data: { action: 'unpublish', id: first.id, operationId: randomUUID() } })).status()).toBe(400)
})

test('viewer cannot save, inspect Trash, or administer users; cross-origin writes fail', async ({ request }) => {
  await loginApi(request, 'viewer')
  expect((await request.post('/api/cms/projects', { headers: { Origin: origin }, data: { operationId: randomUUID() } })).status()).toBe(403)
  expect((await request.get('/api/cms/projects?view=trash')).status()).toBe(403)
  expect((await request.get('/api/cms/users')).status()).toBe(403)
  expect((await request.post('/api/cms/projects', { headers: { Origin: 'https://untrusted.example' }, data: {} })).status()).toBe(403)
})

test('strict Trash confirmation restores focus and a project can be recovered through the library', async ({ page }) => {
  await login(page)
  await page.locator('.cms-search input').fill('ผลงานทดสอบ 005')
  await expect(page.locator('.cms-project-card')).toHaveCount(1)
  const remove = page.locator('.cms-project-card button.cms-button-danger')
  await remove.click()
  const dialog = page.locator('.cms-native-confirm')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.cms-confirm-actions .cms-button-danger')).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(remove).toBeFocused()
  await remove.click()
  await dialog.locator('input').fill('ผลงานทดสอบ 005')
  await dialog.locator('.cms-confirm-actions .cms-button-danger').click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.cms-project-card')).toHaveCount(0)
  await page.locator('.cms-library-actions button').filter({ hasText: /ถังขยะ|Trash/ }).click()
  await expect(page.locator('.cms-project-card')).toHaveCount(1)
  await page.locator('.cms-project-card button').click()
  await dialog.locator('input').fill('ผลงานทดสอบ 005')
  await dialog.locator('.cms-confirm-actions .cms-button').click()
  await expect(page.locator('.cms-project-card')).toHaveCount(0)
  await page.locator('.cms-library-actions button').filter({ hasText: /ผลงานทั้งหมด|Projects/ }).click()
  await expect(page.locator('.cms-project-card')).toHaveCount(1)
})

test('editor uses one Save, recovers unsaved text, and retains it after session expiry', async ({ page }) => {
  await login(page, '/cms/projects/' + sourceId)
  await expect(page.locator('button[type="submit"]')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Publish|Unpublish|Save draft/i })).toHaveCount(0)
  await expect(page.locator('.cms-language-section')).toHaveCount(3)
  await expect(page.locator('.cms-language-section[open]')).toHaveCount(0)
  await page.locator('[name="title"]').fill('Recoverable local text')
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('sgw-cms-edit-recovery:') && sessionStorage.getItem(key)?.includes('Recoverable local text')))).toBeTruthy()
  page.once('dialog', dialog => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: /กู้คืนการแก้ไข|Recover edits/ }).click()
  await expect(page.locator('[name="title"]')).toHaveValue('Recoverable local text')
  await page.context().clearCookies()
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('[name="title"]')).toHaveValue('Recoverable local text')
  await expect(page.locator('.cms-error').first()).toContainText(/เซสชัน|session/i)
})

test('mobile resize, fixed navbar, drawer dismiss, keyboard modal and local image preparation', async ({ page }) => {
  await login(page, '/cms/projects/new')
  for (const width of [390, 768, 1440, 320, 1024, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  }
  const navbar = page.locator('.cms-navbar')
  const before = await navbar.boundingBox()
  await page.evaluate(() => window.scrollTo(0, 1400))
  await expect.poll(async () => Math.abs((await navbar.boundingBox())!.y - before!.y)).toBeLessThan(1)
  const toggle = page.locator('.cms-navbar-menu-button')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await toggle.click()
  await page.locator('.cms-drawer-scrim').click({ position: { x: 380, y: 500 } })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  let uploads = 0
  page.on('request', request => { if (request.url().includes('/api/cms/projects/media') && request.method() === 'POST') uploads++ })
  await page.locator('input[type="file"]').first().setInputFiles('public/images/about/teams/icon-service-3.png')
  await expect(page.locator('.cms-media-item-pending')).toHaveCount(1)
  expect(uploads).toBe(0)
  await page.locator('.cms-media-preview-button').first().click()
  await expect(page.locator('.cms-image-dialog[open]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.cms-image-dialog[open]')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/cms-mobile.png', fullPage: true })
})
