import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { BSON, MongoClient } from 'mongodb'

try { process.loadEnvFile('.env.local') } catch {}
const flags = process.argv.slice(2)
const mode = flags[0] || 'backup'
const option = name => flags.find(value => value.startsWith(name + '='))?.slice(name.length + 1)
const directory = resolve('.cms-backups')
const hash = data => createHash('sha256').update(data).digest('hex')
const serial = data => BSON.EJSON.stringify(data, { relaxed: false })

async function encryptionKey(create = false) {
  if (process.env.CMS_BACKUP_KEY) {
    const key = Buffer.from(process.env.CMS_BACKUP_KEY, 'base64')
    if (key.length !== 32) throw new Error('CMS_BACKUP_KEY must be a base64-encoded 32-byte key.')
    return key
  }
  const path = resolve(option('--key-file') || join(directory, 'recovery.key'))
  try {
    const key = await readFile(path)
    if (key.length !== 32) throw new Error('Invalid recovery key length.')
    return key
  } catch (error) {
    if (!create || error.code !== 'ENOENT') throw error
    const key = randomBytes(32)
    await writeFile(path, key, { flag: 'wx', mode: 0o600 })
    console.log('Created recovery key file. Keep a separate, secure offline copy; it is required to restore.')
    return key
  }
}

export async function readBackup(path) {
  const bytes = await readFile(resolve(path))
  if (bytes.subarray(0, 5).toString() !== 'SGWB1') throw new Error('Not a supported SGW backup.')
  const decipher = createDecipheriv('aes-256-gcm', await encryptionKey(), bytes.subarray(5, 17))
  decipher.setAuthTag(bytes.subarray(17, 33))
  const payload = Buffer.concat([decipher.update(bytes.subarray(33)), decipher.final()])
  const archive = BSON.EJSON.parse(gunzipSync(payload).toString(), { relaxed: false })
  if (Number(archive.version) !== 1 || !Array.isArray(archive.collections)) throw new Error('Invalid backup structure.')
  for (const media of archive.media) {
    if (hash(Buffer.from(media.base64, 'base64')) !== media.sha256) throw new Error('Backup media checksum mismatch.')
  }
  return archive
}

function imageReferences(value, result = new Set()) {
  if (typeof value === 'string' && value.startsWith('https://res.cloudinary.com/')) result.add(value)
  else if (Array.isArray(value)) for (const child of value) imageReferences(child, result)
  else if (value && typeof value === 'object') for (const child of Object.values(value)) imageReferences(child, result)
  return result
}

