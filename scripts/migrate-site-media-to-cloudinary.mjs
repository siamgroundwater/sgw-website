import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v2 as cloudinary } from 'cloudinary'
import { BSON, MongoClient } from 'mongodb'
import { readBackup } from './cms-backup.mjs'
import {
  assertApplyConfirmations,
  assertDeletionConfirmed,
  buildSourcePlans,
  classifySections,
  documentMatchesImages,
  findReferencedPublicIds,
  migrationLockId,
  normalizeRootFolder,
  parseMigrationArguments,
  validateManagedDocument,
  validateReusablePlan,
} from './lib/site-media-migration.mjs'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(path.join(workspaceRoot, '.env.local'))
} catch {
  // Deployment environments may provide values directly.
}

const options = parseMigrationArguments(process.argv.slice(2))
for (const key of ['MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  if (!process.env[key]?.trim()) throw new Error(`Missing ${key}. Add it to .env.local first.`)
}

const explicitDatabaseName = process.env.MONGODB_DB?.trim() || ''
const databaseName = explicitDatabaseName || 'siamgroundwater'
const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim()
const rootFolder = normalizeRootFolder(
  process.env.CLOUDINARY_ROOT_FOLDER || 'siamgroundwater/cms'
)
const configuration = {
  cloudName,
  databaseName,
  databaseWasExplicit: Boolean(explicitDatabaseName),
  rootFolder,
}
assertApplyConfirmations(options, configuration)

const manifestPath = path.join(workspaceRoot, 'src', 'data', 'site-media-manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

function validateManifest(definitions) {
  if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) {
    throw new Error('The site-media manifest is invalid.')
  }
  for (const [section, definition] of Object.entries(definitions)) {
    if (
      !definition ||
      !Array.isArray(definition.fallbacks) ||
      !Number.isInteger(definition.minimum) ||
      !Number.isInteger(definition.maximum) ||
      definition.minimum < 1 ||
      definition.maximum < definition.minimum ||
      definition.fallbacks.length < definition.minimum ||
      definition.fallbacks.length > definition.maximum ||
      definition.fallbacks.some((source) => typeof source !== 'string' || !source.startsWith('/'))
    ) {
      throw new Error(`The site-media manifest entry ${section} is invalid.`)
    }
  }
}

validateManifest(manifest)
const publicRoot = path.join(workspaceRoot, 'public')
const localPaths = [...new Set(Object.values(manifest).flatMap(({ fallbacks }) => fallbacks))]
const fileContents = new Map()
for (const source of localPaths) {
  const absolutePath = path.resolve(publicRoot, ...source.split('/').filter(Boolean))
  const relativePath = path.relative(publicRoot, absolutePath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Fallback path escapes the public directory: ${source}`)
  }
  if (!existsSync(absolutePath)) throw new Error(`Missing public fallback image: ${source}`)
  fileContents.set(source, readFileSync(absolutePath))
}
const sourcePlans = buildSourcePlans(manifest, rootFolder, fileContents)

class UnknownMongoWriteResultError extends Error {}

function providerAssetFromResource(resource, knownMigrationSha256 = '') {
  return {
    asset: {
      bytes: resource.bytes,
      createdAt: resource.created_at,
      format: resource.format,
      height: resource.height,
      publicId: resource.public_id,
      src: resource.secure_url,
      width: resource.width,
    },
    migrationSha256:
      resource.context?.custom?.migration_sha256 ||
      resource.context?.migration_sha256 ||
      knownMigrationSha256,
    publicId: resource.public_id,
    src: resource.secure_url,
  }
}

async function listExistingAssets(prefix) {
  const found = new Map()
  let nextCursor
  do {
    const page = await cloudinary.api.resources({
      context: true,
      max_results: 500,
      next_cursor: nextCursor,
      prefix,
      resource_type: 'image',
      type: 'upload',
    })
    for (const resource of page.resources || []) {
      if (
        resource.public_id === rootFolder ||
        resource.public_id.startsWith(`${rootFolder}/`)
      ) {
        found.set(resource.public_id, providerAssetFromResource(resource))
      }
    }
    nextCursor = page.next_cursor
  } while (nextCursor)
  return found
}

async function deleteUploaded(publicIds) {
  const uniqueIds = [...new Set(publicIds)]
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100)
    const result = await cloudinary.api.delete_resources(batch, {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    })
    assertDeletionConfirmed(batch, result)
  }
}

const referenceCollections = [
  'cmsProjects',
  'cmsProjectRevisions',
  'cmsRecoveryArchives',
  'cmsServices',
  'cmsLearning',
  'cmsStagedProjectMedia',
  'cmsProjectOperations',
  'cmsSiteMedia',
  'cmsTeamDirectory',
]

async function databaseReferences(database, candidates) {
  if (!candidates.length) return new Set()
  const available = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name)
  )
  const found = new Set()
  for (const name of referenceCollections) {
    if (!available.has(name)) continue
    for await (const document of database.collection(name).find({})) {
      for (const publicId of findReferencedPublicIds(document, candidates, cloudName)) {
        found.add(publicId)
      }
    }
  }
  return found
}

function orderedDocuments(documents) {
  return [...documents].sort((first, second) => String(first._id).localeCompare(String(second._id)))
}

function documentFingerprint(documents) {
  return BSON.EJSON.stringify(orderedDocuments(documents), { relaxed: false })
}

async function verifyBackupMatches(backupPath, database, currentDocuments) {
  const archive = await readBackup(backupPath)
  if (archive.sourceDatabase !== database.databaseName) {
    throw new Error(`Backup belongs to ${archive.sourceDatabase}, not ${database.databaseName}.`)
  }
  const backupDocuments =
    archive.collections.find(({ name }) => name === 'cmsSiteMedia')?.documents || []
  if (documentFingerprint(backupDocuments) !== documentFingerprint(currentDocuments)) {
    throw new Error('The verified backup does not match current cmsSiteMedia data. Create a fresh backup.')
  }
  return archive
}

const lockDurationMs = 15 * 60 * 1000

async function acquireMigrationLock(database) {
  const collection = database.collection('cmsMigrationLocks')
  const owner = randomUUID()
  const makeDocument = () => {
    const now = new Date()
    return {
      _id: migrationLockId,
      cloudName,
      createdAt: now,
      databaseName,
      expiresAt: new Date(now.getTime() + lockDurationMs),
      owner,
      rootFolder,
      updatedAt: now,
    }
  }

  try {
    await collection.insertOne(makeDocument())
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 11000) throw error
    const current = await collection.findOne({ _id: migrationLockId })
    if (!current || !(current.expiresAt instanceof Date) || current.expiresAt.getTime() >= Date.now()) {
      throw new Error('Another site-media migration holds the database lock. Wait for it to finish.')
    }
    const replacement = makeDocument()
    const result = await collection.replaceOne(
      { _id: migrationLockId, owner: current.owner, expiresAt: current.expiresAt },
      replacement
    )
    if (result.matchedCount !== 1) {
      throw new Error('Another site-media migration acquired the database lock.')
    }
  }

  return {
    async release() {
      await collection.deleteOne({ _id: migrationLockId, owner })
    },
    async renew() {
      const now = new Date()
      const result = await collection.updateOne(
        { _id: migrationLockId, owner },
        { $set: { expiresAt: new Date(now.getTime() + lockDurationMs), updatedAt: now } }
      )
      if (result.matchedCount !== 1) throw new Error('The site-media migration lock was lost.')
    },
  }
}

function plannedSourcesForSections(sections) {
  const sources = new Set(
    sections.flatMap((section) => manifest[section].fallbacks)
  )
  return [...sources].map((source) => sourcePlans.get(source))
}

async function readPreflightState(database) {
  const allDocuments = await database.collection('cmsSiteMedia').find({}).toArray()
  const documents = new Map(
    allDocuments
      .filter(({ _id }) => Object.hasOwn(manifest, _id))
      .map((document) => [document._id, document])
  )
  const providerAssets = await listExistingAssets(`${rootFolder}/`)
  const classification = classifySections(
    manifest,
    documents,
    configuration,
    providerAssets
  )
  const plannedSources = plannedSourcesForSections(classification.needsMigration)
  const planErrors = plannedSources.flatMap((plan) =>
    validateReusablePlan(plan, providerAssets.get(plan.publicId), configuration)
  )
  const plannedIds = new Set(plannedSources.map(({ publicId }) => publicId))
  const reusable = [...plannedIds].filter((publicId) => providerAssets.has(publicId)).length
  return {
    allDocuments,
    classification,
    documents,
    planErrors,
    plannedIds,
    plannedSources,
    providerAssets,
    reusable,
  }
}

function throwForBlockingState(state) {
  const errors = [
    ...state.classification.blocking.flatMap(({ errors, section }) =>
      errors.map((error) => `[${section}] ${error}`)
    ),
    ...state.planErrors,
  ]
  if (errors.length) {
    throw new Error(`Preflight blocked before writes:\n- ${errors.join('\n- ')}`)
  }
}

async function discoverAttemptedUploads(publicIds) {
  if (!publicIds.length) return []
  const providerAssets = await listExistingAssets(`${rootFolder}/`)
  const plansById = new Map([...sourcePlans.values()].map((plan) => [plan.publicId, plan]))
  return publicIds.flatMap((publicId) => {
    const provider = providerAssets.get(publicId)
    const plan = plansById.get(publicId)
    if (!provider || !plan || validateReusablePlan(plan, provider, configuration).length) return []
    return [provider]
  })
}

async function rollbackUnreferenced(database, candidates) {
  const unique = [...new Map(candidates.map((candidate) => [candidate.publicId, candidate])).values()]
  if (!unique.length) return { preserved: [], removed: [] }
  const referenced = await databaseReferences(database, unique)
  const preserved = unique.filter(({ publicId }) => referenced.has(publicId)).map(({ publicId }) => publicId)
  const removable = unique.filter(({ publicId }) => !referenced.has(publicId)).map(({ publicId }) => publicId)
  if (removable.length) await deleteUploaded(removable)
  return { preserved, removed: removable }
}

async function writeSection(collection, section, previous, images) {
  const now = new Date(
    Math.max(Date.now(), previous?.updatedAt instanceof Date ? previous.updatedAt.getTime() + 1 : 0)
  )
  const document = {
    _id: section,
    createdAt: previous?.createdAt instanceof Date ? previous.createdAt : now,
    images,
    updatedAt: now,
    updatedBy: 'site-media-migration-v2',
  }
  if (!previous) {
    await collection.insertOne(document)
    return document
  }

  const filter = { _id: section, images: previous.images }
  filter.updatedAt = Object.hasOwn(previous, 'updatedAt')
    ? previous.updatedAt
    : { $exists: false }
  const result = await collection.updateOne(
    filter,
    { $set: {
      createdAt: document.createdAt,
      images: document.images,
      updatedAt: document.updatedAt,
      updatedBy: document.updatedBy,
    } }
  )
  if (result.matchedCount !== 1) throw new Error(`Section ${section} changed during migration.`)
  return document
}

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: cloudName,
  secure: true,
})

const client = new MongoClient(process.env.MONGODB_URI, {
  appName: 'siamgroundwater-site-media-migration-v2',
  maxPoolSize: 4,
  serverSelectionTimeoutMS: 10000,
})

let migrationLock = null
await client.connect()
try {
  const database = client.db(databaseName)
  await Promise.all([database.command({ ping: 1 }), cloudinary.api.ping()])
  let state = await readPreflightState(database)

  console.log(`Preflight OK: database "${databaseName}", Cloudinary "${cloudName}", root "${rootFolder}".`)
  console.log(`Fallback files: ${localPaths.length}; content-addressed assets: ${sourcePlans.size}.`)
  console.log(`Sections to migrate: ${state.classification.needsMigration.length}; already valid: ${state.classification.alreadyValid.length}; blocking: ${state.classification.blocking.length}.`)
  console.log(`Assets reusable for eligible sections: ${state.reusable}; uploads needed: ${state.plannedIds.size - state.reusable}.`)
  throwForBlockingState(state)

  if (!options.apply) {
    console.log('Dry run complete. No database or Cloudinary content was changed.')
    console.log(`Before apply, create a verified CMS backup, then provide exact confirmations for database "${databaseName}", cloud "${cloudName}", and root "${rootFolder}".`)
  } else if (state.classification.needsMigration.length === 0) {
    console.log('Apply is already complete. No database or Cloudinary content was changed.')
    console.log('Redeploy the website if the completed migration has not yet been deployed, then verify every affected public route.')
  } else {
    await verifyBackupMatches(options.backup, database, state.allDocuments)
    migrationLock = await acquireMigrationLock(database)
    await migrationLock.renew()

    // Refresh both providers after locking so apply cannot rely on stale preflight information.
    state = await readPreflightState(database)
    throwForBlockingState(state)
    await verifyBackupMatches(options.backup, database, state.allDocuments)

    const collection = database.collection('cmsSiteMedia')
    const counters = { alreadyValid: state.classification.alreadyValid.length, migrated: 0, recovered: 0, reused: 0, uploaded: 0 }

    for (const section of state.classification.needsMigration) {
      await migrationLock.renew()
      const definition = manifest[section]
      const previous = state.documents.get(section)
      const providersBySource = new Map()
      const uploadedNow = []
      const attemptedPublicIds = []
      const absentBeforeSection = new Set()

      try {
        for (const source of [...new Set(definition.fallbacks)]) {
          const plan = sourcePlans.get(source)
          let provider = state.providerAssets.get(plan.publicId)
          if (!provider) {
            absentBeforeSection.add(plan.publicId)
            attemptedPublicIds.push(plan.publicId)
            const resource = await cloudinary.uploader.upload(
              path.resolve(publicRoot, ...source.split('/').filter(Boolean)),
              {
                context: {
                  migration_sha256: plan.contentSha256,
                  migration_source: source,
                },
                overwrite: false,
                public_id: plan.publicId,
                resource_type: 'image',
                tags: ['sgw', 'cms', 'site-media', 'migration-v2', section],
                unique_filename: false,
                use_filename: false,
              }
            )
            provider = providerAssetFromResource(resource, plan.contentSha256)
            const uploadErrors = validateReusablePlan(plan, provider, configuration)
            if (uploadErrors.length) throw new Error(uploadErrors.join(' '))
            state.providerAssets.set(plan.publicId, provider)
            uploadedNow.push(provider)
            counters.uploaded += 1
          } else {
            const reuseErrors = validateReusablePlan(plan, provider, configuration)
            if (reuseErrors.length) throw new Error(reuseErrors.join(' '))
            counters.reused += 1
          }
          providersBySource.set(source, provider)
        }

        const images = definition.fallbacks.map((source) => {
          const provider = providersBySource.get(source)
          return { asset: provider.asset, src: provider.asset.src }
        })

        let saved
        try {
          saved = await writeSection(collection, section, previous, images)
        } catch (writeError) {
          let current
          try {
            current = await collection.findOne({ _id: section })
          } catch {
            throw new UnknownMongoWriteResultError(
              `MongoDB write result for ${section} is unknown. No image rollback was attempted. Review these IDs: ${attemptedPublicIds.join(', ')}`,
              { cause: writeError }
            )
          }
          if (documentMatchesImages(current, images)) {
            saved = current
            counters.recovered += 1
            console.log(`[${section}] Recovered a committed MongoDB write after an uncertain response.`)
          } else throw writeError
        }

        state.documents.set(section, saved)
        counters.migrated += 1
        console.log(`[${section}] Saved ${images.length} image slots.`)
      } catch (error) {
        if (error instanceof UnknownMongoWriteResultError) throw error
        const expectedImages = definition.fallbacks.map((source) => {
          const provider = providersBySource.get(source)
          return provider ? { asset: provider.asset, src: provider.asset.src } : null
        })
        const current = await collection.findOne({ _id: section }).catch(() => null)
        if (!documentMatchesImages(current, expectedImages)) {
          let discovered
          try {
            discovered = await discoverAttemptedUploads(
              attemptedPublicIds.filter((publicId) => absentBeforeSection.has(publicId))
            )
          } catch (discoveryError) {
            console.error(`[${section}] Provider state is unknown. No image rollback was attempted. Review IDs: ${attemptedPublicIds.join(', ')}`)
            throw new AggregateError([error, discoveryError], `Migration and provider reconciliation failed for ${section}.`)
          }
          try {
            const rollback = await rollbackUnreferenced(database, [...uploadedNow, ...discovered])
            if (rollback.preserved.length) {
              console.error(`[${section}] Preserved referenced rollback candidates: ${rollback.preserved.join(', ')}`)
            }
          } catch (rollbackError) {
            console.error(`[${section}] Rollback could not be confirmed. Review IDs: ${attemptedPublicIds.join(', ')}`)
            throw new AggregateError([error, rollbackError], `Migration and rollback failed for ${section}.`)
          }
        }
        throw error
      }
    }

    const verified = await collection.find({ _id: { $in: Object.keys(manifest) } }).toArray()
    const verifiedBySection = new Map(verified.map((document) => [document._id, document]))
    const finalProviderAssets = await listExistingAssets(`${rootFolder}/`)
    const postErrors = []
    for (const [section, definition] of Object.entries(manifest)) {
      postErrors.push(...validateManagedDocument(
        section,
        verifiedBySection.get(section),
        definition,
        configuration,
        finalProviderAssets
      ))
    }
    if (verified.length !== Object.keys(manifest).length || postErrors.length) {
      throw new Error(
        `Post-check failed: ${verified.length}/${Object.keys(manifest).length} sections. ${postErrors.join(' ')}`
      )
    }

    console.log(`Migration complete: ${counters.migrated} migrated (${counters.recovered} recovered), ${counters.alreadyValid} already valid, ${counters.uploaded} uploaded, ${counters.reused} reused.`)
    console.log(`Post-check passed: ${verified.length} runtime-valid sections and every database image exists in Cloudinary.`)
    console.log('Public fallbacks were not deleted. Redeploy the website after migration so statically generated routes use the new database records; then verify every affected public route.')
  }
} finally {
  if (migrationLock) {
    await migrationLock.release().catch(() => {
      console.error('Could not release the migration lock. It expires automatically after 15 minutes.')
    })
  }
  await client.close()
}
