import { createHash } from 'node:crypto'
import path from 'node:path'

export const migrationLockId = 'site-media-to-cloudinary-v2'

export function parseMigrationArguments(argumentsList) {
  const named = new Map()
  let apply = false
  for (const argument of argumentsList) {
    if (argument === '--apply') {
      if (apply) throw new Error('Use --apply only once.')
      apply = true
      continue
    }
    const match = /^--(backup|confirm-database|confirm-cloud|confirm-root)=(.+)$/.exec(argument)
    if (!match || named.has(match[1])) {
      throw new Error(
        'Usage: node scripts/migrate-site-media-to-cloudinary.mjs [--apply --backup=<file> --confirm-database=<name> --confirm-cloud=<name> --confirm-root=<folder>]'
      )
    }
    named.set(match[1], match[2].trim())
  }
  return {
    apply,
    backup: named.get('backup') || '',
    confirmCloud: named.get('confirm-cloud') || '',
    confirmDatabase: named.get('confirm-database') || '',
    confirmRoot: named.get('confirm-root') || '',
  }
}

export function assertApplyConfirmations(options, configuration) {
  if (!options.apply) return
  if (!configuration.databaseWasExplicit) {
    throw new Error('Apply requires an explicit MONGODB_DB value; no default database is allowed.')
  }
  if (!options.backup) throw new Error('Apply requires --backup=<verified CMS backup>.')
  if (options.confirmDatabase !== configuration.databaseName) {
    throw new Error(`Apply requires --confirm-database=${configuration.databaseName}`)
  }
  if (options.confirmCloud !== configuration.cloudName) {
    throw new Error(`Apply requires --confirm-cloud=${configuration.cloudName}`)
  }
  if (options.confirmRoot !== configuration.rootFolder) {
    throw new Error(`Apply requires --confirm-root=${configuration.rootFolder}`)
  }
}

export function normalizeRootFolder(value) {
  const normalized = value.trim().replace(/^\/+|\/+$/g, '')
  if (
    !normalized ||
    normalized.includes('..') ||
    normalized.includes('//') ||
    !normalized.split('/').every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))
  ) {
    throw new Error('Configure a safe Cloudinary root folder using letters, numbers, underscores, hyphens, and single slashes.')
  }
  return normalized
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function safeName(value) {
  return path.posix.parse(value).name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52) || 'image'
}

export function buildSourcePlans(definitions, rootFolder, fileContents) {
  const plans = new Map()
  for (const [section, definition] of Object.entries(definitions)) {
    for (const source of definition.fallbacks) {
      if (plans.has(source)) continue
      const contents = fileContents.get(source)
      if (!contents) throw new Error(`Missing fallback bytes for ${source}.`)
      const contentSha256 = sha256(contents)
      const sourceHash = sha256(source).slice(0, 12)
      const topFolder = section.startsWith('service-') ? 'services' : 'site'
      plans.set(source, {
        contentSha256,
        publicId: `${rootFolder}/${topFolder}/imported/${section}/${safeName(source)}-${sourceHash}-${contentSha256.slice(0, 16)}`,
        section,
        source,
      })
    }
  }
  return plans
}

export function isExactFallbackDocument(document, fallbacks) {
  return Boolean(
    document &&
    Array.isArray(document.images) &&
    document.images.length === fallbacks.length &&
    document.images.every((image, index) => image?.src === fallbacks[index])
  )
}

function isDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function cloudinaryUrlMatches(value, cloudName) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`)
  } catch {
    return false
  }
}

function validateAsset(asset, source, configuration, label) {
  const errors = []
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
    return [`${label} has no Cloudinary asset metadata.`]
  }
  if (asset.src !== source) errors.push(`${label} asset.src does not match src.`)
  if (!cloudinaryUrlMatches(source, configuration.cloudName)) {
    errors.push(`${label} URL is not from the configured Cloudinary account.`)
  }
  if (
    typeof asset.publicId !== 'string' ||
    !(asset.publicId === configuration.rootFolder || asset.publicId.startsWith(`${configuration.rootFolder}/`))
  ) {
    errors.push(`${label} public ID is outside the configured media root.`)
  }
  if (!isPositiveInteger(asset.bytes)) errors.push(`${label} bytes are invalid.`)
  if (!isPositiveInteger(asset.height)) errors.push(`${label} height is invalid.`)
  if (!isPositiveInteger(asset.width)) errors.push(`${label} width is invalid.`)
  if (typeof asset.format !== 'string' || !asset.format.trim()) errors.push(`${label} format is invalid.`)
  if (typeof asset.createdAt !== 'string' || !Number.isFinite(new Date(asset.createdAt).getTime())) {
    errors.push(`${label} createdAt is invalid.`)
  }
  return errors
}

export function validateManagedDocument(
  section,
  document,
  definition,
  configuration,
  providerAssets
) {
  const errors = []
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return [`${section} document is missing.`]
  }
  if (document._id !== section) errors.push(`${section} has the wrong document ID.`)
  if (!isDate(document.createdAt)) errors.push(`${section} createdAt is invalid.`)
  if (!isDate(document.updatedAt)) errors.push(`${section} updatedAt is invalid.`)
  if (typeof document.updatedBy !== 'string' || !document.updatedBy.trim()) {
    errors.push(`${section} updatedBy is invalid.`)
  }
  if (!Array.isArray(document.images)) {
    errors.push(`${section} images are not an array.`)
    return errors
  }
  if (
    document.images.length < definition.minimum ||
    document.images.length > definition.maximum
  ) {
    errors.push(`${section} has ${document.images.length} images; expected ${definition.minimum}-${definition.maximum}.`)
  }
  document.images.forEach((item, index) => {
    const label = `${section} images[${index}]`
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label} is invalid.`)
      return
    }
    errors.push(...validateAsset(item.asset, item.src, configuration, label))
    const publicId = item.asset?.publicId
    const provider = typeof publicId === 'string' ? providerAssets.get(publicId) : null
    if (!provider) {
      errors.push(`${label} is missing from Cloudinary.`)
      return
    }
    if (provider.asset.src !== item.src) errors.push(`${label} URL does not match Cloudinary.`)
    for (const field of ['bytes', 'format', 'height', 'width']) {
      if (provider.asset[field] !== item.asset?.[field]) {
        errors.push(`${label} ${field} does not match Cloudinary.`)
      }
    }
  })
  return errors
}

export function classifySections(definitions, documents, configuration, providerAssets) {
  const result = { alreadyValid: [], blocking: [], needsMigration: [] }
  for (const [section, definition] of Object.entries(definitions)) {
    const document = documents.get(section)
    if (!document || isExactFallbackDocument(document, definition.fallbacks)) {
      result.needsMigration.push(section)
      continue
    }
    const errors = validateManagedDocument(
      section,
      document,
      definition,
      configuration,
      providerAssets
    )
    if (errors.length) result.blocking.push({ errors, section })
    else result.alreadyValid.push(section)
  }
  return result
}

export function validateReusablePlan(plan, provider, configuration) {
  if (!provider) return []
  const errors = validateAsset(
    provider.asset,
    provider.asset?.src,
    configuration,
    `Cloudinary ${plan.publicId}`
  )
  if (provider.asset?.publicId !== plan.publicId) {
    errors.push(`Cloudinary ${plan.publicId} returned a different public ID.`)
  }
  if (provider.migrationSha256 !== plan.contentSha256) {
    errors.push(`Cloudinary ${plan.publicId} does not have the expected source-content hash.`)
  }
  return errors
}

export function documentMatchesImages(document, images) {
  return Boolean(
    document &&
    Array.isArray(document.images) &&
    document.images.length === images.length &&
    document.images.every((item, index) =>
      item?.src === images[index]?.src &&
      item?.asset?.publicId === images[index]?.asset?.publicId
    )
  )
}

export function assertDeletionConfirmed(publicIds, result) {
  const unresolved = publicIds.filter((publicId) => {
    const status = result?.deleted?.[publicId]
    return status !== 'deleted' && status !== 'not_found'
  })
  if (unresolved.length) {
    throw new Error(`Cloudinary did not confirm deletion for: ${unresolved.join(', ')}`)
  }
  return publicIds
}

export function findReferencedPublicIds(value, candidates, cloudName) {
  const byId = new Set(candidates.map((candidate) => candidate.publicId))
  const byUrl = new Map(candidates.map((candidate) => [candidate.src.split(/[?#]/)[0], candidate.publicId]))
  const found = new Set()

  const inspect = (text) => {
    if (byId.has(text)) found.add(text)
    const exact = byUrl.get(text.split(/[?#]/)[0])
    if (exact) found.add(exact)
    try {
      const url = new URL(text)
      if (url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/`)) return
      const deliveryPath = decodeURIComponent(url.pathname).split('/upload/')[1]
      if (!deliveryPath) return
      const segments = deliveryPath.split('/')
      for (let index = 0; index < segments.length; index += 1) {
        const suffix = segments.slice(index).join('/')
        for (const candidate of [suffix, suffix.replace(/\.[^/.]+$/, '')]) {
          if (byId.has(candidate)) found.add(candidate)
        }
      }
    } catch {
      // Ordinary content strings are not URLs.
    }
  }

  const visit = (item) => {
    if (typeof item === 'string') {
      inspect(item)
      return
    }
    if (!item || typeof item !== 'object' || item instanceof Date || item._bsontype || Buffer.isBuffer(item)) return
    if (Array.isArray(item)) {
      for (const child of item) visit(child)
      return
    }
    for (const [key, child] of Object.entries(item)) {
      inspect(key)
      visit(child)
    }
  }

  visit(value)
  return found
}
