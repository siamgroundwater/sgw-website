import assert from 'node:assert/strict'
import test from 'node:test'
import { createLearningProgressStore, learningProgressKey, parseLearningProgress } from '../src/lib/learning-progress.ts'

function memoryStorage() {
  const values = new Map()
  const calls = []
  return { values, calls, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { calls.push(['set', key]); values.set(key, value) }, removeItem: (key) => { calls.push(['remove', key]); values.delete(key) } }
}

test('checklists read after hydration and never write before explicit opt-in', () => {
  const storage = memoryStorage()
  let reads = 0
  const store = createLearningProgressStore('basics', () => { reads++; return storage })
  assert.equal(reads, 0)
  assert.deepEqual(store.getServerSnapshot().checked, [])
  store.subscribe(() => {})
  store.toggle('water-balance')
  store.toggle('not-a-real-check')
  assert.deepEqual(store.getSnapshot().checked, ['water-balance'])
  assert.equal(storage.calls.length, 0)
  const reloaded = createLearningProgressStore('basics', () => storage)
  reloaded.subscribe(() => {})
  assert.deepEqual(reloaded.getSnapshot().checked, [])
  store.setSaving(true)
  assert.equal(store.getSnapshot().status, 'saved')
  assert.deepEqual(JSON.parse(storage.values.get(learningProgressKey('basics'))), { version: 1, revision: 1, checklist: 'basics', optedIn: true, checked: ['water-balance'] })
  const restored = createLearningProgressStore('basics', () => storage)
  restored.subscribe(() => {})
  assert.deepEqual(restored.getSnapshot().checked, ['water-balance'])
  assert.equal(restored.getSnapshot().saveOnDevice, true)
  restored.reset()
  assert.deepEqual(parseLearningProgress(storage.getItem(learningProgressKey('basics')), 'basics'), [])
  restored.forget()
  assert.equal(storage.getItem(learningProgressKey('basics')), null)
  assert.equal(restored.getSnapshot().saveOnDevice, false)
})

test('saved records are bounded, versioned, consented and restricted to stable evidence IDs', () => {
  const valid = { version: 1, revision: 1, checklist: 'law', optedIn: true, checked: ['site-rights'] }
  assert.deepEqual(parseLearningProgress(JSON.stringify(valid), 'law'), ['site-rights'])
  for (const patch of [{ version: 2 }, { revision: 2 }, { optedIn: false }, { checklist: 'owner' }, { checked: ['unknown'] }, { checked: [0] }, { checked: ['site-rights', 'site-rights'] }, { privateNotes: 'not permitted' }]) {
    assert.equal(parseLearningProgress(JSON.stringify({ ...valid, ...patch }), 'law'), null)
  }
  for (const raw of ['{', 'null', '[]', 'x'.repeat(4097)]) assert.equal(parseLearningProgress(raw, 'law'), null)
})

test('storage read, write and deletion errors preserve usable current checks', () => {
  const storage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') }, removeItem() { throw new Error('blocked') } }
  const store = createLearningProgressStore('owner', () => storage)
  store.subscribe(() => {})
  assert.equal(store.getSnapshot().status, 'unavailable')
  store.toggle('demand-service')
  store.setSaving(true)
  assert.deepEqual(store.getSnapshot().checked, ['demand-service'])
  assert.equal(store.getSnapshot().status, 'unavailable')
  store.toggle('site-records')
  store.forget()
  assert.deepEqual(store.getSnapshot().checked, ['demand-service', 'site-records'])
  assert.equal(store.getSnapshot().status, 'forget-error')
  assert.equal(store.getSnapshot().saveOnDevice, false)
})

test('turning saving off removes only that checklist and retains current session checks', () => {
  const storage = memoryStorage()
  storage.values.set('unrelated-preference', 'keep')
  const store = createLearningProgressStore('basics', () => storage)
  store.subscribe(() => {})
  store.toggle('water-balance')
  store.setSaving(true)
  store.setSaving(false)
  assert.deepEqual(store.getSnapshot().checked, ['water-balance'])
  assert.equal(storage.getItem(learningProgressKey('basics')), null)
  assert.equal(storage.getItem('unrelated-preference'), 'keep')
  store.toggle('nearby-well-data')
  assert.equal(storage.getItem(learningProgressKey('basics')), null)
})

