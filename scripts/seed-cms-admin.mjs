import { randomBytes, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { ensureCmsIndexes } from '../src/server/db/cms-indexes.ts'

function loadEnvFile(path) {
  const values = {}
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const clean = line.trim()
      if (!clean || clean.startsWith('#')) continue
      const separator = clean.indexOf('=')
      if (separator < 1) continue
      const key = clean.slice(0, separator).trim()
      let value = clean.slice(separator + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      values[key] = value
    }
  } catch {
    return values
  }
  return values
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, 64).toString('base64url')
  return `scrypt$${salt}$${hash}`
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const uri = env.MONGODB_URI
const dbName = env.MONGODB_DB || 'siamgroundwater'
const username = (env.CMS_SEED_USERNAME || 'admin').trim()
const password = env.CMS_SEED_PASSWORD || ''
const displayName = (env.CMS_SEED_DISPLAY_NAME || 'SGW Administrator').trim()

if (!uri) throw new Error('Missing MONGODB_URI. Add it to .env.local first.')
if (!/^[a-z0-9._-]{3,80}$/i.test(username)) throw new Error('CMS_SEED_USERNAME is invalid.')
if (password.length < 12 || password.toLowerCase() === 'admin') {
  throw new Error('Set CMS_SEED_PASSWORD to a strong password containing at least 12 characters.')
}
if (password.length > 256) throw new Error('CMS_SEED_PASSWORD must not exceed 256 characters.')
if (!displayName) throw new Error('CMS_SEED_DISPLAY_NAME is required.')

const client = new MongoClient(uri, { appName: 'siamgroundwater-cms-seed' })
await client.connect()

try {
  const users = client.db(dbName).collection('cmsUsers')
  await ensureCmsIndexes(users, 'users')
  const now = new Date()
  await users.updateOne(
    { usernameLower: username.toLowerCase() },
    {
      $set: {
        name: displayName,
        passwordHash: hashPassword(password),
        role: 'admin',
        status: 'active',
        updatedAt: now,
        username,
        usernameLower: username.toLowerCase(),
      },
      $setOnInsert: { createdAt: now },
      $unset: { deletedAt: '' },
    },
    { upsert: true }
  )
  console.log(`Seeded SGW CMS administrator "${username}" in database "${dbName}".`)
} finally {
  await client.close()
}
