import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'
import { MongoClient } from 'mongodb'

function loadEnvFile(filePath) {
  const values = {}
  try {
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

function safeDecode(value) {
  let current = value
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) break
      current = decoded
    } catch {
      break
    }
  }
  return current
}

function normalizeSlug(value) {
  return safeDecode(String(value || ''))
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[/?#\\\u0000-\u001f]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function categoryFromType(type) {
  if (type === 'agriculture') return 'agriculture'
  if (type === 'factory') return 'factory'
  if (type === 'government') return 'government'
  if (type === 'resort' || type === 'island, resort') return 'resort'
  if (type === 'train' || type === 'infrastructure' || type === 'dewatering') return 'dewatering'
  return 'other'
}

const workTypeKeys = new Map([
  ['งานสำรวจน้ำบาดาล', 'groundwater-survey'],
  ['งานเจาะบ่อน้ำบาดาล', 'groundwater-well-drilling'],
  ['งานแก้ไขโครงการที่เจาะน้ำบาดาลแล้วมีปัญหา', 'groundwater-project-remediation'],
  ['งานซ่อมบำรุงรักษาบ่อน้ำบาดาล', 'groundwater-well-maintenance'],
  ['งานเจาะบ่อน้ำแร่คุณภาพดี', 'mineral-water'],
  ['งานสำรวจศึกษาน้ำแร่', 'mineral-water'],
  ['งานขุดเจาะก่อสร้างบ่อสูบลดระดับน้ำ', 'other'],
  ['งานแก้ไขปริมาณการใช้น้ำบาดาล', 'other'],
])

function normalizeImportedWorkTypes(value, projectType) {
  if (!Array.isArray(value)) return []
  const normalized = [...new Set(value.map((item) => workTypeKeys.get(item) || item).filter(Boolean))]
  if (projectType === 'island, resort' && !normalized.includes('island-work')) normalized.push('island-work')
  return normalized
}

function publicIdFor(rootFolder, project, localPath) {
  const parsed = path.posix.parse(localPath)
  const base = parsed.name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55) || 'image'
  const hash = createHash('sha1').update(localPath).digest('hex').slice(0, 12)
  return `${rootFolder}/projects/imported/${project.legacyPostId}/${base}-${hash}`
}

async function listExistingCloudinaryAssets(prefix) {
  const assets = new Map()
  let nextCursor
  do {
    const result = await cloudinary.api.resources({
      max_results: 500,
      next_cursor: nextCursor,
      prefix,
      resource_type: 'image',
      type: 'upload',
    })
    for (const resource of result.resources || []) assets.set(resource.public_id, resource.secure_url)
    nextCursor = result.next_cursor
  } while (nextCursor)
  return assets
}

async function deleteUploadedAssets(publicIds) {
  if (!publicIds.length) return
  for (let index = 0; index < publicIds.length; index += 100) {
    await cloudinary.api.delete_resources(publicIds.slice(index, index + 100), {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    })
  }
}

