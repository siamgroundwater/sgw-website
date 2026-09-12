import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BSON, MongoClient, ObjectId } from 'mongodb'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Environment variables may already be supplied by the host.
}

const mode = process.argv[2]
const args = new Map(
  process.argv.slice(3).flatMap((argument) => {
    const separator = argument.indexOf('=')
    return separator > 2 && argument.startsWith('--')
      ? [[argument.slice(2, separator), argument.slice(separator + 1)]]
      : []
  })
)
const databaseName = process.env.MONGODB_DB?.trim() || 'siamgroundwater'
const mongoUri = process.env.MONGODB_URI?.trim()
const projectCollectionName = 'cmsProjects'
const revisionCollectionName = 'cmsProjectRevisions'
const auditCollectionName = 'cmsAuditLogs'
const migrationActor = {
  displayName: 'Codex multilingual project migration',
  role: 'admin',
  userId: 'system:project-translation-migration',
  username: 'system',
}
const requiredLocales = ['en', 'zh', 'ja']
const thaiPattern = /[\u0E00-\u0E7F]/u

if (!mongoUri) throw new Error('Missing MONGODB_URI. Load the intended environment file first.')
if (!['backup', 'export-source', 'validate', 'apply', 'verify'].includes(mode)) {
  throw new Error('Use backup, export-source, validate, apply, or verify.')
}

function requiredArgument(name) {
  const value = args.get(name)?.trim()
  if (!value) throw new Error(`Missing --${name}=...`)
  return path.resolve(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanDetails(value) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => typeof item === 'string' && item.trim() ? [item.trim()] : [])
}

function cleanTranslatedDetails(value, summary) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (item === '$summary') return [summary]
    return typeof item === 'string' && item.trim() ? [item.trim()] : []
  })
}

function sourceProject(document) {
  return {
    id: document._id.toString(),
    updatedAt: document.updatedAt.toISOString(),
    title: cleanText(document.title),
    location: cleanText(document.location),
    summary: cleanText(document.summary),
    details: cleanDetails(document.details),
  }
}

function sourceContent(document) {
  return {
    id: document._id?.toString?.() || cleanText(document.id),
    title: cleanText(document.title),
    location: cleanText(document.location),
    summary: cleanText(document.summary),
    details: cleanDetails(document.details),
  }
}

function sourceFingerprint(projects) {
  return sha256(JSON.stringify(projects.map(sourceProject).sort((a, b) => a.id.localeCompare(b.id))))
}

function publishedContent(document) {
  const content = {
    category: document.category,
    coverImage: document.coverImage,
    details: document.details,
    galleryImages: document.galleryImages,
    lat: document.lat,
    lng: document.lng,
    location: document.location,
    slug: document.slug,
    summary: document.summary,
    title: document.title,
    workTypes: document.workTypes,
    year: document.year,
  }
  if (document.translations) content.translations = document.translations
  return content
}

async function readTranslationProjects(inputPath) {
  const stats = await readdir(inputPath, { withFileTypes: true })
  const files = stats
    .filter((entry) => (
      entry.isFile() &&
      entry.name.toLowerCase().startsWith('batch-') &&
      entry.name.toLowerCase().endsWith('.json')
    ))
    .map((entry) => entry.name)
    .sort()
  if (!files.length) throw new Error(`No translation JSON files found in ${inputPath}`)

  const projects = []
  for (const file of files) {
    const parsed = JSON.parse(await readFile(path.join(inputPath, file), 'utf8'))
    if (parsed.format !== 'sgw-project-translations-batch-v1' || !Array.isArray(parsed.projects)) {
      throw new Error(`Invalid translation batch: ${file}`)
    }
    projects.push(...parsed.projects)
  }
  return { files, projects }
}

