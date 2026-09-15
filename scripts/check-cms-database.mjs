import { MongoClient } from 'mongodb'
import { cmsCollectionNames, cmsIndexDefinitions } from '../src/server/db/cms-indexes.ts'
import { auditCmsIndexes } from '../src/server/db/cms-index-audit.ts'

if (process.argv.includes('--help')) {
  console.log('Read-only CMS index and required-identity audit. Uses MONGODB_URI/MONGODB_DB (.env.local as fallback). Reports only index metadata and counts, never documents or secrets. No repair, deletion or scheduling is performed.')
  process.exit(0)
}
if (process.argv.length > 2) throw new Error('Unknown argument. Use --help.')
try { process.loadEnvFile('.env.local') } catch {}
if (!process.env.MONGODB_URI || !process.env.MONGODB_DB?.trim()) throw new Error('Explicit MONGODB_URI and MONGODB_DB are required.')

const client = new MongoClient(process.env.MONGODB_URI, { appName: 'sgw-cms-schema-audit', serverSelectionTimeoutMS: 10000 })
try {
  await client.connect()
  const database = client.db(process.env.MONGODB_DB.trim())
  const collections = await database.listCollections({}, { nameOnly: true }).toArray()
  const names = new Set(collections.map(({ name }) => name))
  const results = []
  for (const [kind, name] of Object.entries(cmsCollectionNames)) {
    if (!names.has(name)) {
      results.push({ collection: name, status: 'not-initialized', issues: [] })
      continue
    }
    const collection = database.collection(name)
    const indexes = await collection.listIndexes().toArray()
    const issues = auditCmsIndexes(kind, indexes)
    // Missing indexed identities caused the upload incident. Count similar
    // records without exposing usernames, content, URLs or other stored values.
    for (const definition of cmsIndexDefinitions[kind].filter(({ unique }) => unique)) {
      const missing = await collection.countDocuments({
        $and: [definition.partialFilterExpression || {}, { $or: Object.keys(definition.key).map(field => ({ [field]: null })) }],
      })
      if (missing) issues.push({ index: definition.name, issue: `missing-required-identity:${missing}` })
    }
    results.push({ collection: name, status: issues.length ? 'needs-review' : 'ok', indexes: indexes.length, issues })
  }
  const initializedCollections = results.filter(({ status }) => status !== 'not-initialized').length
  const ok = initializedCollections > 0 && results.every(({ issues }) => issues.length === 0)
  console.log(JSON.stringify({
    database: database.databaseName, readOnly: true, ok, initializedCollections,
    ...(initializedCollections ? {} : { error: 'No CMS collections found. Verify the selected database before treating it as healthy.' }),
    collections: results,
  }, null, 2))
  if (!ok) process.exitCode = 1
} catch (error) {
  console.error('CMS database audit failed.', { name: error?.name, code: error?.code })
  process.exitCode = 1
} finally {
  await client.close()
}
