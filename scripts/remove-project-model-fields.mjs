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
const dbName = process.env.MONGODB_DB || 'siamgroundwater'
const client = new MongoClient(process.env.MONGODB_URI, {
  appName: 'siamgroundwater-remove-project-model-fields',
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 10_000,
})

const projectPaths = [
  'businessTypes',
  'projectType',
  'publicId',
  'translations.en.businessTypes',
  'draft.businessTypes',
  'draft.projectType',
  'draft.publicId',
  'draft.translations.en.businessTypes',
]
const revisionPaths = [
  'content.businessTypes',
  'content.projectType',
  'content.publicId',
  'content.translations.en.businessTypes',
]
const validCategories = ['government', 'factory', 'resort', 'agriculture', 'dewatering', 'other']
const validCategorySet = new Set(validCategories)

async function invalidCategoryCount(projects) {
  const rows = await projects.find({}, { projection: { category: 1 } }).toArray()
  return rows.filter((row) => (
    !Array.isArray(row.category) ||
    !row.category.length ||
    row.category.some((category) => !validCategorySet.has(category))
  )).length
}

function existsFilter(paths) {
  return { $or: paths.map((path) => ({ [path]: { $exists: true } })) }
}

function unsetFields(paths) {
  return Object.fromEntries(paths.map((path) => [path, '']))
}

await client.connect()

try {
  const db = client.db(dbName)
  const projects = db.collection('cmsProjects')
  const revisions = db.collection('cmsProjectRevisions')
  const projectFilter = existsFilter(projectPaths)
  const revisionFilter = existsFilter(revisionPaths)
  const indexes = await projects.indexes()
  const obsoleteIndexes = indexes.filter((index) => (
    Object.keys(index.key).length === 1 && index.key.publicId === 1
  ))
  const before = {
    invalidCategories: await invalidCategoryCount(projects),
    projects: await projects.countDocuments(projectFilter),
    revisions: await revisions.countDocuments(revisionFilter),
  }

  console.log(`Database: ${dbName}`)
  console.log(`Obsolete fields found in ${before.projects} project documents and ${before.revisions} revision documents.`)
  console.log(`Projects without a valid replacement category: ${before.invalidCategories}.`)
  console.log(`Obsolete numeric publicId indexes: ${obsoleteIndexes.map((index) => index.name).join(', ') || 'none'}.`)

  if (!apply) {
    console.log('Dry run complete. Run with --apply to unset the fields and remove the obsolete index.')
  } else {
    const [projectResult, revisionResult] = await Promise.all([
      projects.updateMany(projectFilter, { $unset: unsetFields(projectPaths) }),
      revisions.updateMany(revisionFilter, { $unset: unsetFields(revisionPaths) }),
    ])
    for (const index of obsoleteIndexes) await projects.dropIndex(index.name)

    const remainingIndexes = await projects.indexes()
    const after = {
      invalidCategories: await invalidCategoryCount(projects),
      projects: await projects.countDocuments(projectFilter),
      revisions: await revisions.countDocuments(revisionFilter),
      indexes: remainingIndexes.filter((index) => (
        Object.keys(index.key).length === 1 && index.key.publicId === 1
      )).length,
    }

    console.log(`Updated ${projectResult.modifiedCount} project documents and ${revisionResult.modifiedCount} revision documents.`)
    console.log(`Removed ${obsoleteIndexes.length} obsolete index(es).`)
    console.log(`Remaining: ${after.projects} project documents, ${after.revisions} revision documents, ${after.indexes} obsolete indexes.`)
    console.log(`Projects without a valid replacement category: ${after.invalidCategories}.`)
    if (after.projects || after.revisions || after.indexes || after.invalidCategories) process.exitCode = 1
  }
} finally {
  await client.close()
}
