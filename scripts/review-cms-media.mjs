import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { MongoClient } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'

const retentionDays = 30
const referenceCollections = [
  'cmsProjects', 'cmsProjectRevisions', 'cmsRecoveryArchives', 'cmsServices',
  'cmsLearning', 'cmsStagedProjectMedia', 'cmsProjectOperations',
]

/** Conservative matching also recognizes versioned and transformed delivery URLs. */
export function createMediaReferenceMatcher(assets, cloudName) {
  const byId = new Set(assets.map((asset) => asset.publicId))
  const byUrl = new Map(assets.flatMap((asset) => [asset.url, asset.secureUrl].filter(Boolean).map((url) => [url.split(/[?#]/)[0], asset.publicId])))
  let found = new Set()
  function inspect(text) {
    if (byId.has(text)) found.add(text)
    const exact = byUrl.get(text.split(/[?#]/)[0])
    if (exact) found.add(exact)
    try {
      const url = new URL(text)
      if (url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/`)) return
      const deliveryPath = decodeURIComponent(url.pathname).split('/upload/')[1]
      if (!deliveryPath) return
      const segments = deliveryPath.split('/')
      for (let index = 0; index < segments.length; index++) {
        const suffix = segments.slice(index).join('/')
        for (const candidate of [suffix, suffix.replace(/\.[^/.]+$/, '')]) {
          if (byId.has(candidate)) found.add(candidate)
        }
      }
    } catch { /* Ordinary content text is not a URL. */ }
  }
  function visit(item) {
    if (typeof item === 'string') { inspect(item); return }
    if (!item || typeof item !== 'object' || item instanceof Date || item._bsontype || Buffer.isBuffer(item)) return
    if (Array.isArray(item)) { for (const value of item) visit(value); return }
    for (const [key, value] of Object.entries(item)) { inspect(key); visit(value) }
  }
  return (value) => {
    found = new Set()
    visit(value)
    return found
  }
}

export function classifyMedia(assets, references, previousAssets = [], now = new Date()) {
  const prior = new Map(previousAssets.map((asset) => [asset.publicId, asset]))
  const cutoff = now.getTime() - retentionDays * 86400000
  return assets.map((asset) => {
    const usedBy = [...(references.get(asset.publicId) || [])]
    const previous = prior.get(asset.publicId)
    const unreferencedSince = usedBy.length ? null : previous?.unreferencedSince || now.toISOString()
    const retentionSatisfied = unreferencedSince && new Date(unreferencedSince).getTime() <= cutoff
    return {
      ...asset, usedBy, unreferencedSince,
      status: usedBy.length ? 'referenced' : retentionSatisfied ? 'manual-review-candidate' : 'retention-pending',
    }
  })
}

async function inventory(rootFolder) {
  const assets = []
  for (const resourceType of ['image', 'video', 'raw']) {
    let nextCursor
    do {
      const page = await cloudinary.api.resources({ resource_type: resourceType, type: 'upload', prefix: rootFolder, max_results: 500, next_cursor: nextCursor })
      for (const row of page.resources || []) {
        if (row.public_id !== rootFolder && !row.public_id.startsWith(`${rootFolder}/`)) continue
        assets.push({ publicId: row.public_id, resourceType, bytes: row.bytes, createdAt: row.created_at, secureUrl: row.secure_url, url: row.url })
      }
      nextCursor = page.next_cursor
    } while (nextCursor)
  }
  return assets
}

async function previousReport(reportDirectory, databaseName, cloudName, rootFolder) {
  const files = await readdir(reportDirectory).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const filename of files.filter((name) => /^media-review-.*\.json$/.test(name)).sort().reverse()) {
    const report = JSON.parse(await readFile(path.join(reportDirectory, filename), 'utf8'))
    if (report.databaseName === databaseName && report.cloudName === cloudName && report.rootFolder === rootFolder) return report
  }
  return null
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/review-cms-media.mjs [--report]\nRead-only MongoDB/Cloudinary inventory. --report saves an ignored report under .cms-backups/media-reviews/. No provider or database content is changed.\nRun again after at least 30 days to identify retained, still-unreferenced candidates for manual review.')
    return
  }
  if (process.argv.slice(2).some((arg) => arg !== '--report')) throw new Error('Only --report and --help are supported. This tool cannot delete media.')
  try { process.loadEnvFile('.env.local') } catch { /* Host environment may supply configuration. */ }
  for (const key of ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (!process.env[key]?.trim()) throw new Error(`Missing ${key}.`)
  }
  const databaseName = process.env.MONGODB_DB?.trim() || 'siamgroundwater'
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim()
  const rootFolder = (process.env.CLOUDINARY_ROOT_FOLDER || 'siamgroundwater/cms').trim().replace(/^\/+|\/+$/g, '')
  if (!rootFolder || rootFolder.includes('..')) throw new Error('Configure a nonempty CMS media root folder.')
  cloudinary.config({ cloud_name: cloudName, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
  const reportDirectory = path.resolve('.cms-backups', 'media-reviews')
  const client = new MongoClient(process.env.MONGODB_URI, { appName: 'sgw-read-only-media-review', serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    const database = client.db(databaseName)
    const available = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name))
    const assets = await inventory(rootFolder)
    const referencedAssetIds = createMediaReferenceMatcher(assets, cloudName)
    const references = new Map()
    const scannedCollections = []
    for (const name of referenceCollections.filter((name) => available.has(name))) {
      scannedCollections.push(name)
      for await (const document of database.collection(name).find({})) {
        for (const publicId of referencedAssetIds(document)) {
          if (!references.has(publicId)) references.set(publicId, new Set())
          references.get(publicId).add(`${name}:${document._id}`)
        }
      }
    }
    const previous = await previousReport(reportDirectory, databaseName, cloudName, rootFolder)
    const classified = classifyMedia(assets, references, previous?.assets)
    const counts = {
      total: assets.length,
      referenced: classified.filter((asset) => asset.status === 'referenced').length,
      retentionPending: classified.filter((asset) => asset.status === 'retention-pending').length,
      manualReviewCandidates: classified.filter((asset) => asset.status === 'manual-review-candidate').length,
    }
    const report = {
      format: 'sgw-read-only-media-review-v1', createdAt: new Date().toISOString(),
      databaseName, cloudName, rootFolder, retentionDays, scannedCollections, counts, assets: classified,
      safeguards: [
        'No database records or Cloudinary assets were modified by this tool.',
        'Unreferenced time is based on saved observations; reports are not proof of continuous disuse.',
        'Candidates still require review of public source/config references, active edits, trash, historical content, and other environments sharing this Cloudinary folder.',
        'Verify an independent restorable database and original-media backup before any separately authorized deletion.',
        'Run a fresh review immediately before any manual decision. This tool provides no delete action.',
      ],
    }
    console.log(JSON.stringify({ databaseName, rootFolder, scannedCollections, ...counts, retentionDays, observationBaseline: previous?.createdAt || null }, null, 2))
    if (process.argv.includes('--report')) {
      await mkdir(reportDirectory, { recursive: true })
      const filename = path.join(reportDirectory, `media-review-${report.createdAt.replace(/[:.]/g, '-')}.json`)
      await writeFile(filename, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
      console.log(`Ignored review report saved: ${filename}`)
    }
    console.log('Candidate status permits manual review only. Confirm recoverable backups and references in every shared environment before any separate deletion decision.')
  } finally {
    await client.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    // Configuration values and provider exception payloads may contain sensitive information.
    console.error(error instanceof Error && /^(Missing |Only |Configure )/.test(error.message) ? error.message : 'Media review failed. Check database/provider access and existing report validity; no media was deleted.')
    process.exitCode = 1
  })
}
