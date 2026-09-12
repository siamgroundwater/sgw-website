import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

const state = { rows: [], inUse: new Set(), deleted: [], events: [], deleteLimit: Infinity }
function matches(row, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((filter) => matches(row, filter))
    const value = key === 'asset.publicId' ? row.asset.publicId : row[key]
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if ('$exists' in expected && (value !== undefined) !== expected.$exists) return false
      if ('$lte' in expected && !(value <= expected.$lte)) return false
      if ('$gt' in expected && !(value > expected.$gt)) return false
      if ('$in' in expected && !expected.$in.includes(value)) return false
      return true
    }
    return value instanceof Date && expected instanceof Date ? +value === +expected : value === expected
  })
}
const collection = {
  async createIndex() {},
  find(query) {
    let limit = Infinity
    return { sort() { return this }, limit(value) { limit = value; return this }, async toArray() { return state.rows.filter((row) => matches(row, query)).slice(0, limit) } }
  },
  async findOneAndUpdate(query, update) {
    const row = state.rows.find((item) => matches(item, query))
    if (!row) return null
    Object.assign(row, update.$set)
    return row
  },
  async countDocuments(query) { return state.rows.filter((row) => matches(row, query)).length },
  async deleteMany(query) {
    const count = state.rows.length
    state.rows = state.rows.filter((row) => !matches(row, query))
    return { deletedCount: count - state.rows.length }
  },
}
globalThis.__sgwMediaTest = {
  collection,
  async inUse() { return state.inUse },
  async deleteImages(ids) {
    for (const id of ids) assert.ok(state.rows.find((row) => row.asset.publicId === id)?.cleanupClaimedAt, 'cleanup must claim the staging record before calling the provider')
    const removed = ids.slice(0, state.deleteLimit)
    state.deleted.push(...removed)
    return removed
  },
  async record(event) { state.events.push(event) },
}
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!context.parentURL?.endsWith('/src/server/cms/staged-project-media.ts')) return nextResolve(specifier, context)
    const substitutes = {
      'server-only': 'export {}',
      '@/server/db': 'export async function getCmsStagedProjectMediaCollection() { return globalThis.__sgwMediaTest.collection }',
      './content': 'export const getCmsProjectMediaUrlsInUse = globalThis.__sgwMediaTest.inUse',
      './operations': 'export const recordCmsOperationalEvent = globalThis.__sgwMediaTest.record',
      '@/server/cloudinary/media': 'export const deleteCmsImages = globalThis.__sgwMediaTest.deleteImages; export function isCmsOwnedMediaPublicId() { return true }',
      '@/lib/cms-staged-media-token': 'export function createCmsStagedMediaTokenValue(payload) { return payload }; export function verifyCmsStagedMediaTokenValue(token) { return JSON.parse(token) }',
    }
    return specifier in substitutes ? { url: moduleUrl(substitutes[specifier]), shortCircuit: true } : nextResolve(specifier, context)
  },
})
const media = await import('../src/server/cms/staged-project-media.ts')
hook.deregister()
process.env.CMS_SESSION_SECRET = 'isolated-test-secret-used-only-by-this-process-123'

function staged(id, extra = {}) {
  return {
    _id: id, asset: { publicId: `cms/${id}`, src: `https://example.com/${id}.webp` },
    expiresAt: new Date(Date.now() - 1000), userId: 'user1', submissionId: 'save1', ...extra,
  }
}
test.beforeEach(() => {
  state.rows = []; state.inUse = new Set(); state.deleted = []; state.events = []; state.deleteLimit = Infinity
})

test('rollback cannot delete a saved asset after its staging record was committed', async () => {
  const payload = staged('saved')
  await media.rollbackStagedProjectMedia([payload])
  assert.deepEqual(state.deleted, [])
})

test('cleanup protects referenced assets while removing completed staging records', async () => {
  const row = staged('historical')
  state.rows = [row]
  state.inUse.add(row.asset.src)
  const result = await media.cleanupExpiredStagedProjectMedia()
  assert.equal(result.preserved, 1)
  assert.equal(result.removed, 0)
  assert.equal(result.failed, 0)
  assert.equal(state.rows.length, 0)
  assert.deepEqual(state.deleted, [])
})

test('partial provider deletion retains failed records and records failed operational status', async () => {
  state.rows = [staged('one'), staged('two')]
  state.deleteLimit = 1
  const result = await media.cleanupExpiredStagedProjectMedia()
  assert.equal(result.removed, 1)
  assert.equal(result.failed, 1)
  assert.equal(result.remaining, 1)
  assert.equal(state.events.at(-1).ok, false)
})

test('an actively claimed upload cannot be committed by a concurrent save', async () => {
  const row = staged('claimed', { expiresAt: new Date(Date.now() + 60000), cleanupClaimedAt: new Date() })
  state.rows = [row]
  await assert.rejects(media.commitStagedProjectMedia([row]), /INVALID_STAGED_MEDIA/)
  assert.equal(state.rows.length, 1)
})

test('the cleaner retries stale claims after a crashed cleanup worker', async () => {
  state.rows = [staged('retry', { cleanupClaimedAt: new Date(Date.now() - 16 * 60 * 1000) })]
  const result = await media.cleanupExpiredStagedProjectMedia()
  assert.equal(result.removed, 1)
  assert.equal(result.remaining, 0)
})