function validateTranslationManifest(
  manifestProjects,
  currentProjects,
  { requireAllProjects = true, requireSourceTimestamp = true } = {}
) {
  const errors = []
  const prepared = []
  const currentById = new Map(currentProjects.map((project) => [project._id.toString(), project]))
  const seen = new Set()

  for (const entry of manifestProjects) {
    const id = cleanText(entry?.id)
    if (!ObjectId.isValid(id)) {
      errors.push(`Invalid project id: ${id || '(missing)'}`)
      continue
    }
    if (seen.has(id)) {
      errors.push(`Duplicate project id: ${id}`)
      continue
    }
    seen.add(id)
    const current = currentById.get(id)
    if (!current) {
      errors.push(`Project is missing from MongoDB: ${id}`)
      continue
    }
    if (requireSourceTimestamp && cleanText(entry.sourceUpdatedAt) !== current.updatedAt.toISOString()) {
      errors.push(`Project changed after export: ${id}`)
    }

    const translations = {}
    for (const locale of requiredLocales) {
      const input = entry.translations?.[locale]
      const translation = {
        title: cleanText(input?.title),
        location: cleanText(input?.location),
        summary: cleanText(input?.summary),
        details: cleanTranslatedDetails(input?.details, cleanText(input?.summary)),
      }
      for (const field of ['title', 'location', 'summary']) {
        if (!translation[field]) errors.push(`${id} ${locale}.${field} is empty`)
        if (thaiPattern.test(translation[field])) errors.push(`${id} ${locale}.${field} still contains Thai text`)
      }
      if (translation.title.length > 180) errors.push(`${id} ${locale}.title exceeds 180 characters`)
      if (translation.location.length > 300) errors.push(`${id} ${locale}.location exceeds 300 characters`)
      if (translation.summary.length > 12000) errors.push(`${id} ${locale}.summary exceeds 12000 characters`)
      const expectedDetailCount = cleanDetails(current.details).length
      if (translation.details.length !== expectedDetailCount) {
        errors.push(`${id} ${locale}.details has ${translation.details.length}; expected ${expectedDetailCount}`)
      }
      translation.details.forEach((detail, index) => {
        if (detail.length > 6000) errors.push(`${id} ${locale}.details[${index}] exceeds 6000 characters`)
        if (thaiPattern.test(detail)) errors.push(`${id} ${locale}.details[${index}] still contains Thai text`)
      })
      translations[locale] = translation
    }
    prepared.push({ current, id, translations })
  }

  if (requireAllProjects) {
    for (const id of currentById.keys()) {
      if (!seen.has(id)) errors.push(`Translation manifest is missing project: ${id}`)
    }
    if (seen.size !== currentById.size) {
      errors.push(`Translation manifest has ${seen.size} unique projects; expected ${currentById.size}`)
    }
  }
  return { errors, prepared }
}

async function readAndVerifyBackup(backupPath) {
  const envelope = JSON.parse(await readFile(backupPath, 'utf8'))
  if (envelope.format !== 'sgw-project-translation-backup-envelope-v1') {
    throw new Error('Unrecognized backup format.')
  }
  if (sha256(envelope.payload) !== envelope.sha256) {
    throw new Error('Backup checksum verification failed.')
  }
  const payload = BSON.EJSON.parse(envelope.payload)
  if (payload.database !== databaseName) {
    throw new Error(`Backup database ${payload.database} does not match ${databaseName}.`)
  }
  return payload
}

const client = new MongoClient(mongoUri, {
  appName: `siamgroundwater-project-translation-${mode}`,
  serverSelectionTimeoutMS: 10000,
})

