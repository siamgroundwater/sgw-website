import { expect, test, type Page } from '@playwright/test'
import { MongoClient, type Document } from 'mongodb'
import sharp from 'sharp'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (
  !/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB ||
  database === process.env.CMS_E2E_SOURCE_DATABASE || !password || !origin ||
  process.env.CLOUDINARY_CLOUD_NAME !== 'isolated-test-no-provider'
) throw new Error('CMS media resilience tests require the isolated no-provider npm run test:e2e:cms runner.')
const server = new URL(origin)
if (server.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(server.hostname) || !server.port) {
  throw new Error('CMS media resilience tests require the isolated local HTTP server.')
}

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

async function login(page: Page, destination: string) {
  await page.goto('/cms/login?returnTo=' + encodeURIComponent(destination))
  await page.locator('input[autocomplete="username"]').fill('qa-admin')
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(origin + destination)
}

type Failure = 'server' | 'network' | 'session'

async function failUploads(page: Page, uploadPath: string, savePath: string) {
  const observed = { failure: 'server' as Failure, uploads: 0, saves: 0, cleanup: 0 }
  await page.route('**' + uploadPath, async (route) => {
    if (route.request().method() !== 'POST') {
      observed.cleanup += 1
      await route.fulfill({ status: 400, json: { error: 'No uploaded image exists in this test.' } })
      return
    }
    observed.uploads += 1
    if (observed.failure === 'network') await route.abort('failed')
    else await route.fulfill({
      status: observed.failure === 'session' ? 401 : 500,
      json: { error: observed.failure === 'session' ? 'Session expired.' : 'Simulated upload unavailable.' },
    })
  })
  await page.route('**' + savePath, async (route) => {
    if (route.request().method() === 'GET') { await route.continue(); return }
    observed.saves += 1
    // A regression must fail the test without changing even isolated content.
    await route.fulfill({ status: 500, json: { error: 'Database save must not follow a failed image upload.' } })
  })
  return observed
}

test('website media keeps its compressed preview and never saves after upload failure, disconnection or expired session', async ({ page }) => {
  const section = 'service-survey'
  const media = db.collection<Document & { _id: string }>('cmsSiteMedia')
  const before = await media.findOne({ _id: section })
  const stagedCount = await db.collection('cmsStagedProjectMedia').countDocuments({})
  await login(page, '/cms/media/' + section)
  const observed = await failUploads(page, '/api/cms/media/upload', '/api/cms/media')
  const buffer = await sharp({ create: { width: 3200, height: 1800, channels: 3, background: '#58a4aa' } }).png().toBuffer()
  const input = page.locator('[data-field="coverImage"] input[type="file"]')
  await expect(input).toBeEnabled()
  await input.setInputFiles({ name: 'recoverable-service-image.png', mimeType: 'image/png', buffer })
  const preview = page.locator('[data-field="coverImage"] .cms-media-item-pending img')
  await expect(preview).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => preview.evaluate((image) => ({
    width: (image as HTMLImageElement).naturalWidth, height: (image as HTMLImageElement).naturalHeight,
  }))).toEqual({ width: 2200, height: 1238 })
  const preparedSrc = await preview.getAttribute('src')
  const save = page.locator('.cms-site-media-actions button[type="submit"]')
  await expect(save).toBeEnabled()
  expect(observed.uploads).toBe(0)
  expect(observed.saves).toBe(0)

  for (const [index, failure] of (['server', 'network', 'session'] as const).entries()) {
    observed.failure = failure
    await save.click()
    const error = page.locator('.cms-site-media-editor > div[aria-live="polite"] .cms-error')
    await expect(error).toContainText(failure === 'server' ? /Simulated upload unavailable/ : failure === 'network' ? /fetch|network|failed/i : /เซสชัน|session/i)
    await expect(save).toBeEnabled()
    await expect(preview).toHaveAttribute('src', preparedSrc!)
    await expect(input).toBeEnabled()
    expect(observed.uploads).toBe(index + 1)
    expect(observed.saves).toBe(0)
    expect(observed.cleanup).toBe(0)
  }
  await expect(page).toHaveURL(origin + '/cms/media/' + section)
  await expect(page.locator('.cms-session-banner')).toContainText(/เซสชันหมดอายุ|session expired/i)
  await expect(page.locator('.cms-session-banner a')).toHaveAttribute('target', '_blank')
  expect(await media.findOne({ _id: section })).toEqual(before)
  expect(await db.collection('cmsStagedProjectMedia').countDocuments({})).toBe(stagedCount)
})

test('member portrait and unsaved text survive failed uploads and session expiry without a member save', async ({ page }) => {
  const directory = db.collection<Document & { _id: string }>('cmsTeamDirectory')
  const before = await directory.findOne({ _id: 'about-teams' })
  const stagedCount = await db.collection('cmsStagedProjectMedia').countDocuments({})
  await login(page, '/cms/teams')
  const teamResponse = await page.request.get('/api/cms/teams?id=fallback-management-1')
  expect(teamResponse.ok()).toBeTruthy()
  const team = await teamResponse.json()
  const member = team.members[0]
  const destination = `/cms/teams/${member.teamId}/members/${member.id}`
  await page.goto(destination)
  const observed = await failUploads(page, '/api/cms/team-members/media', '/api/cms/team-members')
  const name = page.locator('.cms-team-member-editor input[name="name"]')
  const localName = 'บุคลากรระหว่างทดสอบการเชื่อมต่อ'
  await expect(name).toBeEditable()
  await name.fill(localName)
  const buffer = await sharp({ create: { width: 2400, height: 3200, channels: 3, background: '#767abe' } }).png().toBuffer()
  const input = page.locator('.cms-team-member-editor input[type="file"]')
  await input.setInputFiles({ name: 'recoverable-portrait.png', mimeType: 'image/png', buffer })
  const preview = page.locator('.cms-team-portrait-preview img')
  await expect(preview).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => preview.evaluate((image) => ({
    width: (image as HTMLImageElement).naturalWidth, height: (image as HTMLImageElement).naturalHeight,
  }))).toEqual({ width: 1650, height: 2200 })
  const preparedSrc = await preview.getAttribute('src')
  const save = page.locator('.cms-team-member-editor button[type="submit"]')
  await expect(save).toBeEnabled()
  expect(observed.uploads).toBe(0)
  expect(observed.saves).toBe(0)

  for (const [index, failure] of (['server', 'network', 'session'] as const).entries()) {
    observed.failure = failure
    await save.click()
    await expect(page.locator('.cms-team-member-editor .cms-error')).toContainText(failure === 'server' ? /Simulated upload unavailable/ : failure === 'network' ? /fetch|network|failed/i : /เซสชัน|session/i)
    await expect(save).toBeEnabled()
    await expect(preview).toHaveAttribute('src', preparedSrc!)
    await expect(name).toHaveValue(localName)
    await expect(name).toBeEditable()
    await expect(input).toBeEnabled()
    await expect(page.locator('.cms-team-recovery')).toHaveCount(0)
    expect(observed.uploads).toBe(index + 1)
    expect(observed.saves).toBe(0)
    expect(observed.cleanup).toBe(0)
  }
  await expect(page).toHaveURL(origin + destination)
  await expect(page.locator('.cms-session-banner')).toContainText(/เซสชันหมดอายุ|session expired/i)
  await expect(page.locator('.cms-session-banner a')).toHaveAttribute('target', '_blank')
  expect(await directory.findOne({ _id: 'about-teams' })).toEqual(before)
  expect(await db.collection('cmsStagedProjectMedia').countDocuments({})).toBe(stagedCount)
})