async function main() {
  if (!['backup', 'verify', 'restore'].includes(mode)) throw new Error('Use backup, verify --file=..., or restore --file=... --database=sgw_restore_...')
  await mkdir(directory, { recursive: true })
  if (mode === 'verify') {
    if (!option('--file')) throw new Error('--file is required.')
    const archive = await readBackup(option('--file'))
    console.log(JSON.stringify({ verified: true, sourceDatabase: archive.sourceDatabase, createdAt: archive.createdAt, collections: archive.collections.map(row => ({ name: row.name, count: row.documents.length })), media: archive.media.length }, null, 2))
    return
  }
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw new Error('Configure MongoDB before running recovery tools.')
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    if (mode === 'restore') {
      if (!option('--file')) throw new Error('--file is required.')
      const archive = await readBackup(option('--file'))
      const target = option('--database')
      if (!target || !/^sgw_restore_[a-z0-9_]{6,45}$/.test(target) || target === process.env.MONGODB_DB || target === archive.sourceDatabase) throw new Error('Restore only supports a NEW isolated sgw_restore_* database, never the configured or source database.')
      const db = client.db(target)
      if ((await db.listCollections({}, { nameOnly: true }).toArray()).length) throw new Error('Restore target already has collections. Choose a new isolated database.')
      for (const entry of archive.collections) {
        await db.createCollection(entry.name)
        const collection = db.collection(entry.name)
        if (entry.documents.length) await collection.insertMany(entry.documents)
        for (const definition of entry.indexes) {
          if (definition.name === '_id_') continue
          const { key, name, unique, sparse, partialFilterExpression, collation, weights, default_language, language_override } = definition
          // Do not enable TTL during a drill: it would immediately erase old recovery evidence.
          const options = Object.fromEntries(Object.entries({ name, unique, sparse, partialFilterExpression, collation, weights, default_language, language_override }).filter(([, value]) => value !== undefined))
          const restoredKey = key._fts === 'text' ? Object.fromEntries(Object.entries(key).flatMap(([field, direction]) => field === '_fts' ? Object.keys(weights || {}).map(field => [field, 'text']) : field === '_ftsx' ? [] : [[field, direction]])) : key
          await collection.createIndex(restoredKey, options)
        }
        const restored = await collection.find({}).sort({ _id: 1 }).toArray()
        if (hash(serial(restored)) !== hash(serial(entry.documents))) throw new Error('Restored content does not match: ' + entry.name)
      }
      console.log(JSON.stringify({ restoredAndVerified: true, targetDatabase: target, collections: archive.collections.length, mediaChecksumsVerified: archive.media.length, note: 'Isolated drill only. No production pointers or Cloudinary assets changed. TTL definitions remain in the archive and are not activated in the drill.' }, null, 2))
      return
    }
    const db = client.db(process.env.MONGODB_DB)
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(row => row.name).filter(name => !name.startsWith('system.')).sort()
    const session = client.startSession()
    let collections
    try {
      collections = await session.withTransaction(async () => {
        const entries = []
        for (const name of names) entries.push({ name, indexes: await db.collection(name).listIndexes().toArray(), documents: await db.collection(name).find({}, { session }).sort({ _id: 1 }).toArray() })
        return entries
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
    } finally { await session.endSession() }
    const references = [...imageReferences(collections)]
    const media = []
    let next = 0, totalBytes = 0
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < references.length) {
        const url = references[next++]
        const parsed = new URL(url)
        if (parsed.username || parsed.password || parsed.port || parsed.pathname.split('/')[1] !== process.env.CLOUDINARY_CLOUD_NAME || !parsed.pathname.includes('/image/upload/')) throw new Error('Unexpected Cloudinary reference. Backup stopped for manual review.')
        const response = await fetch(url, { signal: AbortSignal.timeout(45000), redirect: 'error' })
        if (!response.ok) throw new Error('A referenced image could not be backed up. HTTP ' + response.status)
        const bytes = Buffer.from(await response.arrayBuffer())
        totalBytes += bytes.length
        if (bytes.length > 25 * 1024 * 1024 || totalBytes > 512 * 1024 * 1024) throw new Error('Backup exceeds in-memory media safety limit. Use provider export for larger archives.')
        media.push({ url, contentType: response.headers.get('content-type'), sha256: hash(bytes), base64: bytes.toString('base64') })
      }
    }))
    const archive = { version: 1, sourceDatabase: process.env.MONGODB_DB, createdAt: new Date().toISOString(), collections, media, recoveryNotes: 'Contains MongoDB documents/index definitions and bytes for all referenced Cloudinary images, including Trash and historical revisions. Source code, environment secrets, DNS, provider settings, and unreferenced provider assets require independent backup.' }
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', await encryptionKey(true), iv)
    const ciphertext = Buffer.concat([cipher.update(gzipSync(serial(archive))), cipher.final()])
    const path = join(directory, 'cms-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sgwbackup')
    await writeFile(path, Buffer.concat([Buffer.from('SGWB1'), iv, cipher.getAuthTag(), ciphertext]), { flag: 'wx', mode: 0o600 })
    await readBackup(path)
    console.log(JSON.stringify({ backup: path, verified: true, database: archive.sourceDatabase, collections: collections.map(row => ({ name: row.name, count: row.documents.length })), media: media.length, bytes: totalBytes }, null, 2))
  } finally { await client.close() }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('Recovery operation failed:', error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[redacted connection]')); process.exitCode = 1 })
}
