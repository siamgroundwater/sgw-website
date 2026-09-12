import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { MongoClient, ObjectId } from 'mongodb'
import { randomUUID } from 'node:crypto'

const database = process.env.CMS_E2E_DATABASE || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database)) throw new Error('CMS editor tests require the isolated npm run test:e2e:cms runner.')
const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
const sourceId = process.env.CMS_E2E_SOURCE_ID!
const origin = process.env.CMS_E2E_BASE_URL!
const password = process.env.CMS_E2E_PASSWORD!

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

async function login(page: Page) {
  await page.goto('/cms/login?returnTo=' + encodeURIComponent('/cms/projects/' + sourceId))
  await page.locator('input[autocomplete="username"]').fill('qa-admin')
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(new RegExp('/cms/projects/' + sourceId + '$'))
}

async function clone(request: APIRequestContext, title: string, overrides: Record<string, unknown> = {}) {
  const source = (await (await request.get('/api/cms/projects?id=' + sourceId)).json()).item
  const body = { ...source, id: undefined, title, slug: 'qa-editor-' + randomUUID(), sourceProjectId: sourceId, operationId: randomUUID(), ...overrides }
  const response = await request.post('/api/cms/projects', { headers: { Origin: origin }, data: body })
  expect(response.status(), await response.text()).toBe(201)
  return (await response.json()).item
}

test('conflicting editor saves can load the latest record without losing local text', async ({ page }) => {
  await login(page)
  const project = await clone(page.request, 'Editor conflict original')
  await page.goto('/cms/projects/' + project.id)
  await page.locator('[name="title"]').fill('My retained local title')
  await page.locator('[name="summary"]').fill('My retained local summary')

  const remote = await page.request.put('/api/cms/projects', {
    headers: { Origin: origin },
    data: { ...project, title: 'Newer title from another tab', expectedUpdatedAt: project.updatedAt, operationId: randomUUID() },
  })
  expect(remote.status(), await remote.text()).toBe(200)
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('.cms-error')).toContainText(/อีกแท็บ|another tab/)
  await expect(page.locator('[name="title"]')).toHaveValue('My retained local title')
  await expect(page.locator('[name="summary"]')).toHaveValue('My retained local summary')
  await expect(page.locator('button[type="submit"]')).toBeDisabled()
  await page.getByRole('button', { name: /โหลดข้อมูลล่าสุดและเก็บข้อความ|Load latest and keep my text/ }).click()
  await expect(page.locator('[name="title"]')).toHaveValue('Newer title from another tab')
  await page.getByRole('button', { name: /นำข้อความของฉันกลับมา|Reapply my text/ }).click()
  await expect(page.locator('[name="title"]')).toHaveValue('My retained local title')
  await expect(page.locator('[name="summary"]')).toHaveValue('My retained local summary')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('.cms-message').first()).toContainText(/บันทึกแล้ว|Saved/)
  const saved = (await (await page.request.get('/api/cms/projects?id=' + project.id)).json()).item
  expect(saved.title).toBe('My retained local title')
  expect(saved.summary).toBe('My retained local summary')
})

test('a duplicate slug is a field error and leaves a copied project editable', async ({ page }) => {
  await login(page)
  const source = (await (await page.request.get('/api/cms/projects?id=' + sourceId)).json()).item
  await page.goto('/cms/projects/new?sourceProjectId=' + sourceId)
  await page.locator('[name="slug"]').fill(source.slug)
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('[name="slug"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('[name="slug"]')).toBeEditable()
  await expect(page.locator('button[type="submit"]')).toBeEnabled()
  await expect(page.getByRole('button', { name: /โหลดข้อมูลล่าสุดและเก็บข้อความ|Load latest and keep my text/ })).toHaveCount(0)
  await page.locator('[name="slug"]').fill('qa-corrected-copy-' + randomUUID())
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/cms\/projects\/[a-f0-9]{24}\?created=1$/)
  await expect(page.locator('[name="slug"]')).toHaveAttribute('aria-invalid', 'false')
})

