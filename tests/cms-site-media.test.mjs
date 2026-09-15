import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  siteMediaFallbacks,
  siteMediaSectionKeys,
  siteMediaUploadTarget,
} from '../src/lib/site-media.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const state = { failRead: false, row: null }
const collection = {
  async createIndex() {},
  async findOne() {
    if (state.failRead) throw new Error('database unavailable')
    return state.row
  },
  find() {
    return { async toArray() { return state.row ? [state.row] : [] } }
  },
  async findOneAndUpdate(query, update) {
    if (!state.row || +state.row.updatedAt !== +query.updatedAt) return null
    state.row = { ...state.row, ...update.$set }
    return state.row
  },
  async insertOne(document) {
    if (state.row) {
      const error = new Error('duplicate')
      error.code = 11000
      throw error
    }
    state.row = document
    return { insertedId: document._id }
  },
}
globalThis.__sgwSiteMediaTest = { collection }
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
const targetUrl = pathToFileURL(path.join(root, 'src/server/cms/site-media.ts')).href
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL !== targetUrl) return nextResolve(specifier, context)
    if (specifier === 'server-only') return { url: moduleUrl('export {}'), shortCircuit: true }
    if (specifier === '@/server/db') return { url: moduleUrl('export async function getCmsSiteMediaCollection() { return globalThis.__sgwSiteMediaTest.collection }'), shortCircuit: true }
    if (specifier === './content') return { url: moduleUrl('export class CmsContentError extends Error { constructor(message, status = 400) { super(message); this.status = status } }'), shortCircuit: true }
    if (specifier === '@/lib/site-media') return { url: pathToFileURL(path.join(root, 'src/lib/site-media.ts')).href, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
const media = await import(targetUrl)
hook.deregister()

test.beforeEach(() => {
  state.failRead = false
  state.row = null
})

test('site-media resolver uses complete stored images and safely falls back on missing data or database failure', async () => {
  const missing = await media.getCmsSiteMediaSection('project-map')
  assert.equal(missing.fallback, true)
  assert.deepEqual(missing.images, siteMediaFallbacks['project-map'])

  state.row = {
    _id: 'project-map',
    createdAt: new Date('2026-09-14T00:00:00Z'),
    images: [{ src: 'https://res.cloudinary.com/example/image/upload/map.jpg' }],
    updatedAt: new Date('2026-09-14T01:00:00Z'),
    updatedBy: 'user',
  }
  const stored = await media.getCmsSiteMediaSection('project-map')
  assert.equal(stored.fallback, false)
  assert.deepEqual(stored.images, [state.row.images[0].src])

  state.failRead = true
  assert.deepEqual(
    await media.getPublicSiteMediaImages('project-map'),
    siteMediaFallbacks['project-map']
  )
})

test('site-media validation enforces fixed sections and image counts', () => {
  assert.deepEqual(
    media.validateSiteMediaImageList('about-hero', ['https://example.com/slide.webp']).images,
    ['https://example.com/slide.webp']
  )
  assert.throws(() => media.validateSiteMediaImageList('unknown', []), /Invalid media section/)
  assert.throws(() => media.validateSiteMediaImageList('project-map', []), /exactly 1 image/)
  assert.throws(() => media.validateSiteMediaImageList('service-survey', ['https://example.com/hero.webp']), /2-13 images/)
})

test('site-media compare-and-set refuses stale editor data', async () => {
  const now = new Date('2026-09-14T01:00:00Z')
  state.row = {
    _id: 'project-map', createdAt: now,
    images: [{ src: siteMediaFallbacks['project-map'][0] }],
    updatedAt: now, updatedBy: 'first-user',
  }
  await assert.rejects(
    media.saveCmsSiteMediaSection(
      'project-map',
      [{ src: 'https://res.cloudinary.com/example/image/upload/new-map.jpg' }],
      '2026-09-13T01:00:00.000Z',
      'second-user',
      {}
    ),
    /changed/
  )
})

test('an invalid stored image list exposes fallbacks without losing the repair timestamp', async () => {
  const updatedAt = new Date('2026-09-14T02:00:00Z')
  state.row = {
    _id: 'project-map',
    createdAt: new Date('2026-09-14T01:00:00Z'),
    images: [],
    updatedAt,
    updatedBy: 'first-user',
  }

  const fallback = await media.getCmsSiteMediaSection('project-map')
  assert.equal(fallback.fallback, true)
  assert.equal(fallback.updatedAt, updatedAt.toISOString())

  const repaired = await media.saveCmsSiteMediaSection(
    'project-map',
    [{ src: siteMediaFallbacks['project-map'][0] }],
    fallback.updatedAt,
    'repair-user',
    {}
  )
  assert.equal(repaired.fallback, false)
})

test('CMS media workflow prepares locally, shows progress, binds uploads to a section, and commits in one transaction', () => {
  const editor = readFileSync(path.join(root, 'src/components/cms/CmsSiteMediaEditor.tsx'), 'utf8')
  const selector = readFileSync(path.join(root, 'src/components/cms/CmsDeferredProjectImages.tsx'), 'utf8')
  const editorStyles = readFileSync(path.join(root, 'src/components/cms/CmsProjectEditor.css'), 'utf8')
  const overview = readFileSync(path.join(root, 'src/app/cms/media/page.tsx'), 'utf8')
  const cmsStyles = readFileSync(path.join(root, 'src/app/cms/cms.css'), 'utf8')
  const compression = readFileSync(path.join(root, 'src/lib/client-image-compression.ts'), 'utf8')
  const uploadRoute = readFileSync(path.join(root, 'src/app/api/cms/media/upload/route.ts'), 'utf8')
  const saveRoute = readFileSync(path.join(root, 'src/app/api/cms/media/route.ts'), 'utf8')
  const stagedMedia = readFileSync(path.join(root, 'src/server/cms/staged-project-media.ts'), 'utf8')
  const review = readFileSync(path.join(root, 'scripts/review-cms-media.mjs'), 'utf8')

  assert.match(selector, /<progress max="100" value=\{preparationProgress\}/)
  assert.match(selector, /prepareCmsImage\(file/)
  assert.match(editor, /import '\.\/CmsProjectEditor\.css'/)
  assert.match(editor, /className="cms-form cms-site-media-editor cms-project-editor"/)
  assert.match(editor, /service && !primaryPending\.length && !primary\[0\]/)
  assert.doesNotMatch(editor, /siteMediaFallbacks|restoreFallbacks|ใช้ภาพสำรองจากระบบ|Use public fallbacks/)
  assert.equal((editor.match(/allowZoom=\{false\}/g) || []).length, 2)
  assert.equal((editor.match(/requireRemoveConfirmation/g) || []).length, 2)
  assert.match(editor, /fitImagePreview=\{highResolution\}/)
  assert.match(editor, /previewRatio=\{service \? '16-9' : undefined\}/)
  assert.match(editor, /previewRatio=\{service \? '4-3' : undefined\}/)
  assert.match(editor, /ใช้ภาพแนวนอนอัตราส่วน 16:9/)
  assert.match(editor, /Use 4:3 landscape images/)
  assert.match(selector, /allowZoom\s*\? <button className="cms-media-preview-button"/)
  assert.match(selector, /className="cms-confirm-dialog cms-native-confirm cms-image-remove-dialog"/)
  assert.match(selector, /The public website changes only after you save\./)
  assert.match(editorStyles, /\.cms-project-images-fit \.cms-media-preview-static img[\s\S]*?aspect-ratio: auto;[\s\S]*?object-fit: contain;/)
  assert.match(editorStyles, /\.cms-project-images-ratio-16-9 \.cms-media-preview-button img,[\s\S]*?aspect-ratio: 16 \/ 9;/)
  assert.match(editorStyles, /\.cms-project-images-ratio-4-3 \.cms-media-preview-button img,[\s\S]*?aspect-ratio: 4 \/ 3;/)
  assert.match(overview, /<a aria-labelledby=\{`cms-site-media-title-\$\{item\.section\}`\} className="cms-site-media-card" href=\{`\/cms\/media\/\$\{item\.section\}`\}/)
  assert.match(overview, /<h3 id=\{`cms-site-media-title-\$\{item\.section\}`\}>/)
  assert.doesNotMatch(overview, /cms-button-secondary|<article className="cms-site-media-card"|Open editor|เปิดตัวแก้ไข|ExternalLink/)
  assert.doesNotMatch(cmsStyles, /\.cms-site-media-card \.cms-button-secondary/)
  assert.ok(editor.indexOf("fetch('/api/cms/media/upload'") < editor.indexOf("fetch('/api/cms/media'"))
  assert.match(editor, /data\.append\('file', image\.file\)/)
  assert.match(editor, /const submissionId = crypto\.randomUUID\(\)/)
  assert.match(uploadRoute, /siteMediaUploadTarget\(section\)/)
  assert.match(uploadRoute, /asset\.height <= asset\.width/)
  assert.match(saveRoute, /commitStagedProjectMedia\(staged, session\)[\s\S]*?saveCmsSiteMediaSection/)
  assert.match(saveRoute, /session\.withTransaction/)
  assert.match(saveRoute, /currentImages\.length === images\.length[\s\S]*?currentImages\.every\(\(src, index\) => src === images\[index\]\)/)
  assert.doesNotMatch(saveRoute, /staged\.length && staged\.every\(\(\{ asset \}\) => currentUrls\.has\(asset\.src\)\)/)
  assert.match(uploadRoute, /const removed = await deleteCmsImages\(\[asset\.publicId\]\)[\s\S]*?removed\.includes\(asset\.publicId\)[\s\S]*?registerStagedProjectMedia\(asset, submissionId, user\.userId, target\)/)
  assert.match(stagedMedia, /collection\.insertOne\(document\)[\s\S]*?collection\.findOne\(\{ 'asset\.publicId': asset\.publicId \}\)/)
  assert.match(editor, /catch \(caught\)[\s\S]*?setError\(caught instanceof Error \? caught\.message/)
  assert.doesNotMatch(editor, /if \(!error\)/)
  assert.match(review, /'cmsSiteMedia'/)
  assert.match(review, /'cmsTeamDirectory'/)
  assert.ok(compression.indexOf('createImageBitmap') < compression.indexOf("profile === 'high-resolution' && file.size <= sizeTarget && sourceFitsDimensions"))
  assert.ok(selector.indexOf('requestAnimationFrame') < selector.indexOf('prepareCmsImage(file'))
  assert.ok(selector.indexOf('setPreparationProgress(100)') < selector.indexOf('setPreparing(false)'))
  assert.equal(siteMediaUploadTarget('about-hero'), 'site-about-hero')
})

test('migration covers every fallback without deleting public source files', () => {
  const migration = readFileSync(path.join(root, 'scripts/migrate-site-media-to-cloudinary.mjs'), 'utf8')
  const safeguards = readFileSync(path.join(root, 'scripts/lib/site-media-migration.mjs'), 'utf8')
  assert.match(migration, /parseMigrationArguments\(process\.argv\.slice\(2\)\)/)
  assert.match(migration, /'cmsTeamDirectory'/)
  assert.match(migration, /assertApplyConfirmations\(options, configuration\)/)
  assert.match(migration, /verifyBackupMatches\(options\.backup/)
  assert.match(migration, /acquireMigrationLock\(database\)/)
  assert.match(migration, /classifySections\(/)
  assert.match(migration, /rollbackUnreferenced\(database/)
  assert.match(migration, /validateManagedDocument\(/)
  assert.match(migration, /Redeploy the website after migration/)
  assert.match(safeguards, /contentSha256/)
  assert.match(safeguards, /assertDeletionConfirmed/)
  assert.doesNotMatch(migration, /unlink|rmSync|delete.*fallback/i)
  assert.deepEqual(Object.keys(siteMediaFallbacks), [...siteMediaSectionKeys])
  for (const images of Object.values(siteMediaFallbacks)) {
    for (const image of images) {
      assert.ok(existsSync(path.join(root, 'public', image.slice(1))), image)
    }
  }
})
