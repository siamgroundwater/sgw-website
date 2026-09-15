import { randomBytes, scryptSync } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { MongoClient, ObjectId } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'

if (process.argv.includes('--help')) {
  console.log('Use npm run test:e2e:cms for isolated browser tests, optionally --browser=firefox or --browser=webkit and --grep=title-pattern, or npm run test:e2e:cms:media for temporary provider upload tests. All allocate and remove their own test database. Run these suites sequentially; CMS_E2E_PORT selects an unused local port.')
  process.exit(0)
}
const flags = process.argv.slice(2)
if (flags.some(value => value !== '--media' && !/^--browser=(chromium|firefox|webkit)$/.test(value) && !value.startsWith('--grep='))) throw new Error('Unknown argument. Use --help.')
if (flags.filter(value => value.startsWith('--browser=')).length > 1) throw new Error('Select only one browser.')
if (flags.includes('--media') && flags.some(value => value.startsWith('--browser=') || value.startsWith('--grep='))) throw new Error('The real-provider suite uses its own Chromium workflow; do not combine --media with browser or title filters.')
const browserName = flags.find(value => value.startsWith('--browser='))?.slice('--browser='.length) || 'chromium'
if (flags.filter(value => value.startsWith('--grep=')).length > 1) throw new Error('Select only one title filter.')
const titleFilter = flags.find(value => value.startsWith('--grep='))?.slice('--grep='.length)
if (titleFilter !== undefined) {
  if (!titleFilter || titleFilter.length > 200) throw new Error('Title filter must contain 1-200 characters.')
  new RegExp(titleFilter)
}
try { process.loadEnvFile('.env.local') } catch {}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Tests create a NEW isolated database.')
const sourceDatabase = process.env.MONGODB_DB
const mediaMode = process.argv.includes('--media')
const database = 'sgw_test_' + Date.now() + '_' + randomBytes(4).toString('hex')
const port = Number(process.env.CMS_E2E_PORT || 3107)
const baseURL = 'http://localhost:' + port
const password = randomBytes(24).toString('base64url')
const secret = randomBytes(48).toString('base64url')
const mediaRoot = (process.env.CLOUDINARY_ROOT_FOLDER || 'siamgroundwater/cms').replace(/\/$/, '') + '/e2e/' + database
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
let server, databaseCreated = false
const children = new Set()
function start(args, env, stdio = 'inherit') {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio, windowsHide: true })
  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}
