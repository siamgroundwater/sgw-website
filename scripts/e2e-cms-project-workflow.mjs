import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient, ObjectId } from 'mongodb'

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
const prefix = 'qa-media-' + randomUUID()
let headers
let connected = false
let cleanupAllowed = false

function operation() { const id = randomUUID(); operationIds.add(id); return id }
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

  const firstUpload = await upload('first')
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
  assert.equal((await fetch(baseUrl + '/projects/' + created.item.id)).status, 404)
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
} finally {
  try {
    if (connected && cleanupAllowed) {
    // Recover exact run ownership even when an HTTP reply was lost.
    for (const row of await database.collection('cmsStagedProjectMedia').find({ userId: adminId, submissionId: { $in: [...submissionIds] } }).toArray()) ownAsset(row.asset)
    for (const row of await database.collection('cmsProjectOperations').find({ userId: adminId, operationId: { $in: [...operationIds] } }).toArray()) {
      if (ObjectId.isValid(row.item?.id)) projectIds.add(row.item.id)
    }
    const objectIds = [...projectIds].map((id) => new ObjectId(id))
    await database.collection('cmsProjects').deleteMany({ _id: { $in: objectIds } })
    await database.collection('cmsProjectRevisions').deleteMany({ _id: { $in: revisionIds } })
    await database.collection('cmsProjectOperations').deleteMany({ userId: adminId, operationId: { $in: [...operationIds] } })
    await database.collection('cmsStagedProjectMedia').deleteMany({ userId: adminId, submissionId: { $in: [...submissionIds] } })
    for (const name of ['cmsProjects', 'cmsProjectRevisions', 'cmsProjectOperations', 'cmsStagedProjectMedia']) {
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
