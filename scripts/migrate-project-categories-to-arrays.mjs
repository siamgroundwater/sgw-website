import { MongoClient } from 'mongodb'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Environment variables may already be supplied by the host.
}

if (!process.env.MONGODB_URI) {
  throw new Error('Missing MONGODB_URI. Add it to .env.local first.')
}

const apply = process.argv.includes('--apply')
const validCategories = new Set(['government', 'factory', 'resort', 'agriculture', 'dewatering', 'other'])
const dbName = process.env.MONGODB_DB || 'siamgroundwater'
const client = new MongoClient(process.env.MONGODB_URI, {
  appName: 'siamgroundwater-project-category-array-migration',
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 10_000,
})

function validCategoryArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => validCategories.has(item))
}

await client.connect()

try {
  const db = client.db(dbName)
  const projects = db.collection('cmsProjects')
  const revisions = db.collection('cmsProjectRevisions')
  const projectRows = await projects.find({}, { projection: { category: 1, 'draft.category': 1 } }).toArray()
  const revisionRows = await revisions.find({}, { projection: { 'content.category': 1 } }).toArray()
  const projectOperations = []
  const revisionOperations = []

  for (const row of projectRows) {
    const set = {}
    if (typeof row.category === 'string' && validCategories.has(row.category)) set.category = [row.category]
    if (typeof row.draft?.category === 'string' && validCategories.has(row.draft.category)) set['draft.category'] = [row.draft.category]
    if (Object.keys(set).length) projectOperations.push({ updateOne: { filter: { _id: row._id }, update: { $set: set } } })
  }
  for (const row of revisionRows) {
    const category = row.content?.category
    if (typeof category === 'string' && validCategories.has(category)) {
      revisionOperations.push({ updateOne: { filter: { _id: row._id }, update: { $set: { 'content.category': [category] } } } })
    }
  }

  const invalidBefore = projectRows.filter((row) => (
    !(typeof row.category === 'string' && validCategories.has(row.category)) && !validCategoryArray(row.category)
  )).length
  console.log(`Database: ${dbName}`)
  console.log(`Projects to migrate: ${projectOperations.length}; revisions to migrate: ${revisionOperations.length}.`)
  console.log(`Invalid project categories before migration: ${invalidBefore}.`)

  if (!apply) {
    console.log('Dry run complete. Run with --apply to convert category strings into arrays.')
  } else {
    if (projectOperations.length) await projects.bulkWrite(projectOperations, { ordered: true })
    if (revisionOperations.length) await revisions.bulkWrite(revisionOperations, { ordered: true })

    const projectAfter = await projects.find({}, { projection: { category: 1, 'draft.category': 1 } }).toArray()
    const revisionAfter = await revisions.find({}, { projection: { 'content.category': 1 } }).toArray()
    const invalidProjects = projectAfter.filter((row) => !validCategoryArray(row.category)).length
    const invalidDrafts = projectAfter.filter((row) => row.draft && !validCategoryArray(row.draft.category)).length
    const invalidRevisions = revisionAfter.filter((row) => !validCategoryArray(row.content?.category)).length

    console.log(`Remaining invalid categories: ${invalidProjects} projects, ${invalidDrafts} drafts, ${invalidRevisions} revisions.`)
    if (invalidProjects || invalidDrafts || invalidRevisions) process.exitCode = 1
  }
} finally {
  await client.close()
}