const done = child => new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error('Test process exited with code ' + code))) })
function safeServerOutput(output) {
  // Even temporary test credentials must not be printed if an unhydrated form
  // accidentally issues a native GET. Keep the path, not any query values.
  return output.replace(/(\b(?:GET|POST|PUT|PATCH|DELETE)\s+[^\s?]+)\?[^\s]*/g, '$1?[query redacted]')
    .replaceAll(password, '[test credential redacted]')
    .replaceAll(secret, '[test secret redacted]')
}
try {
  try {
    await fetch(baseURL, { signal: AbortSignal.timeout(1000) })
    throw new Error('The isolated test port is occupied. Set CMS_E2E_PORT to a free port.')
  } catch (error) { if (!error.cause && error.name !== 'TimeoutError') throw error }
  await client.connect()
  const hello = await client.db('admin').command({ hello: 1 })
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('CMS tests require a MongoDB replica set for transactional saves.')
  const db = client.db(database)
  if (database === sourceDatabase || (await db.listCollections().toArray()).length) throw new Error('Test database is not isolated.')
  const users = ['admin','editor','viewer'].map(role => {
    const salt = randomBytes(16).toString('base64url')
    return { _id: new ObjectId(), username: 'qa-' + role, usernameLower: 'qa-' + role, name: 'QA ' + role, role, status: 'active', passwordHash: 'scrypt$' + salt + '$' + scryptSync(password,salt,64).toString('base64url'), createdAt: new Date(), updatedAt: new Date() }
  })
  databaseCreated = true
  await db.collection('cmsUsers').insertMany(users)
  const projects = Array.from({ length: 150 }, (_, index) => ({
    _id: new ObjectId(), title: 'ผลงานทดสอบ ' + String(index).padStart(3,'0'),
    slug: 'qa-project-' + index, year: 2026, category: index === 149 ? ['government'] : ['factory'],
    coverImage: '/images/about/teams/icon-service-3.png', galleryImages: ['/images/about/teams/icon-service-3.png'],
    location: 'กรุงเทพมหานคร', summary: 'ข้อมูลภาษาไทยสำหรับทดสอบ', details: ['รายละเอียดภาษาไทย'],
    lat: 13.7563, lng: 100.5018, workTypes: ['groundwater-survey'], status: 'active', source: 'cms',
    translations: { en: { title: index === 149 ? 'Needle beyond old limit' : 'QA project ' + index, summary: 'English test summary', location: 'Bangkok', details: ['English details'] }, zh: { title: '中文项目', summary: '', location: '', details: [] } },
    createdAt: new Date(), updatedAt: new Date(Date.now() - index * 1000),
  }))
  await db.collection('cmsProjects').insertMany(projects)
  const env = {
    MONGODB_DB: database, CMS_SESSION_SECRET: secret, CMS_COOKIE_SECURE: 'false',
    SGW_CI_SKIP_DATABASE: 'false', SGW_CMS_TEST_BUILD: 'true',
    CLOUDINARY_CLOUD_NAME: 'isolated-test-no-provider', CLOUDINARY_API_KEY: 'isolated-test-key', CLOUDINARY_API_SECRET: 'isolated-test-secret',
    CLOUDINARY_ROOT_FOLDER: 'sgw-test/cms', CMS_E2E_BASE_URL: baseURL, CMS_E2E_BROWSER: browserName,
    CMS_E2E_PASSWORD: password, CMS_E2E_SOURCE_ID: String(projects[0]._id),
    CMS_E2E_DATABASE: database, CMS_E2E_ADMIN_ID: String(users[0]._id),
    CRON_SECRET: randomBytes(36).toString('base64url'), CMS_E2E_SOURCE_DATABASE: sourceDatabase || '',
    ...(mediaMode ? { CMS_E2E_MEDIA: 'true', CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET, CLOUDINARY_ROOT_FOLDER: mediaRoot } : {}),
  }
  server = start(['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', String(port)], env, ['ignore','pipe','pipe'])
  // Output is bounded and only printed for an unexpected failure; never dump environment values.
  let output = ''
  for (const stream of [server.stdout,server.stderr]) stream.on('data', data => { output = (output + data.toString()).slice(-16000) })
  const deadline = Date.now() + 120000
  let ready = false
  while (Date.now() < deadline && server.exitCode === null) {
    try { if ((await fetch(baseURL + '/cms/login', { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break } } catch {}
    await delay(1000)
  }
  if (!ready) { console.error(safeServerOutput(output)); throw new Error('Isolated CMS server did not become ready.') }
  console.log('Running CMS checks against isolated database ' + database + (mediaMode ? ' (temporary Cloudinary test images only).' : ' (no Cloudinary writes).'))
  try { await done(start(mediaMode ? ['scripts/e2e-cms-project-workflow.mjs'] : ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.cms.config.ts', '--output', 'test-results/cms-workflows-' + browserName + (titleFilter ? '-focused' : ''), ...(titleFilter ? ['--grep', titleFilter] : [])], env)) }
  catch (error) { console.error(safeServerOutput(output)); throw error }
} finally {
  await Promise.all([...children].map(child => new Promise(resolve => { child.once('exit', resolve); child.kill() })))
  // Only the exact fresh database allocated by this process can be removed.
  if (databaseCreated && /^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) && database !== sourceDatabase) {
    await client.db(database).dropDatabase()
    console.log('Removed isolated test database ' + database + '. The configured database was not changed.')
    if (mediaMode) {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })
      let cursor
      do {
        const assets = await cloudinary.api.resources({ resource_type: 'image', type: 'upload', prefix: mediaRoot + '/', max_results: 100, ...(cursor ? { next_cursor: cursor } : {}) })
        const ids = assets.resources.map(asset => asset.public_id)
        if (ids.some(id => !id.startsWith(mediaRoot + '/') || !mediaRoot.endsWith('/e2e/' + database))) throw new Error('Unexpected media cleanup target; stopped.')
        if (ids.length) await cloudinary.api.delete_resources(ids, { resource_type: 'image', type: 'upload', invalidate: true })
        cursor = assets.next_cursor
      } while (cursor)
      console.log('Verified cleanup of images in the exact temporary Cloudinary test namespace.')
    }
  }
  await client.close()
}
