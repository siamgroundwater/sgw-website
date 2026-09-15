import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { MongoClient } from 'mongodb'
import { ensureCmsStagedMediaIndexes } from '../src/server/cms/staged-media-indexes.ts'

const oldIndex = { name: 'publicId_1', key: { publicId: 1 }, unique: true }
function fixture(indexes = [oldIndex], options = {}) {
  const calls = []
  return {
    calls,
    async createIndex(key, settings) {
      calls.push(['create', key, settings])
      if (options.createError) throw options.createError
    },
    listIndexes() {
      calls.push(['list'])
      return { async toArray() { return indexes } }
    },
    async dropIndex(name) {
      calls.push(['drop', name])
      if (options.dropError) throw options.dropError
    },
  }
}

test('staging creates current uniqueness before removing only the obsolete publicId index', async () => {
  const collection = fixture()
  await ensureCmsStagedMediaIndexes(collection)
  assert.deepEqual(collection.calls, [
    ['create', { expiresAt: 1 }, { name: 'expiresAt_1' }],
    ['create', { 'asset.publicId': 1 }, { name: 'asset.publicId_1', unique: true }],
    ['create', { submissionId: 1, userId: 1 }, { name: 'submissionId_1_userId_1' }],
    ['list'],
    ['drop', 'publicId_1'],
  ])
})

test('staging leaves fresh databases and unrelated index definitions alone', async () => {
  for (const indexes of [[], [
    { ...oldIndex, name: 'custom-public-id' },
    { ...oldIndex, unique: false },
    { ...oldIndex, key: { publicId: 1, userId: 1 } },
    { ...oldIndex, key: { 'asset.publicId': 1 } },
  ]]) {
    const collection = fixture(indexes)
    await ensureCmsStagedMediaIndexes(collection)
    assert.equal(collection.calls.some(([action]) => action === 'drop'), false)
  }
})

test('staging never removes the old index if establishing current uniqueness fails', async () => {
  const error = Object.assign(new Error('current index could not be created'), { code: 11000 })
  const collection = fixture([oldIndex], { createError: error })
  await assert.rejects(ensureCmsStagedMediaIndexes(collection), (caught) => caught === error)
  assert.equal(collection.calls.some(([action]) => action === 'drop'), false)
})

test('staging accepts a concurrent repair but does not hide permission or connection failures', async () => {
  const concurrent = fixture([oldIndex], { dropError: Object.assign(new Error('index not found'), { code: 27 }) })
  await ensureCmsStagedMediaIndexes(concurrent)
  for (const code of [13, 89]) {
    const error = Object.assign(new Error('repair failed'), { code })
    await assert.rejects(ensureCmsStagedMediaIndexes(fixture([oldIndex], { dropError: error })), (caught) => caught === error)
  }
})

// Opt in with CMS_TEST_STAGED_INDEXES=true and a MongoDB URI. Never touch the
// configured application's database; allocate and remove only this fresh one.
test('real MongoDB reproduces the second-upload failure and preserves records through repair', {
  skip: process.env.CMS_TEST_STAGED_INDEXES !== 'true',
}, async () => {
  assert.ok(process.env.MONGODB_URI, 'MONGODB_URI is required for the opt-in database test')
  const databaseName = `sgw_test_${Date.now()}_${randomBytes(4).toString('hex')}`
  assert.notEqual(databaseName, process.env.MONGODB_DB)
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  let created = false
  try {
    await client.connect()
    const database = client.db(databaseName)
    assert.equal((await database.listCollections().toArray()).length, 0)
    const collection = database.collection('cmsStagedProjectMedia')
    created = true
    await collection.createIndex({ publicId: 1 }, { unique: true })
    const first = { asset: { publicId: 'test/first' }, submissionId: 'test-save', userId: 'test-user' }
    await collection.insertOne(first)
    const second = { asset: { publicId: 'test/second' }, submissionId: 'test-save', userId: 'test-user' }
    await assert.rejects(collection.insertOne({ ...second }), (error) => error.code === 11000 && error.keyPattern?.publicId === 1)
    const before = await collection.find({}).toArray()

    await Promise.all([ensureCmsStagedMediaIndexes(collection), ensureCmsStagedMediaIndexes(collection)])
    assert.deepEqual(await collection.find({}).toArray(), before, 'Index repair must not change staging records')
    await collection.insertOne(second)
    await collection.insertOne({ asset: { publicId: 'test/third' }, submissionId: 'test-save', userId: 'test-user' })
    assert.equal(await collection.countDocuments({}), 3)
    await assert.rejects(collection.insertOne({ asset: { publicId: 'test/second' } }), (error) => error.code === 11000 && error.keyPattern?.['asset.publicId'] === 1)
    await ensureCmsStagedMediaIndexes(collection)
    assert.equal((await collection.listIndexes().toArray()).some(({ name }) => name === 'publicId_1'), false)
    console.log('Reproduced obsolete-index failure; three-image staging succeeds after repair.')
  } finally {
    if (created && /^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(databaseName) && databaseName !== process.env.MONGODB_DB) {
      await client.db(databaseName).dropDatabase()
      console.log('Removed the isolated index-test database; application records were not changed.')
    }
    await client.close()
  }
})
