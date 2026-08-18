import assert from 'node:assert/strict'

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
assert.equal(detail.response.status, 200)
assert.match(detail.text, /res\.cloudinary\.com/)

const english = await page(`/en/projects/${objectId}`)
assert.equal(english.response.status, 200)

const legacy = await fetch(`${baseUrl}/projects/1`, { redirect: 'manual' })
assert.ok([307, 308].includes(legacy.status), `Expected a legacy redirect, received ${legacy.status}.`)
assert.match((legacy.headers.get('location') || '').split(',')[0].trim(), /^\/projects\/[a-f\d]{24}$/i)

const cms = await fetch(`${baseUrl}/cms/projects`, { redirect: 'manual' })
assert.ok([307, 308].includes(cms.status))
assert.match((cms.headers.get('location') || '').split(',')[0].trim(), /\/cms\/login/)

const sitemap = await page('/sitemap.xml')
assert.equal(sitemap.response.status, 200)
assert.match(sitemap.text, new RegExp(`/projects/${objectId}`))

console.log(`E2E smoke passed for ${baseUrl} using project ${objectId}.`)
