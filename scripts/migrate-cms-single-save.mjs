import { MongoClient, BSON } from 'mongodb'
import { readBackup } from './cms-backup.mjs'

try { process.loadEnvFile('.env.local') } catch {}
const argumentsList = process.argv.slice(2)
const argument = name => argumentsList.find(value => value.startsWith(name + '='))?.slice(name.length + 1)
const apply = argumentsList.includes('--apply')
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
try {
  const db = client.db(process.env.MONGODB_DB)
  const collection = db.collection('cmsProjects')
  const rows = await collection.find({}).sort({ _id: 1 }).toArray()
  const drafts = rows.filter(row => row.draft || row.status === 'draft')
  const fields = ['draft', 'publishedAt', 'publishedBy', 'publishedVersion']
  const changes = rows.filter(row => fields.some(field => Object.hasOwn(row, field)) || row.status === 'archived' && !row.deletedAt)
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', database: db.databaseName, projects: rows.length, affected: changes.length, draftContentNeedsDecision: drafts.length, historicalRevisionsRetained: await db.collection('cmsProjectRevisions').countDocuments() }, null, 2))
  if (drafts.length) throw new Error('Unpublished content exists. Preserve a full backup and choose what should become live before migrating. No changes made.')
  if (apply) {
    if (!argument('--backup') || argument('--confirm-database') !== db.databaseName) throw new Error('Apply requires --backup=... and --confirm-database=<exact configured database>.')
    const archive = await readBackup(argument('--backup'))
    if (archive.sourceDatabase !== db.databaseName) throw new Error('Backup belongs to a different database.')
    const prior = archive.collections.find(item => item.name === 'cmsProjects')?.documents
    if (!prior || prior.length !== rows.length) throw new Error('Project inventory changed since backup. Create a fresh backup.')
    for (const [index, row] of rows.entries()) {
      if (BSON.EJSON.stringify(row, { relaxed: false }) !== BSON.EJSON.stringify(prior[index], { relaxed: false })) throw new Error('Project content changed since backup. Create a fresh backup.')
    }
    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        for (const row of changes) {
          const result = await collection.updateOne({ _id: row._id, updatedAt: row.updatedAt }, {
            $unset: Object.fromEntries(fields.map(field => [field, ''])),
            ...(row.status === 'archived' && !row.deletedAt ? { $set: { deletedAt: row.updatedAt } } : {}),
          }, { session })
          if (result.matchedCount !== 1) throw new Error('A project changed during migration. Transaction cancelled.')
        }
      })
    } finally { await session.endSession() }
    const remaining = await collection.countDocuments({ $or: fields.map(field => ({ [field]: { $exists: true } })) })
    if (remaining) throw new Error('Migration verification found remaining publication fields.')
    console.log('Verified single-Save records. Historical revisions remain recovery-only; no content or images were deleted.')
  }
} finally { await client.close() }
