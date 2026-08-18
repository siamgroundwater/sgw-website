import { randomBytes, scryptSync } from 'node:crypto'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { MongoClient } from 'mongodb'

try { process.loadEnvFile('.env.local') } catch {}
if (process.argv[2]) process.env.E2E_BASE_URL = process.argv[2]

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'siamgroundwater'
if (!uri) throw new Error('MONGODB_URI is required.')
if (!/(?:dev|test|preview|staging)/i.test(dbName)) {
  throw new Error(`Refusing to run the destructive CMS workflow test against database ${dbName}. Use an isolated dev, test, preview, or staging database.`)
}

const username = `e2e-${Date.now()}`
const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
const password = randomBytes(24).toString('base64url')
const salt = randomBytes(16).toString('base64url')
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('base64url')}`
const client = new MongoClient(uri, { appName: 'siamgroundwater-e2e-runner', serverSelectionTimeoutMS: 8000 })
let userId
let connected = false

try {
  await client.connect()
  connected = true
  const users = client.db(dbName).collection('cmsUsers')
  const now = new Date()
  const result = await users.insertOne({
    createdAt: now,
    name: 'Temporary E2E Administrator',
    passwordHash,
    role: 'admin',
    status: 'active',
    updatedAt: now,
    username,
    usernameLower: username,
  })
  userId = result.insertedId

  const child = spawn(process.execPath, ['scripts/e2e-cms-project-workflow.mjs'], {
    env: { ...process.env, CMS_E2E_PASSWORD: password, CMS_E2E_RUN_ID: runId, CMS_E2E_USERNAME: username },
    stdio: 'inherit',
  })
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
  if (exitCode !== 0) throw new Error(`CMS workflow test exited with code ${exitCode}.`)
} finally {
  if (!connected) {
    await client.close()
    process.exitCode = 1
  } else {
  const db = client.db(dbName)
  const temporaryProjects = await db.collection('cmsProjects').find(
    { slug: `e2e-project-${runId}` },
    { projection: { _id: 1 } }
  ).toArray().catch(() => [])
  const projectIds = temporaryProjects.map(({ _id }) => _id)
  if (projectIds.length) {
    await db.collection('cmsProjectRevisions').deleteMany({ projectId: { $in: projectIds } })
    await db.collection('cmsAuditLogs').deleteMany({ 'entity.id': { $in: projectIds.map(String) } })
    await db.collection('cmsProjects').deleteMany({ _id: { $in: projectIds } })
  }
  if (userId) await db.collection('cmsUsers').deleteOne({ _id: userId })
  const [remainingProjects, remainingUsers] = await Promise.all([
    db.collection('cmsProjects').countDocuments({ slug: `e2e-project-${runId}` }),
    db.collection('cmsUsers').countDocuments({ usernameLower: username }),
  ])
  await client.close()
  if (remainingProjects || remainingUsers) {
    throw new Error('Temporary CMS workflow test data was not fully removed.')
  }
  }
}
