import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient } from 'mongodb'

try { process.loadEnvFile('.env.local') } catch {}

const dbName = process.env.MONGODB_DB || 'siamgroundwater'
if (!/(?:dev|test|preview|staging)/i.test(dbName)) {
  throw new Error(`Refusing orphan cleanup test against database ${dbName}.`)
}
const required = ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required.`)

const port = Number(process.argv[2] || 3010)
const baseUrl = `http://localhost:${port}`
const secret = randomBytes(32).toString('base64url')
const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
const root = process.env.CLOUDINARY_ROOT_FOLDER || 'siamgroundwater/cms'
const publicId = `${root}/e2e-orphan-tests/${runId}`
const client = new MongoClient(process.env.MONGODB_URI, { appName: 'siamgroundwater-orphan-e2e', serverSelectionTimeoutMS: 8000 })
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], {
  env: { ...process.env, CRON_SECRET: secret },
  stdio: ['ignore', 'pipe', 'pipe'],
})

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  secure: true,
})

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2000) })
      if (response.status === 200) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Timed out waiting for the orphan cleanup test server.')
}

try {
  await client.connect()
  await waitForServer()
  const uploaded = await cloudinary.uploader.upload(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    { overwrite: false, public_id: publicId, resource_type: 'image', tags: ['sgw', 'cms', 'e2e-orphan-test'] }
  )
  await client.db(dbName).collection('cmsStagedProjectMedia').insertOne({
    asset: {
      bytes: uploaded.bytes,
      createdAt: uploaded.created_at,
      format: uploaded.format,
      height: uploaded.height,
      publicId: uploaded.public_id,
      src: uploaded.secure_url,
      width: uploaded.width,
    },
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 60 * 1000),
    submissionId: `e2e_${runId}`,
    userId: `e2e_${runId}`,
  })

  const response = await fetch(`${baseUrl}/api/cron/cleanup-project-media`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20_000),
  })
  const payload = await response.json()
  assert.equal(response.status, 200, JSON.stringify(payload))
  assert.equal(payload.removed, 1)
  assert.equal(await client.db(dbName).collection('cmsStagedProjectMedia').countDocuments({ 'asset.publicId': publicId }), 0)
  await assert.rejects(cloudinary.api.resource(publicId, { resource_type: 'image' }))
  console.log(`Orphan cleanup workflow removed temporary Cloudinary asset ${publicId}.`)
} finally {
  await client.db(dbName).collection('cmsStagedProjectMedia').deleteMany({ 'asset.publicId': publicId }).catch(() => undefined)
  await cloudinary.api.delete_resources([publicId], { invalidate: true, resource_type: 'image', type: 'upload' }).catch(() => undefined)
  await client.close()
  server.kill('SIGTERM')
}