test('a dropped successful save response reconciles the operation and unlocks editing', async ({ page }) => {
  await login(page)
  const project = await clone(page.request, 'Editor lost response original')
  await page.goto('/cms/projects/' + project.id)
  const ids: string[] = []
  let dropped = false
  await page.route('**/api/cms/projects', async (route) => {
    if (route.request().method() !== 'PUT' || dropped) { await route.continue(); return }
    const body = route.request().postDataJSON()
    ids.push(body.operationId)
    const response = await route.fetch()
    expect(response.status(), await response.text()).toBe(200)
    dropped = true
    await route.abort('failed')
  })
  await page.locator('[name="title"]').fill('Saved despite lost response')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('.cms-message').first()).toContainText(/บันทึกแล้ว|Saved/)
  await expect(page.locator('[name="title"]')).toBeEditable()
  await expect(page.locator('button[type="submit"]')).toBeEnabled()
  expect(ids).toHaveLength(1)
  const receipt = (await (await page.request.get('/api/cms/projects?operationId=' + ids[0])).json()).item
  expect(receipt.id).toBe(project.id)
  expect(receipt.title).toBe('Saved despite lost response')
  expect(await db.collection('cmsProjects').countDocuments({ slug: project.slug })).toBe(1)
  expect((await db.collection('cmsProjects').findOne({ _id: new ObjectId(project.id) }))?.title).toBe('Saved despite lost response')
})

test('an uncertain save retries the exact operation without making duplicate records', async ({ page }) => {
  await login(page)
  const project = await clone(page.request, 'Editor uncertain response original')
  await page.goto('/cms/projects/' + project.id)
  let first = true
  let blockReconciliation = true
  const bodies: string[] = []
  await page.route('**/api/cms/projects?operationId=*', async (route) => {
    if (blockReconciliation) await route.abort('failed')
    else await route.continue()
  })
  await page.route('**/api/cms/projects', async (route) => {
    if (route.request().method() !== 'PUT') { await route.continue(); return }
    bodies.push(route.request().postData() || '')
    if (first) { first = false; await route.abort('failed') }
    else await route.continue()
  })
  await page.locator('[name="title"]').fill('Retry exact operation title')
  await page.locator('button[type="submit"]').click()
  const retry = page.getByRole('button', { name: /ลองบันทึกเดิมอีกครั้ง|Retry same save/ })
  await expect(retry).toBeEnabled()
  await expect(page.locator('[name="title"]')).toBeDisabled()
  blockReconciliation = false
  await retry.click()
  await expect(page.locator('.cms-message').first()).toContainText(/บันทึกแล้ว|Saved/)
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
  await expect(page.locator('[name="title"]')).toBeEditable()
  await expect(retry).toHaveCount(0)
  expect(await db.collection('cmsProjects').countDocuments({ slug: project.slug })).toBe(1)
})