test('other tabs synchronize saved checks and cannot recreate forgotten progress', () => {
  const storage = memoryStorage()
  const key = learningProgressKey('basics')
  const first = createLearningProgressStore('basics', () => storage)
  first.subscribe(() => {})
  first.toggle('water-balance')
  first.setSaving(true)
  const second = createLearningProgressStore('basics', () => storage)
  second.subscribe(() => {})
  first.toggle('nearby-well-data')
  second.syncFromStorage(learningProgressKey('law'))
  assert.deepEqual(second.getSnapshot().checked, ['water-balance'])
  const writesBeforeSync = storage.calls.length
  second.syncFromStorage(key)
  assert.deepEqual(second.getSnapshot().checked, ['water-balance', 'nearby-well-data'])
  assert.equal(storage.calls.length, writesBeforeSync)
  first.forget()
  second.syncFromStorage(key)
  assert.equal(second.getSnapshot().saveOnDevice, false)
  assert.deepEqual(second.getSnapshot().checked, ['water-balance', 'nearby-well-data'])
  second.toggle('care-plan')
  assert.equal(storage.getItem(key), null)
})

test('queued storage events cannot allow an automatic write after another tab forgets', () => {
  const storage = memoryStorage()
  const key = learningProgressKey('owner')
  const store = createLearningProgressStore('owner', () => storage)
  store.subscribe(() => {})
  store.toggle('demand-service')
  store.setSaving(true)
  storage.removeItem(key)
  // Intentionally do not deliver a storage event before the next local change.
  store.toggle('site-records')
  assert.equal(store.getSnapshot().saveOnDevice, false)
  assert.equal(store.getSnapshot().status, 'external-change')
  assert.deepEqual(store.getSnapshot().checked, ['demand-service', 'site-records'])
  assert.equal(storage.getItem(key), null)
})

test('cross-tab changes preserve unsaved checks and do not replace malformed storage', () => {
  const storage = memoryStorage()
  const key = learningProgressKey('law')
  const store = createLearningProgressStore('law', () => storage)
  store.subscribe(() => {})
  store.toggle('site-rights')
  const other = createLearningProgressStore('law', () => storage)
  other.subscribe(() => {})
  other.toggle('demand-purpose')
  other.setSaving(true)
  store.syncFromStorage(key)
  assert.deepEqual(store.getSnapshot().checked, ['site-rights'])
  assert.equal(store.getSnapshot().saveOnDevice, false)
  store.setSaving(true)
  storage.setItem(key, '{malformed')
  const writesBeforeSync = storage.calls.length
  store.syncFromStorage(key)
  store.toggle('well-design')
  assert.deepEqual(store.getSnapshot().checked, ['site-rights', 'well-design'])
  assert.equal(store.getSnapshot().saveOnDevice, false)
  assert.equal(storage.getItem(key), '{malformed')
  assert.equal(storage.calls.length, writesBeforeSync)
})

test('a cross-tab update does not discard checks whose last storage write failed', () => {
  const storage = memoryStorage()
  let failWrites = false
  const limitedStorage = { ...storage, setItem: (key, value) => { if (failWrites) throw new Error('full'); storage.setItem(key, value) } }
  const key = learningProgressKey('basics')
  const store = createLearningProgressStore('basics', () => limitedStorage)
  store.subscribe(() => {})
  store.toggle('water-balance')
  store.setSaving(true)
  failWrites = true
  store.toggle('nearby-well-data')
  assert.equal(store.getSnapshot().status, 'unavailable')
  const other = createLearningProgressStore('basics', () => storage)
  other.subscribe(() => {})
  other.toggle('care-plan')
  store.syncFromStorage(key)
  assert.deepEqual(store.getSnapshot().checked, ['water-balance', 'nearby-well-data'])
  assert.equal(store.getSnapshot().saveOnDevice, false)
  assert.deepEqual(parseLearningProgress(storage.getItem(key), 'basics'), ['water-balance', 'care-plan'])
})
