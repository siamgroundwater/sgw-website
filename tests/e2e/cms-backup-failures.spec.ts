import { expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { BSON, MongoClient, ObjectId } from 'mongodb'

const database = process.env.CMS_E2E_DATABASE || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB || !process.env.MONGODB_URI) {
  throw new Error('Run backup failure checks through the isolated CMS test runner.')
}

const client = new MongoClient(process.env.MONGODB_URI)
const temporaryDatabases = new Set<string>()
const temporaryDirectories = new Set<string>()

function safeTemporaryDatabase(name: string) {
  return /^sgw_restore_(?:src|has|bad)_[0-9]+_[a-f0-9]{6}$/.test(name) &&
    name !== database && name !== process.env.CMS_E2E_SOURCE_DATABASE
}

function testArchive(sourceDatabase = database) {
  return {
    version: 1,
    sourceDatabase,
    createdAt: new Date().toISOString(),
    collections: [{
      name: 'shouldNeverAppear',
      indexes: [{ key: { _id: 1 }, name: '_id_' }],
      documents: [{ _id: 'restore-probe', value: 'synthetic test content' }],
    }],
    media: [],
    recoveryNotes: 'Synthetic archive for isolated restore guard tests only.',
  }
}

function encryptArchive(archive: ReturnType<typeof testArchive>, key: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const serialized = BSON.EJSON.stringify(archive, { relaxed: false })
  const ciphertext = Buffer.concat([cipher.update(gzipSync(serialized)), cipher.final()])
  return Buffer.concat([Buffer.from('SGWB1'), iv, cipher.getAuthTag(), ciphertext])
}

function runRestore(file: string, target: string, key: Buffer) {
  return new Promise<{ code: number; stderr: string; stdout: string }>((resolve) => {
    execFile(process.execPath, ['scripts/cms-backup.mjs', 'restore', `--file=${file}`, `--database=${target}`], {
      cwd: process.cwd(),
      env: { ...process.env, CMS_BACKUP_KEY: key.toString('base64') },
      timeout: 30_000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({
        code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        stderr,
        stdout,
      })
    })
  })
}

async function databaseFingerprint(name: string) {
  const db = client.db(name)
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(row => row.name).sort()
  const content = []
  for (const collectionName of names) {
    content.push({ collectionName, documents: await db.collection(collectionName).find({}).sort({ _id: 1 }).toArray() })
  }
  return createHash('sha256').update(BSON.EJSON.stringify(content, { relaxed: false })).digest('hex')
}

async function makeFixture(sourceDatabase = database) {
  const prefix = path.join(tmpdir(), 'sgw-restore-negative-')
  const directory = await mkdtemp(prefix)
  temporaryDirectories.add(directory)
  const key = randomBytes(32)
  const file = path.join(directory, 'fixture.sgwbackup')
  await writeFile(file, encryptArchive(testArchive(sourceDatabase), key), { flag: 'wx', mode: 0o600 })
  return { directory, file, key }
}

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => {
  for (const name of temporaryDatabases) {
    if (!safeTemporaryDatabase(name)) throw new Error('Unsafe temporary restore database cleanup target.')
    await client.db(name).dropDatabase()
  }
  const prefix = path.join(tmpdir(), 'sgw-restore-negative-')
  for (const directory of temporaryDirectories) {
    if (!directory.startsWith(prefix)) throw new Error('Unsafe temporary restore fixture cleanup target.')
    await rm(directory, { force: true, recursive: true })
  }
  await client.close()
})

test('restore refuses configured and archive-declared source databases without changing them', async () => {
  const fixture = await makeFixture()
  const configuredBefore = await databaseFingerprint(database)
  const configuredResult = await runRestore(fixture.file, database, fixture.key)
  expect(configuredResult.code).not.toBe(0)
  expect(configuredResult.stderr).toContain('Restore only supports a NEW isolated')
  expect(await databaseFingerprint(database)).toBe(configuredBefore)

  const archiveSource = `sgw_restore_src_${Date.now()}_${randomBytes(3).toString('hex')}`
  expect(safeTemporaryDatabase(archiveSource)).toBe(true)
  temporaryDatabases.add(archiveSource)
  const archiveFixture = await makeFixture(archiveSource)
  expect(await client.db(archiveSource).listCollections().toArray()).toHaveLength(0)
  const sourceResult = await runRestore(archiveFixture.file, archiveSource, archiveFixture.key)
  expect(sourceResult.code).not.toBe(0)
  expect(sourceResult.stderr).toContain('Restore only supports a NEW isolated')
  expect(await client.db(archiveSource).listCollections().toArray()).toHaveLength(0)
})

test('restore refuses an existing target and preserves its exact content', async () => {
  const fixture = await makeFixture()
  const target = `sgw_restore_has_${Date.now()}_${randomBytes(3).toString('hex')}`
  expect(safeTemporaryDatabase(target)).toBe(true)
  temporaryDatabases.add(target)
  await client.db(target).collection('sentinel').insertOne({ _id: new ObjectId(), keep: true })
  const before = await databaseFingerprint(target)

  const result = await runRestore(fixture.file, target, fixture.key)
  expect(result.code).not.toBe(0)
  expect(result.stderr).toContain('Restore target already has collections')
  expect(await databaseFingerprint(target)).toBe(before)
  expect(await client.db(target).collection('shouldNeverAppear').countDocuments()).toBe(0)
})

test('authenticated-ciphertext failure leaves a fresh restore target empty', async () => {
  const { directory, file, key } = await makeFixture()
  const original = await readFile(file)
  const changed = Buffer.from(original)
  changed[changed.length - 1] ^= 0x01
  const tampered = path.join(directory, 'tampered.sgwbackup')
  await writeFile(tampered, changed, { flag: 'wx', mode: 0o600 })
  const target = `sgw_restore_bad_${Date.now()}_${randomBytes(3).toString('hex')}`
  expect(safeTemporaryDatabase(target)).toBe(true)
  temporaryDatabases.add(target)

  const result = await runRestore(tampered, target, key)
  expect(result.code).not.toBe(0)
  expect(result.stderr).toContain('Recovery operation failed:')
  expect(await client.db(target).listCollections().toArray()).toHaveLength(0)
})