function sourceDocument(project, mediaByLocalPath, now) {
  const localGallery = Array.isArray(project.localGalleryImages) ? project.localGalleryImages : []
  return {
    category: [categoryFromType(project.projectType)],
    coverImage: mediaByLocalPath.get(project.localCoverImage) || project.coverImage || '',
    details: Array.isArray(project.details) ? project.details : [],
    galleryImages: localGallery.length
      ? localGallery.map((localPath) => mediaByLocalPath.get(localPath)).filter(Boolean)
      : Array.isArray(project.galleryImages) ? project.galleryImages.filter((value) => typeof value === 'string' && !value.toLowerCase().endsWith('.mp4')) : [],
    lat: Number.isFinite(project.lat) ? project.lat : null,
    lng: Number.isFinite(project.lng) ? project.lng : null,
    location: project.location || '',
    slug: normalizeSlug(project.slug),
    source: 'public-snapshot',
    status: 'active',
    summary: project.summary || '',
    title: project.title || '',
    updatedAt: now,
    workTypes: normalizeImportedWorkTypes(project.workTypes, project.projectType),
    year: Number.isInteger(project.year) ? project.year : null,
  }
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const apply = process.argv.includes('--apply')
const limitArg = process.argv.find((value) => value.startsWith('--limit='))
const sourceArg = process.argv.find((value) => value.startsWith('--source='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
if (!Number.isFinite(limit) && limit !== Infinity || limit <= 0) throw new Error('--limit must be a positive number.')

for (const key of ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  if (!env[key]) throw new Error(`Missing ${key}. Add it to .env.local first.`)
}

const dbName = env.MONGODB_DB || 'siamgroundwater'
const rootFolder = (env.CLOUDINARY_ROOT_FOLDER || 'siamgroundwater/cms').replace(/^\/+|\/+$/g, '')
const workspaceSource = path.resolve('src/data/wordpress-projects-recovered.json')
const backupRoot = path.resolve('..', '00-Files', 'siamgroundwater', 'backup')
const sourceFile = sourceArg
  ? path.resolve(sourceArg.split('=').slice(1).join('='))
  : existsSync(workspaceSource)
    ? workspaceSource
    : path.join(backupRoot, 'src', 'data', 'wordpress-projects-recovered.json')
const sourcePublicRoot = path.resolve(path.dirname(sourceFile), '..', '..', 'public')
if (!existsSync(sourceFile)) throw new Error(`Project migration source not found: ${sourceFile}`)
const projects = JSON.parse(readFileSync(sourceFile, 'utf8')).slice(0, limit)
const localPaths = Array.from(new Set(projects.flatMap((project) => [
  project.localCoverImage,
  ...(Array.isArray(project.localGalleryImages) ? project.localGalleryImages : []),
]).filter((value) => typeof value === 'string' && value.startsWith('/'))))
const missing = localPaths.filter((localPath) => !existsSync(path.join(sourcePublicRoot, ...localPath.split('/').filter(Boolean))))
if (missing.length) throw new Error(`Preflight failed: ${missing.length} local project images are missing. First missing path: ${missing[0]}`)

cloudinary.config({
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  secure: true,
})

const client = new MongoClient(env.MONGODB_URI, {
  appName: 'siamgroundwater-project-media-migration',
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10_000,
})
await client.connect()

try {
  await Promise.all([
    client.db(dbName).command({ ping: 1 }),
    cloudinary.api.ping(),
  ])
  const collection = client.db(dbName).collection('cmsProjects')
  const existingRows = await collection.find(
    { deletedAt: { $exists: false } },
    { projection: { coverImage: 1, galleryImages: 1, slug: 1, source: 1 } }
  ).toArray()
  const existingCloudinary = await listExistingCloudinaryAssets(`${rootFolder}/projects/imported/`)
  const sourceCounts = existingRows.reduce((counts, row) => {
    const source = row.source || 'unknown'
    counts[source] = (counts[source] || 0) + 1
    return counts
  }, {})
  const recordsWithLocalMedia = existingRows.filter((row) =>
    row.coverImage?.startsWith('/') || row.galleryImages?.some((image) => image.startsWith('/'))
  ).length
  const plannedIds = new Set(localPaths.map((localPath) => {
    const project = projects.find((candidate) => candidate.localCoverImage === localPath || candidate.localGalleryImages?.includes(localPath))
    return publicIdFor(rootFolder, project, localPath)
  }))
  const missingUploads = Array.from(plannedIds).filter((publicId) => !existingCloudinary.has(publicId)).length

  console.log(`Preflight OK: MongoDB database "${dbName}" and Cloudinary are reachable.`)
  console.log(`Projects selected: ${projects.length}; local images: ${localPaths.length}; existing MongoDB projects: ${existingRows.length}.`)
  console.log(`Migration source: ${sourceFile}.`)
  console.log(`MongoDB sources: ${JSON.stringify(sourceCounts)}; records still using local media: ${recordsWithLocalMedia}.`)
  console.log(`Cloudinary assets reusable: ${plannedIds.size - missingUploads}; images to upload: ${missingUploads}.`)
  if (!apply) {
    console.log('Dry run complete. Run with --apply to upload images and upsert project data.')
    process.exitCode = 0
  } else {
    const bySlug = new Map(existingRows.map((row) => [normalizeSlug(row.slug), row]))
    const counters = { inserted: 0, preservedCms: 0, reused: 0, updated: 0, uploaded: 0 }

    for (let projectIndex = 0; projectIndex < projects.length; projectIndex += 1) {
      const project = projects[projectIndex]
      const projectPaths = Array.from(new Set([
        project.localCoverImage,
        ...(Array.isArray(project.localGalleryImages) ? project.localGalleryImages : []),
      ].filter(Boolean)))
      const uploadedNow = []
      const mediaByLocalPath = new Map()
      try {
        for (const localPath of projectPaths) {
          const publicId = publicIdFor(rootFolder, project, localPath)
          let secureUrl = existingCloudinary.get(publicId)
          if (!secureUrl) {
            const filePath = path.join(sourcePublicRoot, ...localPath.split('/').filter(Boolean))
            const result = await cloudinary.uploader.upload(filePath, {
              overwrite: false,
              public_id: publicId,
              resource_type: 'image',
              tags: ['sgw', 'cms', 'projects', 'migration'],
              unique_filename: false,
              use_filename: false,
            })
            secureUrl = result.secure_url
            existingCloudinary.set(publicId, secureUrl)
            uploadedNow.push(publicId)
            counters.uploaded += 1
          } else {
            counters.reused += 1
          }
          mediaByLocalPath.set(localPath, secureUrl)
        }

        const now = new Date()
        const document = sourceDocument(project, mediaByLocalPath, now)
        const previous = bySlug.get(document.slug)
        if (previous?.source === 'cms') {
          const replacements = new Map(projectPaths.map((localPath) => [localPath, mediaByLocalPath.get(localPath)]))
          const coverImage = replacements.get(previous.coverImage) || previous.coverImage
          const galleryImages = (previous.galleryImages || []).map((image) => replacements.get(image) || image)
          await collection.updateOne(
            { _id: previous._id },
            { $set: { coverImage, galleryImages, updatedAt: now } }
          )
          counters.preservedCms += 1
        } else if (previous?._id) {
          await collection.updateOne({ _id: previous._id }, { $set: document })
          counters.updated += 1
        } else {
          const result = await collection.insertOne({ ...document, createdAt: now })
          bySlug.set(document.slug, { ...document, _id: result.insertedId })
          counters.inserted += 1
        }
        console.log(`[${projectIndex + 1}/${projects.length}] Saved ${document.slug} (${projectPaths.length} images).`)
      } catch (error) {
        try {
          await deleteUploadedAssets(uploadedNow)
          for (const publicId of uploadedNow) existingCloudinary.delete(publicId)
        } catch (rollbackError) {
          console.error(`Rollback failed for project ${project.slug}.`, rollbackError)
        }
        throw error
      }
    }

    console.log(`Migration complete: ${counters.uploaded} uploaded, ${counters.reused} reused, ${counters.inserted} inserted, ${counters.updated} updated, ${counters.preservedCms} CMS-edited records preserved.`)
  }
} finally {
  await client.close()
}