try {
  await client.connect()
  const database = client.db(databaseName)
  const projectsCollection = database.collection(projectCollectionName)
  const revisionsCollection = database.collection(revisionCollectionName)
  const auditCollection = database.collection(auditCollectionName)
  const currentProjects = await projectsCollection
    .find({ deletedAt: { $exists: false } })
    .sort({ _id: 1 })
    .toArray()

  if (mode === 'backup') {
    const outputPath = requiredArgument('output')
    const [allProjects, allRevisions] = await Promise.all([
      projectsCollection.find({}).sort({ _id: 1 }).toArray(),
      revisionsCollection.find({}).sort({ projectId: 1, version: 1 }).toArray(),
    ])
    const payload = BSON.EJSON.stringify({
      format: 'sgw-project-translation-backup-v1',
      createdAt: new Date(),
      database: databaseName,
      collections: {
        [projectCollectionName]: allProjects,
        [revisionCollectionName]: allRevisions,
      },
    }, { relaxed: false })
    const envelope = {
      format: 'sgw-project-translation-backup-envelope-v1',
      sha256: sha256(payload),
      payload,
    }
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(envelope)}\n`, { encoding: 'utf8', flag: 'wx' })
    const verified = await readAndVerifyBackup(outputPath)
    console.log(JSON.stringify({
      backup: outputPath,
      checksum: envelope.sha256,
      database: verified.database,
      projects: verified.collections[projectCollectionName].length,
      revisions: verified.collections[revisionCollectionName].length,
      verified: true,
    }, null, 2))
  }

  if (mode === 'export-source') {
    const outputPath = requiredArgument('output')
    const source = {
      format: 'sgw-project-translation-source-v1',
      createdAt: new Date().toISOString(),
      database: databaseName,
      fingerprint: sourceFingerprint(currentProjects),
      projects: currentProjects.map(sourceProject),
    }
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({
      database: databaseName,
      fingerprint: source.fingerprint,
      output: outputPath,
      projects: source.projects.length,
      detailSections: source.projects.reduce((count, project) => count + project.details.length, 0),
    }, null, 2))
  }

  if (['validate', 'apply', 'verify'].includes(mode)) {
    const translationPath = requiredArgument('translations')
    const manifest = await readTranslationProjects(translationPath)
    const partialValidation = mode === 'validate' && args.get('partial') === 'true'
    const validation = validateTranslationManifest(manifest.projects, currentProjects, {
      requireAllProjects: !partialValidation,
      requireSourceTimestamp: mode !== 'verify',
    })
    if (validation.errors.length) {
      console.error(JSON.stringify({ errors: validation.errors, files: manifest.files }, null, 2))
      process.exitCode = 1
    } else if (mode === 'validate') {
      console.log(JSON.stringify({
        database: databaseName,
        files: manifest.files,
        projects: validation.prepared.length,
        translations: validation.prepared.length * requiredLocales.length,
        valid: true,
      }, null, 2))
    } else if (mode === 'verify') {
      let matchingProjects = 0
      for (const { current, translations } of validation.prepared) {
        if (JSON.stringify(current.translations) === JSON.stringify(translations)) matchingProjects += 1
      }
      if (matchingProjects !== validation.prepared.length) {
        throw new Error(`${matchingProjects} of ${validation.prepared.length} projects match the translation manifest.`)
      }
      let sourceVerified = false
      const sourcePathArgument = args.get('source')?.trim()
      if (sourcePathArgument) {
        const sourcePath = path.resolve(sourcePathArgument)
        const source = JSON.parse(await readFile(sourcePath, 'utf8'))
        if (source.format !== 'sgw-project-translation-source-v1' || !Array.isArray(source.projects)) {
          throw new Error('Unrecognized project translation source format.')
        }
        const expectedSource = source.projects.map(sourceContent).sort((a, b) => a.id.localeCompare(b.id))
        const persistedSource = currentProjects.map(sourceContent).sort((a, b) => a.id.localeCompare(b.id))
        if (JSON.stringify(expectedSource) !== JSON.stringify(persistedSource)) {
          throw new Error('Thai source content changed during the translation migration.')
        }
        sourceVerified = true
      }

      const expectedRevisions = validation.prepared.map(({ current }) => ({
        projectId: current._id,
        version: Math.max(1, (current.publishedVersion || 1) - 1),
      }))
      const revisionChecks = await Promise.all(expectedRevisions.map(({ projectId, version }) => (
        revisionsCollection.countDocuments({ projectId, version }, { limit: 1 })
      )))
      const revisionSnapshots = revisionChecks.filter(Boolean).length
      const auditEntries = await auditCollection.countDocuments({
        'metadata.migration': 'project-translations-v1',
        'entity.id': { $in: validation.prepared.map(({ id }) => id) },
      })
      if (revisionSnapshots !== validation.prepared.length) {
        throw new Error(`${revisionSnapshots} of ${validation.prepared.length} projects have a pre-migration revision.`)
      }
      if (auditEntries < validation.prepared.length) {
        throw new Error(`${auditEntries} of ${validation.prepared.length} projects have a migration audit entry.`)
      }

      console.log(JSON.stringify({
        auditEntries,
        database: databaseName,
        projects: matchingProjects,
        revisionSnapshots,
        sourceVerified,
        translations: matchingProjects * requiredLocales.length,
        verified: true,
      }, null, 2))
    } else {
      const confirmation = args.get('confirm')?.trim()
      if (confirmation !== databaseName) {
        throw new Error(`Apply requires --confirm=${databaseName}`)
      }
      const backupPath = requiredArgument('backup')
      const backup = await readAndVerifyBackup(backupPath)
      const backupProjects = backup.collections[projectCollectionName]
      if (sourceFingerprint(backupProjects.filter((project) => !project.deletedAt)) !== sourceFingerprint(currentProjects)) {
        throw new Error('Verified backup does not match the current project source state.')
      }

      const session = client.startSession()
      const now = new Date()
      try {
        await session.withTransaction(async () => {
          for (const { current, translations } of validation.prepared) {
            const version = current.publishedVersion || 1
            await revisionsCollection.updateOne(
              { projectId: current._id, version },
              {
                $setOnInsert: {
                  content: publishedContent(current),
                  projectId: current._id,
                  publishedAt: current.publishedAt || current.updatedAt,
                  publishedBy: current.publishedBy || 'Imported project snapshot',
                  version,
                },
              },
              { session, upsert: true }
            )
            const nextVersion = current.status === 'active'
              ? version + 1
              : Math.max(1, version)
            const result = await projectsCollection.updateOne(
              { _id: current._id, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
              {
                $set: {
                  translations,
                  publishedAt: now,
                  publishedBy: migrationActor.displayName,
                  publishedVersion: nextVersion,
                  source: 'cms',
                  status: 'active',
                  updatedAt: now,
                },
                $unset: { draft: '' },
              },
              { session }
            )
            if (result.matchedCount !== 1) {
              throw new Error(`Concurrent project update detected: ${current._id}`)
            }
            await auditCollection.insertOne({
              action: 'content.publish',
              actor: migrationActor,
              createdAt: now,
              entity: { id: current._id.toString(), label: current.title, type: 'project' },
              expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
              metadata: { locales: 'en,zh,ja', migration: 'project-translations-v1' },
              summary: `Published English, Chinese, and Japanese translations for ${current.title}`,
            }, { session })
          }
        })
      } finally {
        await session.endSession()
      }
      console.log(JSON.stringify({
        applied: true,
        backup: backupPath,
        database: databaseName,
        projects: validation.prepared.length,
        translations: validation.prepared.length * requiredLocales.length,
      }, null, 2))
    }
  }
} finally {
  await client.close()
}