test('saved previews share the public layout, language fallback, and image descriptions', async ({ page }) => {
  await login(page)
  const source = (await (await page.request.get('/api/cms/projects?id=' + sourceId)).json()).item
  const project = await clone(page.request, 'โครงการทดสอบการแสดงผล', {
    location: 'สถานที่ภาษาไทย', summary: 'รายละเอียดภาษาไทย', details: ['ส่วนรายละเอียดภาษาไทย'],
    translations: {
      en: { title: 'English preview title', location: '', summary: 'English preview summary', details: [] },
      zh: { title: '中文预览标题', location: '', summary: '', details: [] },
      ja: { title: '', location: '', summary: '', details: [] },
    },
    mediaMetadata: { [source.coverImage]: { alt: 'Accessible borehole image', caption: 'Saved image caption' } },
  })
  for (const [locale, title, summary] of [
    ['th', 'โครงการทดสอบการแสดงผล', 'รายละเอียดภาษาไทย'],
    ['en', 'English preview title', 'English preview summary'],
    ['zh', '中文预览标题', 'English preview summary'],
    ['ja', 'English preview title', 'English preview summary'],
  ]) {
    await page.goto('/cms/projects/' + project.id + '/preview?locale=' + locale)
    await expect(page.locator('.cms-project-public-preview .project-detail-card')).toHaveCount(1)
    await expect(page.locator('.cms-project-public-preview h1')).toHaveText(title)
    await expect(page.locator('.project-detail-story')).toHaveText(summary)
    await expect(page.locator('.project-detail-lead')).toHaveText('สถานที่ภาษาไทย')
    await expect(page.getByRole('img', { name: 'Accessible borehole image' })).toHaveCount(1)
    await expect(page.locator('.project-detail-media-caption')).toHaveText('Saved image caption')
    await expect(page.locator('.cms-preview-locales [aria-current="page"]')).toHaveAttribute('href', new RegExp('locale=' + locale + '$'))
    await expect(page.locator('main main')).toHaveCount(0)
    await expect(page.locator('.cms-preview-banner time')).toHaveAttribute('datetime', project.updatedAt)
    if (locale === 'th') await page.screenshot({ path: 'test-results/cms-preview-th-desktop.png', fullPage: true })
    if (locale === 'zh') {
      await page.setViewportSize({ width: 390, height: 844 })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      await page.screenshot({ path: 'test-results/cms-preview-zh-mobile.png', fullPage: true })
    }
  }
})

test('image text reconnects after refresh and matching file reselection', async ({ page }) => {
  await login(page)
  await page.goto('/cms/projects/new')
  const file = 'public/images/about/teams/icon-service-3.png'
  await expect(page.locator('input[type="file"]').first()).toBeEnabled()
  await page.locator('input[type="file"]').first().setInputFiles(file)
  await expect(page.locator('.cms-media-item-pending')).toHaveCount(1)
  await page.locator('.cms-media-item-pending .cms-image-description > summary').click()
  await page.locator('.cms-media-item-pending input').nth(0).fill('Recovered alternative text')
  await page.locator('.cms-media-item-pending input').nth(1).fill('Recovered image caption')
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('sgw-cms-edit-recovery:') && sessionStorage.getItem(key)?.includes('Recovered image caption')))).toBeTruthy()
  page.once('dialog', dialog => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: /กู้คืนการแก้ไข|Recover edits/ }).click()
  await expect(page.locator('button[type="submit"]')).toBeDisabled()
  await expect(page.locator('input[type="file"]').first()).toBeEnabled()
  await page.locator('input[type="file"]').first().setInputFiles(file)
  await expect(page.locator('.cms-media-item-pending')).toHaveCount(1)
  await page.locator('.cms-media-item-pending .cms-image-description > summary').click()
  await expect(page.locator('.cms-media-item-pending input').nth(0)).toHaveValue('Recovered alternative text')
  await expect(page.locator('.cms-media-item-pending input').nth(1)).toHaveValue('Recovered image caption')
  await expect(page.getByRole('button', { name: /ทำต่อโดยไม่ใช้ภาพ|Continue without these images/ })).toHaveCount(0)
  await expect(page.locator('button[type="submit"]')).toBeEnabled()
})

test('supported browser history traversal asks before leaving unsaved editor changes', async ({ page }) => {
  await login(page)
  await page.goto('/cms/projects/' + sourceId + '/preview')
  await page.locator('.cms-preview-banner a[href="/cms/projects/' + sourceId + '"]').click()
  await expect(page).toHaveURL(new RegExp('/cms/projects/' + sourceId + '$'))
  await page.locator('[name="title"]').fill('Text before browser Back')
  const dialog = page.waitForEvent('dialog')
  const back = page.goBack({ waitUntil: 'commit', timeout: 5_000 }).catch(() => null)
  await (await dialog).dismiss()
  await back
  await expect(page).toHaveURL(new RegExp('/cms/projects/' + sourceId + '$'))
  await expect(page.locator('[name="title"]')).toHaveValue('Text before browser Back')
})
