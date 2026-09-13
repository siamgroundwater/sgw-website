import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { MongoClient, ObjectId } from 'mongodb'
import { randomBytes, randomUUID, scryptSync } from 'node:crypto'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB || !origin || !password) {
  throw new Error('Run CMS access tests through npm run test:e2e:cms; the runner must provide its isolated database and test credentials.')
}
const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

async function english(page: Page) {
  await page.context().addCookies([{ name: 'sgw_cms_locale', value: 'en', domain: new URL(origin).hostname, path: '/cms', sameSite: 'Lax' }])
}

async function signIn(request: APIRequestContext, username = 'qa-admin', secret = password) {
  const response = await request.post('/api/cms/auth/login', { headers: { Origin: origin }, data: { username, password: secret } })
  expect(response.ok(), 'The isolated test account should sign in.').toBeTruthy()
}

test('account password change rejects an incorrect current password and invalidates every old session', async ({ page, playwright }) => {
  const id = new ObjectId()
  const username = 'qa-access-' + randomUUID().slice(0, 8)
  const nextPassword = randomBytes(24).toString('base64url')
  const salt = randomBytes(16).toString('base64url')
  // This account belongs only to this test; shared qa-* accounts are never reset.
  await db.collection('cmsUsers').insertOne({
    _id: id, name: 'Account access test', username, usernameLower: username,
    role: 'viewer', status: 'active', email: '',
    passwordHash: `scrypt$${salt}$${scryptSync(password, salt, 64).toString('base64url')}`,
    createdAt: new Date(), updatedAt: new Date(),
  })
  const secondSession = await playwright.request.newContext({ baseURL: origin })
  try {
    await english(page)
    await signIn(page.request, username)
    await signIn(secondSession, username)
    await page.goto('/cms/account')
    await expect(page.getByRole('heading', { name: 'My account', exact: true })).toBeVisible()
    await page.locator('[name="currentPassword"]').fill('incorrect-current-password')
    await page.locator('[name="newPassword"]').fill(nextPassword)
    await page.locator('[name="confirmation"]').fill(nextPassword)
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Change password', exact: true }).click()
    await expect(page.locator('#account-error')).toHaveText('Your current password is incorrect.')
    await expect(page.locator('[name="currentPassword"]')).toBeFocused()
    expect((await secondSession.get('/api/cms/auth/me')).status()).toBe(200)

    await page.locator('[name="currentPassword"]').fill(password)
    page.once('dialog', dialog => dialog.accept())
    const changed = page.waitForResponse(response => response.url().endsWith('/api/cms/account/password') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Change password', exact: true }).click()
    expect((await changed).status()).toBe(200)
    await expect(page.locator('.cms-account-panel')).toContainText('Password changed. All devices are signed out.')
    expect((await page.request.get('/api/cms/auth/me')).status()).toBe(401)
    expect((await secondSession.get('/api/cms/auth/me')).status()).toBe(401)
    const oldLogin = await secondSession.post('/api/cms/auth/login', { headers: { Origin: origin }, data: { username, password } })
    expect(oldLogin.status()).toBe(401)
    await signIn(secondSession, username, nextPassword)
    expect((await secondSession.get('/api/cms/auth/me')).status()).toBe(200)
    const account = await db.collection('cmsUsers').findOne({ _id: id }, { projection: { sessionVersion: 1, sessionsRevokedAt: 1 } })
    expect(account?.sessionVersion).toBe(1)
    expect(account?.sessionsRevokedAt).toBeInstanceOf(Date)
    const audit = await db.collection('cmsAuditLogs').findOne({ 'entity.id': String(id), action: 'user.update' })
    expect(audit?.changes).toContainEqual({ field: 'Password', before: null, after: 'Changed; all sessions signed out' })
  } finally {
    await secondSession.dispose()
    // The root runner drops the exact temporary database, including this account.
  }
})

test('dedicated user pages validate locally, protect dirty changes, and expose editing controls', async ({ page }) => {
  await english(page)
  await signIn(page.request)
  await page.goto('/cms/users')
  await page.getByRole('link', { name: 'Add user', exact: true }).click()
  await expect(page).toHaveURL(/\/cms\/users\/add$/)
  await expect(page.locator('[name="name"]')).toBeFocused()
  let writes = 0
  page.on('request', request => { if (request.url().endsWith('/api/cms/users') && request.method() === 'POST') writes++ })
  await page.locator('[name="name"]').fill('Validation test')
  await page.locator('[name="username"]').fill('x')
  await page.locator('[name="email"]').fill('invalid-email')
  await page.locator('[name="password"]').fill('short')
  await page.locator('[name="passwordConfirmation"]').fill('short')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.locator('[name="password"]')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await expect(page.locator('[name="password"]')).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Save user', exact: true }).click()
  await expect(page.locator('#user-username-error')).toContainText('3–80')
  await expect(page.locator('#user-email-error')).toHaveText('Enter a valid email address.')
  await expect(page.locator('#user-password-error')).toContainText('12–256')
  await expect(page.locator('[name="username"]')).toBeFocused()
  expect(writes).toBe(0)

  await page.locator('[name="password"]').fill('new-password-123')
  await page.locator('[name="passwordConfirmation"]').fill('different-password-456')
  await page.getByRole('button', { name: 'Save user', exact: true }).click()
  await expect(page.locator('#user-passwordConfirmation-error')).toHaveText('The passwords do not match.')
  expect(writes).toBe(0)

  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('[name="name"]')).toHaveValue('Validation test')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('link', { name: 'Cancel', exact: true }).click()
  await expect(page).toHaveURL(/\/cms\/users$/)

  const usersResponse = await page.request.get('/api/cms/users')
  const usersPayload = await usersResponse.json() as { users: Array<{ id: string; username: string }> }
  const editor = usersPayload.users.find(user => user.username === 'qa-editor')
  expect(editor).toBeTruthy()
  await page.goto(`/cms/users/edit?id=${editor!.id}`)
  await expect(page.getByRole('heading', { name: 'Edit CMS user' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete user', exact: true })).toBeVisible()
  await expect(page.locator('[name="username"]')).toHaveValue('qa-editor')

  await page.goto('/cms/users')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.cms-mobile-field-label').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('audit filters preserve actor, project, action, and Bangkok date across pagination', async ({ page }) => {
  const marker = 'qa-audit-' + randomUUID().slice(0, 8)
  const projectId = process.env.CMS_E2E_SOURCE_ID!
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const noon = new Date(`${today}T12:00:00+07:00`).getTime()
  const expiresAt = new Date(Date.now() + 365 * 86_400_000)
  await db.collection('cmsAuditLogs').insertMany(Array.from({ length: 28 }, (_, index) => ({
    action: index === 27 ? 'content.create' : 'content.update',
    actor: { userId: process.env.CMS_E2E_ADMIN_ID, displayName: marker, username: marker, role: 'admin' },
    entity: { id: projectId, type: 'project', label: 'Audit pagination fixture' },
    createdAt: new Date(noon - index * 1000), expiresAt, summary: `Audit check ${index}`,
    changes: [{ field: 'Title', before: 'Before', after: `After ${index}` }],
  })))
  await english(page)
  await signIn(page.request)
  await page.goto('/cms/audit-logs')
  await page.locator('[name="actor"]').fill(marker)
  await page.locator('[name="project"]').fill(projectId)
  await page.locator('[name="action"]').selectOption('content.update')
  await page.locator('[name="from"]').fill(today)
  await page.locator('[name="to"]').fill(today)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('.cms-access-table tbody tr')).toHaveCount(25)
  await expect(page.getByText('27 matching changes', { exact: true })).toBeVisible()
  await expect(page.locator('.cms-audit-pagination')).toContainText('Page 1 of 2')
  await expect(page.locator('.cms-audit-project-link').first()).toHaveAttribute('href', '/cms/projects/' + projectId)
  await page.getByRole('link', { name: 'Next', exact: true }).click()
  await expect(page.locator('.cms-access-table tbody tr')).toHaveCount(2)
  await expect(page.locator('.cms-audit-pagination')).toContainText('Page 2 of 2')
  const params = new URL(page.url()).searchParams
  expect(params.get('actor')).toBe(marker)
  expect(params.get('project')).toBe(projectId)
  expect(params.get('action')).toBe('content.update')
  expect(params.get('from')).toBe(today)
  expect(params.get('to')).toBe(today)
  await page.locator('summary').first().click()
  await expect(page.locator('.cms-audit-change-list').first()).toContainText('Before')
  await page.locator('[name="action"]').selectOption('user.delete')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('No changes match these filters.', { exact: true })).toBeVisible()
})

test('login shows a Retry-After cooldown without exhausting real login attempts', async ({ page }) => {
  await english(page)
  await page.route('**/api/cms/auth/login', route => route.fulfill({
    status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '2' },
    body: JSON.stringify({ error: 'Too many failed attempts. Try again later.' }),
  }))
  await page.goto('/cms/login')
  await page.locator('input[autocomplete="username"]').fill('qa-admin')
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeDisabled()
  await expect(submit).toContainText('Try again in')
  await expect(page.locator('.cms-error')).toContainText('Too many attempts. Wait before trying again.')
  await expect(submit).toHaveText('Sign in', { timeout: 5000 })
  await expect(submit).toBeEnabled()
})
