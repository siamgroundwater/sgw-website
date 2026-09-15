import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient, ObjectId } from 'mongodb'
import sharp from 'sharp'
import { chromium, expect } from '@playwright/test'
import { assertMissingProjectPage } from './lib/page-response-assertions.mjs'

if (process.argv.includes('--help')) {
  console.log('Opt-in provider suite. Run through scripts/run-e2e-cms-project-workflow.mjs --media to allocate a fresh database/server. Never run against an existing account/database.')
  process.exit(0)
}

const databaseName = process.env.CMS_E2E_DATABASE || ''
const rootFolder = process.env.CLOUDINARY_ROOT_FOLDER || ''
const sourceDatabase = process.env.CMS_E2E_SOURCE_DATABASE
const baseUrl = (process.env.CMS_E2E_BASE_URL || '').replace(/\/$/, '')
const password = process.env.CMS_E2E_PASSWORD
const adminId = process.env.CMS_E2E_ADMIN_ID || ''
if (process.env.CMS_E2E_MEDIA !== 'true'
  || !/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(databaseName)
  || process.env.MONGODB_DB !== databaseName
  || databaseName === sourceDatabase
  || !rootFolder.endsWith('/e2e/' + databaseName)) {
  throw new Error('Refusing provider tests without a fresh isolated runner database and its dedicated media root.')
}
const origin = new URL(baseUrl)
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(origin.hostname) || !origin.port) throw new Error('Provider tests require the isolated loopback test server.')
for (const name of ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CRON_SECRET']) {
  if (!process.env[name]) throw new Error(name + ' is required by the isolated runner.')
}
if (!password || !ObjectId.isValid(adminId)) throw new Error('The isolated runner credentials are required.')
if (process.env.CLOUDINARY_CLOUD_NAME === 'isolated-test-no-provider') throw new Error('The provider suite needs explicitly selected real Cloudinary credentials.')

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, secure: true,
})
const client = new MongoClient(process.env.MONGODB_URI, { appName: 'sgw-isolated-media-e2e', serverSelectionTimeoutMS: 10000 })
const database = client.db(databaseName)
const assets = new Map()
const projectIds = new Set()
const revisionIds = []
const operationIds = new Set()
const submissionIds = new Set()
const siteMediaSections = new Set()
const teamOperationIds = new Set()
let ownsTeamDirectory = false
let browser
const browserObservations = []
const browserObservationErrors = []
const prefix = 'qa-media-' + randomUUID()
let headers
let connected = false
let cleanupAllowed = false

