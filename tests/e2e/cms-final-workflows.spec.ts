import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { MongoClient, ObjectId } from 'mongodb'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB || !password || !origin) {
  throw new Error('Run these workflows through the isolated CMS test runner.')
}
const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
const execute = promisify(execFile)
test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

test('user create, edit, password reset, disable and delete persist and revoke access', async ({ page, playwright }) => {
  await page.context().addCookies([{ name: 'sgw_cms_locale', value: 'en', domain: new URL(origin).hostname, path: '/cms' }])
  const login = await page.request.post('/api/cms/auth/login', {
    headers: { Origin: origin }, data: { username: 'qa-admin', password },
  })
  expect(login.status()).toBe(200)
  const username = 'qa-lifecycle-' + randomUUID().slice(0, 8)
  const secret = randomBytes(24).toString('base64url')
  const replacementSecret = randomBytes(24).toString('base64url')
  await page.goto('/cms/users/add')
  await page.locator('[name="name"]').fill('User workflow check')
  await page.locator('[name="username"]').fill(username)
  await page.locator('[name="email"]').fill('cms-workflow@example.invalid')
  await page.locator('[name="password"]').fill(secret)
  await page.locator('[name="passwordConfirmation"]').fill(secret)
  await page.locator('[name="role"]').selectOption('editor')
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/cms/users') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Save user', exact: true }).click()
  const created = await createdResponse
  expect(created.status()).toBe(201)
  const { user } = await created.json()
  await expect(page).toHaveURL(/\/cms\/users\?created=1$/)
  const stored = await db.collection('cmsUsers').findOne({ _id: new ObjectId(user.id) })
  expect(stored?.passwordHash.startsWith('scrypt$')).toBe(true)
  expect(JSON.stringify(user).includes(secret)).toBe(false)
  const session = await playwright.request.newContext({ baseURL: origin })
  try {
    const signIn = (value: string) => session.post('/api/cms/auth/login', {
      headers: { Origin: origin }, data: { username, password: value },
    })
    expect((await signIn(secret)).status()).toBe(200)
    expect((await session.get('/api/cms/projects')).status()).toBe(200)
    await page.goto(`/cms/users/edit?id=${user.id}`)
    await page.locator('[name="name"]').fill('Updated workflow check')
    await page.locator('[name="role"]').selectOption('viewer')
    await page.locator('[name="password"]').fill(replacementSecret)
    await page.locator('[name="passwordConfirmation"]').fill(replacementSecret)
    await page.getByRole('button', { name: 'Save user', exact: true }).click()
    await expect(page).toHaveURL(/\/cms\/users\?updated=1$/)
    expect((await session.get('/api/cms/auth/me')).status()).toBe(401)
    expect((await signIn(secret)).status()).toBe(401)
    expect((await signIn(replacementSecret)).status()).toBe(200)
    expect((await session.get('/api/cms/users')).status()).toBe(403)
    await page.goto(`/cms/users/edit?id=${user.id}`)
    await expect(page.locator('[name="name"]')).toHaveValue('Updated workflow check')
    await expect(page.locator('[name="role"]')).toHaveValue('viewer')
    await page.locator('[name="status"]').selectOption('draft')
    await page.getByRole('button', { name: 'Save user', exact: true }).click()
    await expect(page).toHaveURL(/\/cms\/users\?updated=1$/)
    expect((await session.get('/api/cms/auth/me')).status()).toBe(401)
    expect((await signIn(replacementSecret)).status()).toBe(401)
    await page.goto(`/cms/users/edit?id=${user.id}`)
    await page.locator('[name="status"]').selectOption('active')
    await page.getByRole('button', { name: 'Save user', exact: true }).click()
    await expect(page).toHaveURL(/\/cms\/users\?updated=1$/)
    expect((await signIn(replacementSecret)).status()).toBe(200)
    await page.goto(`/cms/users/edit?id=${user.id}`)
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Delete user', exact: true }).click()
    await expect(page).toHaveURL(/\/cms\/users\?removed=1$/)
    expect((await session.get('/api/cms/auth/me')).status()).toBe(401)
    expect((await signIn(replacementSecret)).status()).toBe(401)
    const deleted = await db.collection('cmsUsers').findOne({ _id: new ObjectId(user.id) })
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
    const audits = await db.collection('cmsAuditLogs').find({ 'entity.id': user.id }).toArray()
    expect(audits.map(entry => entry.action)).toEqual(expect.arrayContaining(['user.create', 'user.update', 'user.delete']))
  } finally { await session.dispose() }
})

test('encrypted backup verifies and restores the complete isolated database', async () => {
  test.setTimeout(120_000)
  const target = 'sgw_restore_qa_' + Date.now() + '_' + randomBytes(4).toString('hex')
  expect(target).not.toBe(database)
  expect(await client.db(target).listCollections().toArray()).toHaveLength(0)
  const env = { ...process.env, CMS_BACKUP_KEY: randomBytes(32).toString('base64') }
  let backupFile: string | undefined
  let restoreStarted = false
  const run = async (args: string[]) => {
    const { stdout } = await execute(process.execPath, ['scripts/cms-backup.mjs', ...args], {
      env, windowsHide: true, timeout: 90_000, maxBuffer: 1024 * 1024,
    })
    return JSON.parse(stdout)
  }
  try {
    const backup = await run(['backup'])
    backupFile = path.resolve(backup.backup)
    expect(backup.verified).toBe(true)
    expect(backup.database).toBe(database)
    expect(path.dirname(backupFile)).toBe(path.resolve('.cms-backups'))
    expect(backup.collections.some((entry: { name: string }) => entry.name === 'cmsUsers')).toBe(true)
    const verified = await run(['verify', '--file=' + backupFile])
    expect(verified.verified).toBe(true)
    restoreStarted = true
    const restored = await run(['restore', '--file=' + backupFile, '--database=' + target])
    expect(restored.restoredAndVerified).toBe(true)
    expect(restored.targetDatabase).toBe(target)
    for (const entry of backup.collections) {
      expect(await client.db(target).collection(entry.name).countDocuments()).toBe(entry.count)
    }
  } finally {
    if (restoreStarted && /^sgw_restore_qa_[0-9]+_[a-f0-9]{8}$/.test(target) && target !== database && target !== process.env.CMS_E2E_SOURCE_DATABASE) {
      await client.db(target).dropDatabase()
    }
    if (backupFile && path.dirname(backupFile) === path.resolve('.cms-backups') && /^cms-[0-9TZ-]+\.sgwbackup$/.test(path.basename(backupFile))) {
      await unlink(backupFile)
    }
  }
})
