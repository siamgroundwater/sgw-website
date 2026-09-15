import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import { BSON } from 'mongodb'

const workspaceRoot = process.cwd()

function encryptArchive(archive, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const serialized = BSON.EJSON.stringify(archive, { relaxed: false })
  const ciphertext = Buffer.concat([cipher.update(gzipSync(serialized)), cipher.final()])
  return Buffer.concat([Buffer.from('SGWB1'), iv, cipher.getAuthTag(), ciphertext])
}

function baseArchive(media = []) {
  return {
    version: 1,
    sourceDatabase: 'sgw_test_backup_fixture',
    createdAt: '2026-09-15T00:00:00.000Z',
    collections: [{ name: 'cmsFixture', indexes: [{ key: { _id: 1 }, name: '_id_' }], documents: [] }],
    media,
    recoveryNotes: 'Synthetic archive for integrity tests only.',
  }
}

function runVerify(file, key) {
  return spawnSync(process.execPath, ['scripts/cms-backup.mjs', 'verify', `--file=${file}`], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CMS_BACKUP_KEY: key.toString('base64'),
      MONGODB_DB: '',
      MONGODB_URI: '',
    },
    timeout: 15_000,
    windowsHide: true,
  })
}

async function fixture(t, archive = baseArchive()) {
  const prefix = path.join(tmpdir(), 'sgw-backup-negative-')
  const directory = await mkdtemp(prefix)
  t.after(async () => {
    assert.ok(directory.startsWith(prefix))
    await rm(directory, { force: true, recursive: true })
  })
  const key = randomBytes(32)
  const file = path.join(directory, 'fixture.sgwbackup')
  await writeFile(file, encryptArchive(archive, key), { flag: 'wx', mode: 0o600 })
  return { directory, file, key }
}

test('backup verifier accepts a valid authenticated fixture without MongoDB access', async t => {
  const { file, key } = await fixture(t)
  const result = runVerify(file, key)
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)
  assert.equal(output.verified, true)
  assert.equal(output.sourceDatabase, 'sgw_test_backup_fixture')
})

test('backup verifier rejects the wrong recovery key', async t => {
  const { file } = await fixture(t)
  const result = runVerify(file, randomBytes(32))
  assert.equal(result.error, undefined)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Recovery operation failed:/)
  assert.doesNotMatch(result.stdout + result.stderr, /sgw_test_backup_fixture/)
})

test('backup verifier rejects truncated and ciphertext-tampered archives', async t => {
  const { directory, file, key } = await fixture(t)
  const original = await readFile(file)
  const truncated = path.join(directory, 'truncated.sgwbackup')
  const tampered = path.join(directory, 'tampered.sgwbackup')
  await writeFile(truncated, original.subarray(0, Math.max(1, original.length - 9)), { flag: 'wx', mode: 0o600 })
  const changed = Buffer.from(original)
  changed[changed.length - 1] ^= 0x01
  await writeFile(tampered, changed, { flag: 'wx', mode: 0o600 })

  for (const candidate of [truncated, tampered]) {
    const result = runVerify(candidate, key)
    assert.equal(result.error, undefined)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Recovery operation failed:/)
  }
})

test('backup verifier rejects authenticated media whose checksum is invalid', async t => {
  const bytes = Buffer.from('synthetic image bytes')
  const archive = baseArchive([{
    url: 'https://res.cloudinary.com/example/image/upload/fixture.png',
    contentType: 'image/png',
    sha256: createHash('sha256').update(Buffer.from('different bytes')).digest('hex'),
    base64: bytes.toString('base64'),
  }])
  const { file, key } = await fixture(t, archive)
  const result = runVerify(file, key)
  assert.equal(result.error, undefined)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Backup media checksum mismatch/)
})