function operation() { const id = randomUUID(); operationIds.add(id); return id }
function teamOperation() { const id = randomUUID(); teamOperationIds.add(id); return id }
function ownAsset(asset) {
  assert.ok(asset.publicId.startsWith(rootFolder + '/'), 'Refusing an asset outside the freshly allocated test root')
  assets.set(asset.publicId, asset)
}
async function request(pathname, method = 'GET', body, expectedStatus) {
  const response = await fetch(baseUrl + pathname, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000),
  })
  const payload = await response.json().catch(() => ({}))
  if (expectedStatus !== undefined) assert.equal(response.status, expectedStatus, method + ' ' + pathname + ': ' + JSON.stringify(payload))
  else assert.ok(response.ok, method + ' ' + pathname + ': ' + JSON.stringify(payload))
  return payload
}
async function upload(label) {
  const submissionId = randomUUID()
  submissionIds.add(submissionId)
  const form = new FormData()
  form.append('file', new File([await readFile('public/images/about/teams/icon-service-3.png')], label + '.png', { type: 'image/png' }))
  form.append('slug', prefix + '-' + label)
  form.append('submissionId', submissionId)
  const response = await fetch(baseUrl + '/api/cms/projects/media', {
    method: 'POST', headers: { Cookie: headers.Cookie, Origin: baseUrl },
    body: form, signal: AbortSignal.timeout(45000),
  })
  const payload = await response.json().catch(() => ({}))
  assert.equal(response.status, 201, JSON.stringify(payload))
  assert.ok(payload.staged?.asset?.publicId && payload.staged?.token)
  ownAsset(payload.staged.asset)
  return { ...payload.staged, submissionId }
}
async function uploadManagedImage(label, section, width = 800, height = 600, submissionId = randomUUID()) {
  submissionIds.add(submissionId)
  const buffer = await sharp({ create: { width, height, channels: 3, background: '#157f91' } }).png().toBuffer()
  const form = new FormData()
  form.append('file', new File([buffer], label + '.png', { type: 'image/png' }))
  form.append('submissionId', submissionId)
  if (section) form.append('section', section)
  const pathname = section ? '/api/cms/media/upload' : '/api/cms/team-members/media'
  const response = await fetch(baseUrl + pathname, {
    method: 'POST', headers: { Cookie: headers.Cookie, Origin: baseUrl },
    body: form, signal: AbortSignal.timeout(45000),
  })
  const payload = await response.json().catch(() => ({}))
  assert.equal(response.status, 201, pathname + ': ' + JSON.stringify(payload))
  assert.ok(payload.staged?.asset?.publicId && payload.staged?.token)
  ownAsset(payload.staged.asset)
  assert.equal(payload.staged.asset.width, width)
  assert.equal(payload.staged.asset.height, height)
  return { ...payload.staged, submissionId }
}
async function assertPublicImage(pathname, src) {
  const response = await fetch(baseUrl + pathname, { signal: AbortSignal.timeout(45000) })
  assert.equal(response.status, 200, pathname)
  const html = await response.text()
  assert.ok(html.includes(src) || html.includes(encodeURIComponent(src)), pathname + ' must use the saved image')
  return html
}
async function saveSiteImages(section, images, previous, uploaded) {
  siteMediaSections.add(section)
  const staged = Array.isArray(uploaded) ? uploaded : uploaded ? [uploaded] : []
  assert.ok(staged.every(item => item.submissionId === staged[0].submissionId))
  const payload = await request('/api/cms/media', 'PUT', {
    section, images, expectedUpdatedAt: previous.updatedAt,
    ...(staged.length ? { stagedMedia: staged.map(item => item.token), submissionId: staged[0].submissionId } : {}),
  })
  assert.deepEqual(payload.item.images, images)
  assert.equal(payload.item.fallback, false)
  const stored = await database.collection('cmsSiteMedia').findOne({ _id: section })
  assert.deepEqual(stored.images.map(({ src }) => src), images)
  for (const item of staged) {
    assert.equal(await database.collection('cmsStagedProjectMedia').countDocuments({ 'asset.publicId': item.asset.publicId }), 0)
    assert.equal(stored.images.find(({ src }) => src === item.asset.src).asset.publicId, item.asset.publicId)
  }
  return payload.item
}
async function checkBrowserDeferredMedia(memberSaved) {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const separator = headers.Cookie.indexOf('=')
  await context.addCookies([{
    name: headers.Cookie.slice(0, separator), value: headers.Cookie.slice(separator + 1),
    url: baseUrl, httpOnly: true, sameSite: 'Lax',
  }])
  const page = await context.newPage()
  page.setDefaultTimeout(45000)
  page.setDefaultNavigationTimeout(45000)
  const uploadRequests = []
  const browserSaveSubmissions = new Set()
  const browserMemberOperations = new Set()
  const uploadPaths = new Set(['/api/cms/media/upload', '/api/cms/team-members/media'])
  page.on('request', (outgoing) => {
    const pathname = new URL(outgoing.url()).pathname
    if (outgoing.method() === 'POST' && uploadPaths.has(pathname)) {
      uploadRequests.push(pathname)
      const submissionId = outgoing.postDataBuffer()?.toString('utf8').match(/name="submissionId"\r\n\r\n([A-Za-z0-9_-]{8,100})\r\n/)?.[1]
      if (submissionId) submissionIds.add(submissionId)
    }
    if (outgoing.method() === 'PUT' && ['/api/cms/media', '/api/cms/team-members'].includes(pathname)) {
      try {
        const body = outgoing.postDataJSON()
        if (typeof body.submissionId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.submissionId)) throw new Error('Missing save submission id')
        submissionIds.add(body.submissionId)
        browserSaveSubmissions.add(body.submissionId)
        if (pathname === '/api/cms/team-members') {
          if (typeof body.operationId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.operationId)) throw new Error('Missing member operation id')
          teamOperationIds.add(body.operationId)
          browserMemberOperations.add(body.operationId)
        } else {
          if (body.section !== 'service-survey') throw new Error('Unexpected browser media section')
          siteMediaSections.add(body.section)
        }
      } catch { browserObservationErrors.push(new Error('Browser media/member save ownership could not be tracked')) }
    }
  })
  page.on('response', (response) => {
    if (response.request().method() !== 'POST' || !uploadPaths.has(new URL(response.url()).pathname)) return
    browserObservations.push((async () => {
      const payload = await response.json()
      if (payload.staged?.asset) ownAsset(payload.staged.asset)
    })().catch(() => { browserObservationErrors.push(new Error('Browser upload response could not be tracked')) }))
  })
  const matchesResponse = (pathname, method) => (response) => new URL(response.url()).pathname === pathname && response.request().method() === method

  await page.goto('/cms/media/service-survey')
  const heroInput = page.locator('[data-field="coverImage"] input[type="file"]')
  await expect(heroInput).toBeEnabled()
  const heroBuffer = await sharp({ create: { width: 3200, height: 1800, channels: 3, background: '#8ba942' } }).png().toBuffer()
  await heroInput.setInputFiles({ name: 'browser-service-hero.png', mimeType: 'image/png', buffer: heroBuffer })
  const heroPending = page.locator('[data-field="coverImage"] .cms-media-item-pending img')
  await expect(heroPending).toHaveAttribute('src', /^blob:/)
  await expect(page.locator('.cms-compression-progress')).toHaveCount(0, { timeout: 45000 })
  const heroSave = page.locator('.cms-site-media-actions button[type="submit"]')
  await expect(heroSave).toBeEnabled()
  assert.equal(uploadRequests.length, 0, 'Selecting/compressing the service hero must not upload it')
  const [heroUploadResponse, heroSaveResponse] = await Promise.all([
    page.waitForResponse(matchesResponse('/api/cms/media/upload', 'POST')),
    page.waitForResponse(matchesResponse('/api/cms/media', 'PUT')),
    heroSave.click(),
  ])
  assert.equal(heroUploadResponse.status(), 201)
  assert.equal(heroSaveResponse.status(), 200)
  const heroUpload = (await heroUploadResponse.json()).staged
  ownAsset(heroUpload.asset)
  assert.equal(heroUpload.asset.width, 2200, 'The real browser must resize the oversized hero before upload')
  assert.equal(heroUpload.asset.height, 1238)
  await expect(page.locator('.cms-media-item-pending')).toHaveCount(0)
  await expect(page.locator('.cms-site-media-editor .cms-message').last()).toContainText(/บันทึกแล้ว|Saved/)
  assert.equal((await request('/api/cms/media?section=service-survey')).item.images[0], heroUpload.asset.src)
  await assertPublicImage('/en/services/survey', heroUpload.asset.src)

  const memberId = memberSaved.item.id
  await page.goto(`/cms/teams/${memberSaved.item.teamId}/members/${memberId}`)
  const portraitInput = page.locator('.cms-team-member-editor input[type="file"]')
  await expect(portraitInput).toBeEnabled()
  const portraitBuffer = await sharp({ create: { width: 2400, height: 3200, channels: 3, background: '#536dc4' } }).png().toBuffer()
  const uploadsBeforePortrait = uploadRequests.length
  await portraitInput.setInputFiles({ name: 'browser-portrait.png', mimeType: 'image/png', buffer: portraitBuffer })
  await expect(page.locator('.cms-team-portrait-preview img')).toHaveAttribute('src', /^blob:/)
  const portraitSave = page.locator('.cms-team-member-editor button[type="submit"]')
  await expect(portraitSave).toBeEnabled()
  assert.equal(uploadRequests.length, uploadsBeforePortrait, 'Selecting/compressing the portrait must not upload it')
  const [portraitUploadResponse, portraitSaveResponse] = await Promise.all([
    page.waitForResponse(matchesResponse('/api/cms/team-members/media', 'POST')),
    page.waitForResponse(matchesResponse('/api/cms/team-members', 'PUT')),
    portraitSave.click(),
  ])
  assert.equal(portraitUploadResponse.status(), 201)
  assert.equal(portraitSaveResponse.status(), 200)
  const portraitUpload = (await portraitUploadResponse.json()).staged
  ownAsset(portraitUpload.asset)
  assert.equal(portraitUpload.asset.width, 1650, 'The real browser must resize the oversized portrait before upload')
  assert.equal(portraitUpload.asset.height, 2200)
  const savedMember = await portraitSaveResponse.json()
  await expect(page.locator('.cms-team-member-editor .cms-message').last()).toContainText(/บันทึกแล้ว|Saved/)
  await expect(page.locator('.cms-team-portrait-preview img')).toHaveAttribute('src', portraitUpload.asset.src)
  assert.equal((await request('/api/cms/team-members?id=' + memberId)).item.imageSrc, portraitUpload.asset.src)
  await assertPublicImage('/about', portraitUpload.asset.src)
  await Promise.all(browserObservations)
  assert.equal(browserObservationErrors.length, 0, 'Browser upload/save ownership tracking must complete')
  assert.equal(browserSaveSubmissions.size, 2, 'Both JSON save requests must provide tracked submission ids')
  assert.equal(browserMemberOperations.size, 1, 'The member save must provide a tracked operation id')
  assert.equal(uploadRequests.length, 2, 'Each Save should upload exactly one newly selected image')
  await context.close()
  await browser.close()
  browser = undefined
  console.log('Real browser media workflows passed: local selection/compression, no early upload, Save, Cloudinary/MongoDB persistence and public readback for service hero and team portrait.')
  return savedMember
}
function content(asset, name) {
  return {
    category: ['other'], coverImage: asset.src, details: ['รายละเอียดสำหรับทดสอบ'], galleryImages: [],
    lat: 13.7563, lng: 100.5018, location: 'กรุงเทพมหานคร', slug: prefix + '-' + name,
    status: 'active', summary: 'ผลงานสำหรับทดสอบการบันทึกเท่านั้น', title: 'ผลงานทดสอบ ' + name,
    translations: { en: { details: ['Isolated media test'], location: 'Bangkok', summary: 'Isolated single-Save media verification.', title: 'Media test ' + name } },
    workTypes: ['groundwater-survey'], year: new Date().getFullYear(),
    mediaMetadata: { [asset.src]: { alt: 'Test image', caption: 'Isolated media verification' } },
  }
}
async function assertAssetExists(publicId) {
  const result = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' })
  assert.equal(result.public_id, publicId)
}
async function assertAssetAbsent(publicId) {
  try {
    await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' })
  } catch (error) {
    assert.equal(error?.error?.http_code || error?.http_code, 404, 'Expected a confirmed provider 404, not another provider failure')
    return
  }
  assert.fail('The temporary asset still exists: ' + publicId)
}
async function runCleanup() {
  const response = await fetch(baseUrl + '/api/cron/cleanup-project-media', {
    headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET }, signal: AbortSignal.timeout(45000),
  })
  const payload = await response.json()
  assert.equal(response.status, 200, JSON.stringify(payload))
  assert.equal(payload.ok, true)
  return payload
}
async function stageExpired(asset, label) {
  const submissionId = prefix + '-' + label
  submissionIds.add(submissionId)
  await database.collection('cmsStagedProjectMedia').insertOne({
    asset, userId: adminId, submissionId,
    createdAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 60000),
  })
}

