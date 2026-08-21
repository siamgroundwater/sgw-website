import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { v2 as cloudinary } from 'cloudinary'

const baseUrl = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3003').replace(/\/$/, '')
const username = process.env.CMS_E2E_USERNAME
const password = process.env.CMS_E2E_PASSWORD
if (!username || !password) throw new Error('Set CMS_E2E_USERNAME and CMS_E2E_PASSWORD for the isolated test environment.')

const originHeaders = { 'Content-Type': 'application/json', Origin: baseUrl }
const login = await fetch(`${baseUrl}/api/cms/auth/login`, {
  method: 'POST', headers: originHeaders, body: JSON.stringify({ username, password }),
})
assert.equal(login.status, 200, await login.text())
const cookie = (login.headers.get('set-cookie') || '').split(';', 1)[0]
assert.ok(cookie.includes('sgw_cms_session='))
const headers = { ...originHeaders, Cookie: cookie }
const suffix = process.env.CMS_E2E_RUN_ID || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
const submissionId = `e2e_media_${suffix.replace(/[^A-Za-z0-9_-]/g, '_')}`
let createdId = ''
let stagedUpload

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
})

const mediaForm = new FormData()
mediaForm.append('file', new File([
  await readFile('public/images/about/teams/icon-service-3.png'),
], 'e2e-project-cover.png', { type: 'image/png' }))
mediaForm.append('submissionId', submissionId)
mediaForm.append('slug', `e2e-project-${suffix}`)
const mediaResponse = await fetch(`${baseUrl}/api/cms/projects/media`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: baseUrl },
  body: mediaForm,
})
const mediaPayload = await mediaResponse.json().catch(() => ({}))
assert.equal(mediaResponse.status, 201, JSON.stringify(mediaPayload))
stagedUpload = mediaPayload.staged
assert.ok(stagedUpload?.asset?.src)

const project = {
  category: ['other'], coverImage: stagedUpload.asset.src, details: ['ฉบับทดสอบ'], galleryImages: [],
  lat: 13.7563, lng: 100.5018, location: 'กรุงเทพมหานคร',
  slug: `e2e-project-${suffix}`, status: 'draft', summary: 'โครงการสำหรับทดสอบขั้นตอนเผยแพร่เท่านั้น',
  title: `โครงการทดสอบ ${suffix}`,
  translations: { en: { details: ['Test revision'], location: 'Bangkok', summary: 'Project used only for publishing workflow verification.', title: `E2E project ${suffix}` } },
  workTypes: ['groundwater-survey'], year: new Date().getFullYear(),
}

async function cms(pathname, method, body) {
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const payload = await response.json().catch(() => ({}))
  assert.ok(response.ok, `${method} ${pathname} failed: ${JSON.stringify(payload)}`)
  return payload
}

try {
  const draft = await cms('/api/cms/projects', 'POST', { ...project, intent: 'save-draft', stagedMedia: [stagedUpload.token], submissionId })
  createdId = draft.item.id
  assert.equal(draft.item.status, 'draft')

  const firstPublish = await cms('/api/cms/projects', 'PUT', { ...project, expectedUpdatedAt: draft.item.updatedAt, id: createdId, intent: 'publish' })
  assert.equal(firstPublish.item.status, 'active')
  const publicPage = await fetch(`${baseUrl}/en/projects/${createdId}`)
  assert.equal(publicPage.status, 200)
  assert.match(await publicPage.text(), new RegExp(`E2E project ${suffix}`))

  const changed = { ...project, title: `ฉบับร่าง ${suffix}`, translations: { en: { ...project.translations.en, title: `Draft only ${suffix}` } } }
  const savedDraft = await cms('/api/cms/projects', 'PUT', { ...changed, expectedUpdatedAt: firstPublish.item.updatedAt, id: createdId, intent: 'save-draft' })
  const unchangedPublic = await fetch(`${baseUrl}/en/projects/${createdId}`)
  assert.doesNotMatch(await unchangedPublic.text(), new RegExp(`Draft only ${suffix}`))

  const secondPublish = await cms('/api/cms/projects', 'PUT', { ...changed, expectedUpdatedAt: savedDraft.item.updatedAt, id: createdId, intent: 'publish' })
  assert.equal(secondPublish.item.publishedVersion, 2)
  const changedPublic = await fetch(`${baseUrl}/en/projects/${createdId}`)
  assert.match(await changedPublic.text(), new RegExp(`Draft only ${suffix}`))

  const unpublished = await cms('/api/cms/projects', 'PATCH', { action: 'unpublish', expectedUpdatedAt: secondPublish.item.updatedAt, id: createdId })
  assert.equal((await fetch(`${baseUrl}/projects/${createdId}`)).status, 404)

  const history = await cms(`/api/cms/projects?projectId=${createdId}&revisions=1`, 'GET')
  assert.ok(history.items.length >= 1)
  await cms('/api/cms/projects', 'PATCH', { action: 'restore', expectedUpdatedAt: unpublished.item.updatedAt, id: createdId, revisionId: history.items.at(-1).id })
  assert.equal((await fetch(`${baseUrl}/projects/${createdId}`)).status, 200)
  console.log(`CMS publishing workflow passed for temporary project ${createdId}.`)
} finally {
  if (createdId) {
    await fetch(`${baseUrl}/api/cms/projects?id=${encodeURIComponent(createdId)}`, { method: 'DELETE', headers }).catch(() => undefined)
  } else if (stagedUpload) {
    await fetch(`${baseUrl}/api/cms/projects/media`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ submissionId, tokens: [stagedUpload.token] }),
    }).catch(() => undefined)
  }
  if (stagedUpload?.asset?.publicId) {
    await cloudinary.api.delete_resources([stagedUpload.asset.publicId], {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    }).catch(() => undefined)
  }
}
