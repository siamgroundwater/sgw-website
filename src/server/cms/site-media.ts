import 'server-only'

import type { ClientSession } from 'mongodb'
import {
  isSiteMediaSectionKey,
  siteMediaFallbacks,
  siteMediaLimits,
  type SiteMediaSectionKey,
  type SiteMediaServiceKey,
} from '@/lib/site-media'
import { getCmsSiteMediaCollection } from '@/server/db'
import type {
  CmsSiteMediaDocument,
  CmsSiteMediaItem,
} from '@/server/db'
import { CmsContentError } from './content'

export type CmsSiteMediaSection = {
  fallback: boolean
  images: string[]
  section: SiteMediaSectionKey
  updatedAt: string | null
}

function validImageSource(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1200) return false
  if (value.startsWith('/')) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function validStoredItems(section: SiteMediaSectionKey, items: unknown): items is CmsSiteMediaItem[] {
  if (!Array.isArray(items)) return false
  const { minimum, maximum } = siteMediaLimits[section]
  return items.length >= minimum && items.length <= maximum && items.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    const candidate = item as Partial<CmsSiteMediaItem>
    return validImageSource(candidate.src) && (!candidate.asset || candidate.asset.src === candidate.src)
  })
}

function fallbackItems(section: SiteMediaSectionKey): CmsSiteMediaItem[] {
  return siteMediaFallbacks[section].map((src) => ({ src }))
}

function serializeSection(
  section: SiteMediaSectionKey,
  document: CmsSiteMediaDocument | null
): CmsSiteMediaSection {
  const fallback = !document || !validStoredItems(section, document.images)
  const images = fallback ? fallbackItems(section) : document.images
  return {
    fallback,
    images: images.map(({ src }) => src),
    section,
    updatedAt: document?.updatedAt instanceof Date && Number.isFinite(document.updatedAt.getTime())
      ? document.updatedAt.toISOString()
      : null,
  }
}

export async function getCmsSiteMediaSection(
  section: SiteMediaSectionKey,
  session?: ClientSession
) {
  const document = await (await getCmsSiteMediaCollection()).findOne(
    { _id: section },
    { session }
  )
  return serializeSection(section, document)
}

export async function getCmsSiteMediaDocument(
  section: SiteMediaSectionKey,
  session?: ClientSession
) {
  return (await getCmsSiteMediaCollection()).findOne({ _id: section }, { session })
}

export async function getPublicSiteMediaImages(section: SiteMediaSectionKey) {
  try {
    return (await getCmsSiteMediaSection(section)).images
  } catch (error) {
    console.error(`Could not load ${section} media; using public fallbacks.`, error)
    return [...siteMediaFallbacks[section]]
  }
}

export async function getPublicServiceMedia(serviceKey: SiteMediaServiceKey) {
  const images = await getPublicSiteMediaImages(`service-${serviceKey}`)
  return {
    hero: images[0] || siteMediaFallbacks[`service-${serviceKey}`][0],
    gallery: images.slice(1).length
      ? images.slice(1)
      : [...siteMediaFallbacks[`service-${serviceKey}`].slice(1)],
  }
}

export function validateSiteMediaImageList(section: unknown, images: unknown) {
  if (!isSiteMediaSectionKey(section)) {
    throw new CmsContentError('Invalid media section.', 400)
  }
  if (!Array.isArray(images)) {
    throw new CmsContentError('Images must be a list.', 400)
  }
  const values = images.map((value) => typeof value === 'string' ? value.trim() : '')
  const { minimum, maximum } = siteMediaLimits[section]
  if (
    values.length < minimum ||
    values.length > maximum ||
    values.some((value) => !validImageSource(value))
  ) {
    throw new CmsContentError(
      minimum === maximum
        ? `This section requires exactly ${minimum} image.`
        : `This section requires ${minimum}-${maximum} images.`,
      400
    )
  }
  return { images: values, section }
}

function expectedDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') {
    throw new CmsContentError('Reload this media section before saving.', 428)
  }
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new CmsContentError('Reload this media section before saving.', 428)
  }
  return date
}

export async function saveCmsSiteMediaSection(
  section: SiteMediaSectionKey,
  images: CmsSiteMediaItem[],
  expectedUpdatedAt: unknown,
  userId: string,
  session: ClientSession
) {
  const collection = await getCmsSiteMediaCollection()
  const previousDate = expectedDate(expectedUpdatedAt)
  const current = await collection.findOne({ _id: section }, { session })

  if (
    (current && (!previousDate || current.updatedAt.getTime() !== previousDate.getTime())) ||
    (!current && previousDate)
  ) {
    throw new CmsContentError(
      'This media section changed. Reload the latest version before saving.',
      409
    )
  }

  const now = new Date(
    Math.max(Date.now(), (current?.updatedAt.getTime() || 0) + 1)
  )
  if (current) {
    const result = await collection.findOneAndUpdate(
      { _id: section, updatedAt: current.updatedAt },
      { $set: { images, updatedAt: now, updatedBy: userId } },
      { returnDocument: 'after', session }
    )
    if (!result) {
      throw new CmsContentError(
        'This media section changed. Reload the latest version before saving.',
        409
      )
    }
    return serializeSection(section, result)
  }

  const document: CmsSiteMediaDocument = {
    _id: section,
    createdAt: now,
    images,
    updatedAt: now,
    updatedBy: userId,
  }
  try {
    await collection.insertOne(document, { session })
    return serializeSection(section, document)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new CmsContentError(
        'This media section changed. Reload the latest version before saving.',
        409
      )
    }
    throw error
  }
}

export async function getSiteMediaUrlsInUse(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.map((value) => value.trim()).filter(Boolean)))
  if (!uniqueUrls.length) return new Set<string>()
  const rows = await (await getCmsSiteMediaCollection()).find(
    { 'images.src': { $in: uniqueUrls } },
    { projection: { images: 1 } }
  ).toArray()
  const inUse = new Set<string>()
  for (const row of rows) {
    for (const item of row.images) {
      if (uniqueUrls.includes(item.src)) inUse.add(item.src)
    }
  }
  return inUse
}
