import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

// Exercise the real operation coordinator with an isolated transaction adapter.
// This never opens a MongoDB connection or imports environment configuration.
const state = { rows: [], content: [], commitResponseLost: false }
const collection = {
  async createIndex() {},
  async findOne({ userId, operationId }) {
    return state.rows.find((row) => row.userId === userId && row.operationId === operationId) || null
  },
  async insertOne(row) { state.rows.push(row) },
}
class TestContentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
globalThis.__sgwOperationTest = {
  CmsContentError: TestContentError,
  collection,
  async getMongoClient() {
    return {
      startSession() {
        return {
          async withTransaction(callback) {
            const previousRows = [...state.rows]
            const previousContent = [...state.content]
            let result
            try { result = await callback() } catch (error) {
              state.rows = previousRows
              state.content = previousContent
              throw error
            }
            if (state.commitResponseLost) throw new Error('Commit response was lost')
            return result
          },
          async endSession() {},
        }
      },
    }
  },
}
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!context.parentURL?.endsWith('/src/server/cms/project-operations.ts')) return nextResolve(specifier, context)
    const substitutes = {
      'server-only': 'export {}',
      '@/server/db': 'export const getMongoClient = globalThis.__sgwOperationTest.getMongoClient',
      '@/server/db/collections': 'export async function getCmsProjectOperationsCollection() { return globalThis.__sgwOperationTest.collection }',
      './content': 'export const CmsContentError = globalThis.__sgwOperationTest.CmsContentError; export async function ensureCmsContentIndexes() {}',
    }
    return specifier in substitutes
      ? { url: moduleUrl(substitutes[specifier]), shortCircuit: true }
      : nextResolve(specifier, context)
  },
})
const operations = await import('../src/server/cms/project-operations.ts')
hook.deregister()

const operationId = 'e1c7f2e8-e55c-4bee-9b9c-cba6cd19719c'
const item = { id: '507f1f77bcf86cd799439011', title: 'Saved project' }

test.beforeEach(() => {
  state.rows = []
  state.content = []
  state.commitResponseLost = false
})

test('retrying a saved operation returns its receipt without validating expired uploads again', async () => {
  const fingerprint = operations.projectOperationFingerprint('POST', { title: 'Project', operationId })
  await operations.runProjectOperation('user1', operationId, fingerprint, async () => {
    state.content.push(item)
    return item
  })
  const replay = await operations.runProjectOperation('user1', operationId, fingerprint, async () => {
    throw new Error('Expired media validation must not run on replay')
  })
  assert.equal(replay.replayed, true)
  assert.deepEqual(replay.item, item)
  assert.equal(state.content.length, 1)
})

test('operation receipts are actor scoped and reject changed request bodies', async () => {
  await operations.runProjectOperation('user1', operationId, 'original', async () => item)
  assert.equal(await operations.getSavedProjectOperation('user2', operationId), null)
  await assert.rejects(operations.runProjectOperation('user1', operationId, 'changed', async () => item), { status: 409 })
})

test('lost commit response recovers the durable saved result', async () => {
  state.commitResponseLost = true
  const result = await operations.runProjectOperation('user1', operationId, 'same-body', async () => {
    state.content.push(item)
    return item
  })
  assert.equal(result.replayed, true)
  assert.deepEqual(result.item, item)
  assert.equal(state.content.length, 1)
})

test('a failed write leaves neither changed content nor a success receipt', async () => {
  await assert.rejects(operations.runProjectOperation('user1', operationId, 'same-body', async () => {
    state.content.push(item)
    throw new TestContentError('Project changed in another tab', 409)
  }), { status: 409 })
  assert.deepEqual(state.content, [])
  assert.equal(await operations.getSavedProjectOperation('user1', operationId), null)
})

test('fingerprints ignore object key order but distinguish values and operations', () => {
  const first = operations.projectOperationFingerprint('PUT', { operationId, data: { title: 'A', year: 2026 } })
  assert.equal(first, operations.projectOperationFingerprint('PUT', { data: { year: 2026, title: 'A' }, operationId }))
  assert.notEqual(first, operations.projectOperationFingerprint('PUT', { operationId, data: { title: 'B', year: 2026 } }))
  assert.notEqual(first, operations.projectOperationFingerprint('POST', { operationId, data: { title: 'A', year: 2026 } }))
})
