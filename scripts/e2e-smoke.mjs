import assert from 'node:assert/strict'
import { assertCmsLoginRedirect, assertMissingProjectPage, assertProjectPage } from './lib/page-response-assertions.mjs'

const baseUrl = (process.env.E2E_BASE_URL || process.argv[2] || 'http://127.0.0.1:3003').replace(/\/$/, '')

async function page(pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  })
  return { response, text: await response.text() }
}

const health = await page('/api/health')
assert.equal(health.response.status, 200, `Health check failed: ${health.text}`)
const healthJson = JSON.parse(health.text)
assert.equal(healthJson.ok, true)
assert.equal(healthJson.checks.database, true)
assert.equal(healthJson.checks.mediaConfiguration, true)

const listing = await page('/projects')
assert.equal(listing.response.status, 200)
const objectId = listing.text.match(/\/projects\/([a-f\d]{24})/i)?.[1]
assert.ok(objectId, 'Project listing did not contain an ObjectId detail link.')

const detail = await page(`/projects/${objectId}`)
assertProjectPage(detail.response.status, detail.text, `/projects/${objectId}`)
assert.match(detail.text, /res\.cloudinary\.com/)

const english = await page(`/en/projects/${objectId}`)
assertProjectPage(english.response.status, english.text, `/en/projects/${objectId}`)

await Promise.all(['', '/en', '/zh', '/ja'].map(async prefix => {
  const route = `${prefix}/projects/1`
  const invalidProject = await page(route, { redirect: 'manual' })
  assertMissingProjectPage(invalidProject.response.status, invalidProject.text, route)
}))

const cms = await page('/cms/projects', { redirect: 'manual' })
assertCmsLoginRedirect(cms.response.status, cms.text, cms.response.headers.get('location') || '', baseUrl)
const cmsApi = await page('/api/cms/projects', { redirect: 'manual' })
assert.equal(cmsApi.response.status, 401, 'Signed-out requests must not access CMS project data.')

const sitemap = await page('/sitemap.xml')
assert.equal(sitemap.response.status, 200)
assert.match(sitemap.text, new RegExp(`/projects/${objectId}`))

console.log(`E2E smoke passed for ${baseUrl} using project ${objectId}.`)