try {
  await client.connect()
  connected = true
  const seededAdmin = await database.collection('cmsUsers').findOne({ _id: new ObjectId(adminId), username: 'qa-admin', role: 'admin' })
  assert.ok(seededAdmin, 'Fresh runner administrator was not found in the isolated database')
  cleanupAllowed = true
  const login = await fetch(baseUrl + '/api/cms/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ username: 'qa-admin', password }), signal: AbortSignal.timeout(30000),
  })
  const loginPayload = await login.json().catch(() => ({}))
  assert.equal(login.status, 200, JSON.stringify(loginPayload))
  const cookie = (login.headers.get('set-cookie') || '').split(';', 1)[0]
  assert.ok(cookie.includes('sgw_cms_session='))
  headers = { 'Content-Type': 'application/json', Origin: baseUrl, Cookie: cookie }
  const me = await request('/api/cms/auth/me')
  assert.equal(me.user?.userId || me.session?.userId || me.userId, adminId, 'The HTTP server must use the same fresh isolated database')

  assert.ok((await database.collection('cmsStagedProjectMedia').listIndexes().toArray()).some(({ name }) => name === 'publicId_1'), 'The suite must begin with the obsolete production index')
  const firstUpload = await upload('first')
  assert.equal((await database.collection('cmsStagedProjectMedia').listIndexes().toArray()).some(({ name }) => name === 'publicId_1'), false, 'The application must repair the obsolete staging index')
  const firstBody = {
    ...content(firstUpload.asset, 'first'), operationId: operation(),
    stagedMedia: [firstUpload.token], submissionId: firstUpload.submissionId,
  }
  const created = await request('/api/cms/projects', 'POST', firstBody, 201)
  projectIds.add(created.item.id)
  assert.equal(created.item.status, 'active')
  assert.equal(await database.collection('cmsStagedProjectMedia').countDocuments({ 'asset.publicId': firstUpload.asset.publicId }), 0)
  const replay = await request('/api/cms/projects', 'POST', firstBody, 200)
  assert.equal(replay.item.id, created.item.id)
  assert.equal(replay.replayed, true)
  assert.equal(await database.collection('cmsProjects').countDocuments({ slug: firstBody.slug }), 1)
  assert.equal((await request('/api/cms/projects?operationId=' + firstBody.operationId)).item.id, created.item.id)
  const live = await fetch(baseUrl + '/en/projects/' + created.item.id, { signal: AbortSignal.timeout(45000) })
  assert.equal(live.status, 200)
  assert.match(await live.text(), /Media test first/)
  await request('/api/cms/projects/media', 'DELETE', { submissionId: firstUpload.submissionId, tokens: [firstUpload.token] }, 400)
  await assertAssetExists(firstUpload.asset.publicId)

  const invalidUpload = await upload('invalid')
  await request('/api/cms/projects', 'POST', {
    ...content(invalidUpload.asset, 'invalid'), summary: '', operationId: operation(),
    stagedMedia: [invalidUpload.token], submissionId: invalidUpload.submissionId,
  }, 400)
  assert.equal(await database.collection('cmsStagedProjectMedia').countDocuments({ 'asset.publicId': invalidUpload.asset.publicId }), 0)
  await assertAssetAbsent(invalidUpload.asset.publicId)

  const orphan = await upload('orphan')
  await database.collection('cmsStagedProjectMedia').updateOne(
    { 'asset.publicId': orphan.asset.publicId, userId: adminId },
    { $set: { expiresAt: new Date(Date.now() - 60000) } },
  )
  assert.equal((await runCleanup()).removed, 1)
  await assertAssetAbsent(orphan.asset.publicId)

  // Historical content remains a protected recovery reference, without exposing a publishing workflow.
  const snapshot = await database.collection('cmsProjects').findOne({ _id: new ObjectId(created.item.id) })
  const revisionId = new ObjectId()
  revisionIds.push(revisionId)
  await database.collection('cmsProjectRevisions').insertOne({
    _id: revisionId, projectId: snapshot._id, content: snapshot, version: 1,
    publishedAt: new Date(), publishedBy: 'Isolated historical media fixture',
  })
  const replacement = await upload('replacement')
  const updatedBody = {
    ...content(replacement.asset, 'first'), id: created.item.id,
    expectedUpdatedAt: created.item.updatedAt, operationId: operation(),
    stagedMedia: [replacement.token], submissionId: replacement.submissionId,
  }
  const updated = await request('/api/cms/projects', 'PUT', updatedBody)
  assert.equal(updated.item.coverImage, replacement.asset.src)
  assert.equal((await request('/api/cms/projects', 'PUT', updatedBody)).item.updatedAt, updated.item.updatedAt)
  await stageExpired(firstUpload.asset, 'historical')
  assert.equal((await runCleanup()).preserved, 1)
  await assertAssetExists(firstUpload.asset.publicId)

  const trashed = await request('/api/cms/projects', 'DELETE', {
    id: created.item.id, expectedUpdatedAt: updated.item.updatedAt, operationId: operation(),
  })
  await stageExpired(replacement.asset, 'trash-protection')
  assert.equal((await runCleanup()).preserved, 1)
  await assertAssetExists(replacement.asset.publicId)
  const trashedRoute = '/projects/' + created.item.id
  const trashedPage = await fetch(baseUrl + trashedRoute, { redirect: 'manual', signal: AbortSignal.timeout(15_000) })
  assertMissingProjectPage(trashedPage.status, await trashedPage.text(), trashedRoute)
  const restored = await request('/api/cms/projects', 'PATCH', {
    action: 'restore', id: created.item.id, expectedUpdatedAt: trashed.item.updatedAt, operationId: operation(),
  })
  const cloned = await request('/api/cms/projects', 'POST', {
    ...content(replacement.asset, 'clone'), sourceProjectId: restored.item.id, operationId: operation(),
  })
  projectIds.add(cloned.item.id)
  assert.equal(cloned.item.coverImage, replacement.asset.src)
  assert.equal((await request('/api/cms/projects?id=' + restored.item.id)).item.status, 'active')
  console.log('Isolated Cloudinary suite passed: upload, live Save, replay, owned rollback, expiry cleanup, historical/trash protection, and image reuse.')

  // Managed website images use their own endpoints and section-bound staging.
  // Exercise each presentation type, including public fallback before first save.
  const serviceSection = 'service-survey'
  const serviceInitial = (await request('/api/cms/media?section=' + serviceSection)).item
  assert.equal(serviceInitial.fallback, true)
  await assertPublicImage('/services/survey', serviceInitial.images[0])
  const serviceHero = await uploadManagedImage('service-hero', serviceSection, 1600, 900)
  let serviceSaved = await saveSiteImages(serviceSection, [serviceHero.asset.src, ...serviceInitial.images.slice(1)], serviceInitial, serviceHero)
  const serviceGallery = await uploadManagedImage('service-gallery', serviceSection)
  serviceSaved = await saveSiteImages(serviceSection, [serviceHero.asset.src, serviceGallery.asset.src, ...serviceSaved.images.slice(1)], serviceSaved, serviceGallery)
  const reorderedGallery = [serviceHero.asset.src, ...serviceSaved.images.slice(1).reverse()]
  serviceSaved = await saveSiteImages(serviceSection, reorderedGallery, serviceSaved)
  const removedGallery = [serviceSaved.images[0], ...serviceSaved.images.slice(2)]
  serviceSaved = await saveSiteImages(serviceSection, removedGallery, serviceSaved)
  assert.ok(serviceSaved.images.includes(serviceGallery.asset.src))
  await assertPublicImage('/services/survey', serviceHero.asset.src)
  await assertPublicImage('/en/services/survey', serviceGallery.asset.src)
  await stageExpired(serviceHero.asset, 'site-reference-protection')
  assert.equal((await runCleanup()).preserved, 1)
  await assertAssetExists(serviceHero.asset.publicId)

  const rejectedSiteImage = await uploadManagedImage('site-conflict', serviceSection)
  await request('/api/cms/media', 'PUT', {
    section: serviceSection, images: [serviceHero.asset.src, rejectedSiteImage.asset.src],
    expectedUpdatedAt: serviceInitial.updatedAt,
    stagedMedia: [rejectedSiteImage.token], submissionId: rejectedSiteImage.submissionId,
  }, 409)
  await assertAssetAbsent(rejectedSiteImage.asset.publicId)
  assert.deepEqual((await request('/api/cms/media?section=' + serviceSection)).item.images, serviceSaved.images)

  const aboutInitial = (await request('/api/cms/media?section=about-hero')).item
  assert.equal(aboutInitial.fallback, true)
  const aboutSubmission = randomUUID()
  const aboutUploads = []
  for (let index = 0; index < 3; index += 1) {
    aboutUploads.push(await uploadManagedImage('about-slide-' + index, 'about-hero', 1800, 600, aboutSubmission))
  }
  assert.equal(await database.collection('cmsStagedProjectMedia').countDocuments({ submissionId: aboutSubmission }), 3, 'All three images must stage before a single Save')
  const aboutUpload = aboutUploads[0]
  let aboutSaved = await saveSiteImages('about-hero', [...aboutUploads.map(item => item.asset.src), ...aboutInitial.images], aboutInitial, aboutUploads)
  console.log('Three About hero images uploaded, staged together, and saved in one submission after index repair.')
  aboutSaved = await saveSiteImages('about-hero', [...aboutSaved.images].reverse(), aboutSaved)
  aboutSaved = await saveSiteImages('about-hero', aboutSaved.images.slice(1), aboutSaved)
  assert.equal(aboutSaved.images.at(-1), aboutUpload.asset.src)
  await assertPublicImage('/about', aboutUpload.asset.src)
  await assertPublicImage('/ja/about', aboutUpload.asset.src)

  for (const [section, pathname] of [['project-map', '/projects'], ['governance', '/governance']]) {
    const initial = (await request('/api/cms/media?section=' + section)).item
    assert.equal(initial.fallback, true)
    await assertPublicImage(pathname, initial.images[0])
    const uploaded = await uploadManagedImage(section, section, 1400, 2000)
    await saveSiteImages(section, [uploaded.asset.src], initial, uploaded)
    const html = await assertPublicImage(pathname, uploaded.asset.src)
    await assertPublicImage('/en' + pathname, uploaded.asset.src)
    if (section === 'governance') {
      const attachmentUrl = uploaded.asset.src.replace('/image/upload/', '/image/upload/fl_attachment:siam-groundwater-governance-poster/')
      assert.ok(html.includes(attachmentUrl), 'The poster download must target the saved Cloudinary image')
      const download = await fetch(attachmentUrl, { method: 'HEAD', signal: AbortSignal.timeout(45000) })
      assert.equal(download.status, 200)
      assert.match(download.headers.get('content-disposition') || '', /attachment/i)
    }
  }
  console.log('Managed website-media workflows passed: public fallback, hero/gallery/slides/high-resolution saves, reorder/removal, conflict rollback, live localized pages, image protection, and poster download.')

  // Portrait uploads have a different target, validation and transaction path.
  assert.equal(await database.collection('cmsTeamDirectory').countDocuments({}), 0)
  ownsTeamDirectory = true
  const initialTeams = await request('/api/cms/teams')
  const team = await request('/api/cms/teams', 'POST', {
    expectedRevision: initialTeams.revision, operationId: teamOperation(),
    input: { department: 'marketing', name: 'ทีมทดสอบภาพบุคลากร', order: 99, translations: { en: { name: 'Portrait workflow team' } } },
  }, 201)
  const portrait = await uploadManagedImage('portrait', undefined, 600, 800)
  const portraitInput = {
    teamId: team.result.teamId, name: 'บุคลากรทดสอบภาพ', title: 'ผู้เชี่ยวชาญทดสอบ', role: 'leader', order: 0,
    imageSrc: portrait.asset.src, certificates: ['ใบรับรองทดสอบ'],
    translations: { en: { name: 'Portrait workflow leader', title: '', certificates: ['Test credential'] } },
  }
  const portraitBody = {
    expectedRevision: team.result.revision, operationId: teamOperation(), input: portraitInput,
    stagedMedia: [portrait.token], submissionId: portrait.submissionId,
  }
  let memberSaved = await request('/api/cms/team-members', 'POST', portraitBody, 201)
  assert.equal(memberSaved.item.imageSrc, portrait.asset.src)
  assert.equal(memberSaved.item.imageAsset.publicId, portrait.asset.publicId)
  assert.equal(await database.collection('cmsStagedProjectMedia').countDocuments({ 'asset.publicId': portrait.asset.publicId }), 0)
  const portraitReplay = await request('/api/cms/team-members', 'POST', portraitBody, 201)
  assert.equal(portraitReplay.item.id, memberSaved.item.id)
  assert.equal(portraitReplay.recovered, true)
  const publicPortraitHtml = await assertPublicImage('/en/about', portrait.asset.src)
  assert.ok(publicPortraitHtml.includes('Portrait workflow leader'))
  assert.ok(publicPortraitHtml.includes(portraitInput.title), 'Empty English title must use Thai content')
  await assertPublicImage('/zh/about', portrait.asset.src)
  await stageExpired(portrait.asset, 'team-reference-protection')
  assert.equal((await runCleanup()).preserved, 1)
  await assertAssetExists(portrait.asset.publicId)

  const replacementPortrait = await uploadManagedImage('portrait-replacement', undefined, 600, 800)
  memberSaved = await request('/api/cms/team-members', 'PUT', {
    id: memberSaved.item.id, expectedRevision: memberSaved.result.revision, operationId: teamOperation(),
    input: { ...portraitInput, imageSrc: replacementPortrait.asset.src },
    stagedMedia: [replacementPortrait.token], submissionId: replacementPortrait.submissionId,
  })
  assert.equal((await request('/api/cms/team-members?id=' + memberSaved.item.id)).item.imageSrc, replacementPortrait.asset.src)
  await assertPublicImage('/about', replacementPortrait.asset.src)

  const rejectedPortrait = await uploadManagedImage('portrait-invalid-save', undefined, 600, 800)
  await request('/api/cms/team-members', 'POST', {
    expectedRevision: memberSaved.result.revision, operationId: teamOperation(),
    input: { ...portraitInput, name: '', role: 'member', imageSrc: rejectedPortrait.asset.src },
    stagedMedia: [rejectedPortrait.token], submissionId: rejectedPortrait.submissionId,
  }, 400)
  await assertAssetAbsent(rejectedPortrait.asset.publicId)
  const unchangedTeam = await request('/api/cms/teams?id=' + team.result.teamId)
  assert.equal(unchangedTeam.members.length, 1)
  assert.equal(unchangedTeam.members[0].imageSrc, replacementPortrait.asset.src)
  memberSaved = await checkBrowserDeferredMedia(memberSaved)
  const removedMember = await request('/api/cms/team-members', 'DELETE', {
    id: memberSaved.item.id, teamId: team.result.teamId, confirmation: portraitInput.name,
    expectedRevision: memberSaved.result.revision, operationId: teamOperation(),
  })
  await request('/api/cms/teams', 'DELETE', {
    id: team.result.teamId, confirmation: 'ทีมทดสอบภาพบุคลากร',
    expectedRevision: removedMember.result.revision, operationId: teamOperation(),
  })
  console.log('Team portrait workflows passed: staged upload, transactional create/update, replay, public language fallback, cleanup protection, failed-save rollback and deletion.')
} finally {
  try {
    if (browser) await browser.close().catch(() => {})
    await Promise.all(browserObservations)
    if (connected && cleanupAllowed) {
    // Recover exact run ownership even when an HTTP reply was lost.
    for (const row of await database.collection('cmsStagedProjectMedia').find({
      userId: adminId,
      $or: [{ submissionId: { $in: [...submissionIds] } }, { 'asset.publicId': { $in: [...assets.keys()] } }],
    }).toArray()) {
      ownAsset(row.asset)
      submissionIds.add(row.submissionId)
    }
    for (const row of await database.collection('cmsProjectOperations').find({ userId: adminId, operationId: { $in: [...operationIds] } }).toArray()) {
      if (ObjectId.isValid(row.item?.id)) projectIds.add(row.item.id)
    }
    for (const row of await database.collection('cmsSiteMedia').find({ _id: { $in: [...siteMediaSections] } }).toArray()) {
      for (const item of row.images) if (item.asset) ownAsset(item.asset)
    }
    if (ownsTeamDirectory) {
      const directory = await database.collection('cmsTeamDirectory').findOne({ _id: 'about-teams' })
      for (const team of directory?.teams || []) {
        for (const member of team.members) if (member.image.asset) ownAsset(member.image.asset)
      }
      await database.collection('cmsTeamDirectory').deleteOne({ _id: 'about-teams' })
    }
    const objectIds = [...projectIds].map((id) => new ObjectId(id))
    await database.collection('cmsProjects').deleteMany({ _id: { $in: objectIds } })
    await database.collection('cmsProjectRevisions').deleteMany({ _id: { $in: revisionIds } })
    await database.collection('cmsProjectOperations').deleteMany({ userId: adminId, operationId: { $in: [...operationIds] } })
    await database.collection('cmsTeamOperations').deleteMany({ userId: adminId, operationId: { $in: [...teamOperationIds] } })
    await database.collection('cmsSiteMedia').deleteMany({ _id: { $in: [...siteMediaSections] } })
    await database.collection('cmsStagedProjectMedia').deleteMany({ userId: adminId, submissionId: { $in: [...submissionIds] } })
    for (const name of ['cmsProjects', 'cmsProjectRevisions', 'cmsProjectOperations', 'cmsStagedProjectMedia', 'cmsSiteMedia', 'cmsTeamDirectory', 'cmsTeamOperations']) {
      for await (const row of database.collection(name).find({})) {
        const text = JSON.stringify(row)
        for (const asset of assets.values()) assert.ok(!text.includes(asset.src), 'Refusing provider cleanup while an isolated database reference remains')
      }
    }
    for (const publicId of assets.keys()) {
      assert.ok(publicId.startsWith(rootFolder + '/'))
      const result = await cloudinary.api.delete_resources([publicId], { invalidate: true, resource_type: 'image', type: 'upload' })
      assert.ok(['deleted', 'not_found'].includes(result.deleted?.[publicId]), 'Provider did not confirm removal of temporary asset ' + publicId)
    }
      console.log('Removed ' + projectIds.size + ' exact temporary projects and confirmed cleanup of ' + assets.size + ' registered test assets.')
    }
  } finally {
    await client.close()
  }
}
