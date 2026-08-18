import assert from 'node:assert/strict'

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
let createdId = ''

const project = {
  businessTypes: ['ทดสอบระบบ'], category: 'other', coverImage: '', details: ['ฉบับทดสอบ'], galleryImages: [],
  lat: 13.7563, legacyUrl: '', lng: 100.5018, location: 'กรุงเทพมหานคร', projectType: 'other',
  slug: `e2e-project-${suffix}`, status: 'draft', summary: 'โครงการสำหรับทดสอบขั้นตอนเผยแพร่เท่านั้น',
  title: `โครงการทดสอบ ${suffix}`,
  translations: { en: { businessTypes: ['System test'], details: ['Test revision'], location: 'Bangkok', summary: 'Project used only for publishing workflow verification.', title: `E2E project ${suffix}`, workTypes: ['Workflow verification'] } },
  workTypes: ['ทดสอบขั้นตอน'], year: new Date().getFullYear(),
}

async function cms(pathname, method, body) {
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const payload = await response.json().catch(() => ({}))
  assert.ok(response.ok, `${method} ${pathname} failed: ${JSON.stringify(payload)}`)
  return payload
}

try {
  const draft = await cms('/api/cms/projects', 'POST', { ...project, intent: 'save-draft' })
  createdId = draft.item.id
  assert.equal(draft.item.status, 'draft')

  const firstPublish = await cms('/api/cms/projects', 'PUT', { ...project, expectedUpdatedAt: draft.item.updatedAt, id: createdId, intent: 'publish' })
  assert.equal(firstPublish.item.status, 'active')
  const publicPage = await fetch(`${baseUrl}/en/projects/${createdId}`)
  assert.equal(publicPage.status, 200)
  assert.match(await publicPage.text(), new RegExp(`E2E project ${suffix}`))

  const legacy = await fetch(`${baseUrl}/projects/${firstPublish.item.publicId}`, { redirect: 'manual' })
  assert.ok([307, 308].includes(legacy.status))
  assert.match((legacy.headers.get('location') || '').split(',')[0].trim(), new RegExp(`/projects/${createdId}$`))

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
  }
}
