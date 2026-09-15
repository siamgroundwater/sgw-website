import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { MongoClient } from 'mongodb'
import { auditCmsIndexes } from '../src/server/db/cms-index-audit.ts'
import { cmsCollectionNames, cmsIndexDefinitions, ensureCmsIndexes } from '../src/server/db/cms-indexes.ts'

test('all CMS collections share the index contract used by the runtime and audit', async () => {
  assert.deepEqual(Object.keys(cmsCollectionNames).sort(), Object.keys(cmsIndexDefinitions).sort())
  for (const [kind, definitions] of Object.entries(cmsIndexDefinitions)) {
    const calls = []
    await ensureCmsIndexes({ async createIndex(key, options) { calls.push({ key, ...options }) } }, kind)
    assert.deepEqual(calls, definitions)
    assert.equal(new Set(definitions.map(({ name }) => name)).size, definitions.length)
    assert.deepEqual(auditCmsIndexes(kind, definitions), [])
  }
})

test('the audit detects obsolete optional-field uniqueness, missing indexes and changed partial filters', () => {
  const users = structuredClone(cmsIndexDefinitions.users)
  assert.deepEqual(auditCmsIndexes('users', [...users, { name: 'email_1', key: { email: 1 }, unique: true }]), [
    { index: 'email_1', issue: 'unexpected-unique-or-ttl-index' },
  ])
  assert.ok(auditCmsIndexes('users', users.slice(1)).some(({ issue }) => issue === 'missing-current-index'))
  const projects = structuredClone(cmsIndexDefinitions.projects)
  delete projects[0].partialFilterExpression
  assert.deepEqual(auditCmsIndexes('projects', projects), [{ index: 'slug_1', issue: 'index-definition-mismatch' }])
  const staged = [...cmsIndexDefinitions.stagedProjectMedia, { name: 'publicId_1', key: { publicId: 1 }, unique: true }]
  assert.deepEqual(auditCmsIndexes('stagedProjectMedia', staged), [{ index: 'publicId_1', issue: 'unexpected-unique-or-ttl-index' }])
})

test('staging cannot silently gain TTL and audit-log retention cannot silently lose TTL', () => {
  const staged = structuredClone(cmsIndexDefinitions.stagedProjectMedia)
  staged[0].expireAfterSeconds = 0
  assert.equal(auditCmsIndexes('stagedProjectMedia', staged).length, 1)
  const logs = structuredClone(cmsIndexDefinitions.auditLogs)
  delete logs[0].expireAfterSeconds
  assert.equal(auditCmsIndexes('auditLogs', logs).length, 1)
  assert.equal(auditCmsIndexes('siteMedia', [{ name: 'surprise-ttl', key: { updatedAt: 1 }, expireAfterSeconds: 0 }]).length, 1)
})

test('audit handles MongoDB text-index metadata and preserves compound-key order', () => {
  const projects = structuredClone(cmsIndexDefinitions.projects)
  projects[2] = { name: projects[2].name, key: { _fts: 'text', _ftsx: 1 }, weights: { location: 1, summary: 1, title: 1 }, default_language: 'english', language_override: 'language' }
  assert.deepEqual(auditCmsIndexes('projects', projects), [])
  projects[2].weights.title = 2
  assert.equal(auditCmsIndexes('projects', projects).length, 1)
  const operations = structuredClone(cmsIndexDefinitions.projectOperations)
  operations[0].key = { operationId: 1, userId: 1 }
  assert.equal(auditCmsIndexes('projectOperations', operations).length, 1)
})

test('additional harmless read indexes are preserved and the CLI cannot repair or delete data', () => {
  assert.deepEqual(auditCmsIndexes('siteMedia', [{ name: '_id_', key: { _id: 1 }, unique: true }, { name: 'updatedAt_-1', key: { updatedAt: -1 } }]), [])
  const script = readFileSync(new URL('../scripts/check-cms-database.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(script, /\.(?:dropIndex|dropDatabase|deleteMany|deleteOne|updateMany|updateOne|insertOne|createIndex)\(/)
})

test('runtime index creation stays centralized and content initialization repairs staged uploads too', () => {
  for (const file of ['content', 'users', 'audit', 'teams', 'operations', 'project-operations', 'staged-media-indexes']) {
    const source = readFileSync(new URL(`../src/server/cms/${file}.ts`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /\.createIndex\(/, file)
    assert.match(source, /ensureCmsIndexes/, file)
  }
  const content = readFileSync(new URL('../src/server/cms/content.ts', import.meta.url), 'utf8')
  assert.match(content, /ensureCmsStagedMediaIndexes\(stagedMedia\)/)
})

test('real MongoDB accepts every current index contract and preserves optional fields and soft-delete uniqueness', {
  skip: process.env.CMS_TEST_STAGED_INDEXES !== 'true',
}, async () => {
  assert.ok(process.env.MONGODB_URI)
  const name = `sgw_test_${Date.now()}_${randomBytes(4).toString('hex')}`
  assert.notEqual(name, process.env.MONGODB_DB)
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  let created = false
  try {
    await client.connect()
    const database = client.db(name)
    assert.equal((await database.listCollections().toArray()).length, 0)
    for (const [kind, collectionName] of Object.entries(cmsCollectionNames)) {
      created = true
      const collection = await database.createCollection(collectionName)
      await ensureCmsIndexes(collection, kind)
      await ensureCmsIndexes(collection, kind)
      assert.deepEqual(auditCmsIndexes(kind, await collection.listIndexes().toArray()), [], collectionName)
    }
    const users = database.collection(cmsCollectionNames.users)
    await users.insertMany([{ usernameLower: 'first' }, { usernameLower: 'second' }])
    await assert.rejects(users.insertOne({ usernameLower: 'first' }), error => error.code === 11000)
    const projects = database.collection(cmsCollectionNames.projects)
    await projects.insertOne({ slug: 'reusable', deletedAt: new Date() })
    await projects.insertOne({ slug: 'reusable' })
    await assert.rejects(projects.insertOne({ slug: 'reusable' }), error => error.code === 11000)
    const operations = database.collection(cmsCollectionNames.projectOperations)
    await operations.insertMany([{ userId: 'first', operationId: 'save' }, { userId: 'second', operationId: 'save' }])
    await assert.rejects(operations.insertOne({ userId: 'first', operationId: 'save' }), error => error.code === 11000)
    console.log('All 12 CMS index contracts verified against real MongoDB, including repeat initialization and uniqueness rules.')
  } finally {
    if (created && /^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(name) && name !== process.env.MONGODB_DB) {
      await client.db(name).dropDatabase()
      console.log('Removed the isolated index-contract database; no application records changed.')
    }
    await client.close()
  }
})
