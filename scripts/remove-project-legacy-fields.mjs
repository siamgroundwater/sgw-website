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
  appName: 'siamgroundwater-remove-project-legacy-fields',
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 10_000,
})

await client.connect()

try {
  const db = client.db(dbName)
  const projects = db.collection('cmsProjects')
  const revisions = db.collection('cmsProjectRevisions')
  const projectFilter = {
    $or: [
      { legacyPostId: { $exists: true } },
      { legacyUrl: { $exists: true } },
      { 'draft.legacyPostId': { $exists: true } },
      { 'draft.legacyUrl': { $exists: true } },
    ],
  }
  const revisionFilter = {
    $or: [
      { 'content.legacyPostId': { $exists: true } },
      { 'content.legacyUrl': { $exists: true } },
    ],
  }
  const before = {
    projects: await projects.countDocuments(projectFilter),
    revisions: await revisions.countDocuments(revisionFilter),
  }

  console.log(`Database: ${dbName}`)
  console.log(`Legacy fields found in ${before.projects} project documents and ${before.revisions} revision documents.`)

  if (!apply) {
    console.log('Dry run complete. Run with --apply to unset the legacy fields.')
  } else {
    const [projectResult, revisionResult] = await Promise.all([
      projects.updateMany(projectFilter, {
        $unset: {
          legacyPostId: '',
          legacyUrl: '',
          'draft.legacyPostId': '',
          'draft.legacyUrl': '',
        },
      }),
      revisions.updateMany(revisionFilter, {
        $unset: {
          'content.legacyPostId': '',
          'content.legacyUrl': '',
        },
      }),
    ])
    const after = {
      projects: await projects.countDocuments(projectFilter),
      revisions: await revisions.countDocuments(revisionFilter),
    }

    console.log(`Updated ${projectResult.modifiedCount} project documents and ${revisionResult.modifiedCount} revision documents.`)
    console.log(`Remaining: ${after.projects} project documents and ${after.revisions} revision documents.`)
    if (after.projects || after.revisions) process.exitCode = 1
  }
} finally {
  await client.close()
}
