import 'server-only'

import { cache } from 'react'
import { ObjectId } from 'mongodb'
import { getProjectCategoryLabel } from '@/lib/project-categories'
import type { Project, ProjectTranslations } from '@/lib/projects'
import { getCmsProjectsCollection } from '@/server/db'
import type { CmsProjectDocument } from '@/server/db'
import { normalizeSlug } from '@/lib/slug'
import { normalizeCmsProjectCategories } from '@/lib/cms-project-categories'
import { localizeProjectWorkTypes } from '@/lib/project-work-types'
import { hasProjectTranslationContent, normalizeProjectTranslation } from '@/lib/project-translations'

function skipDatabaseDuringCiBuild() {
  return (
    process.env.CI === 'true' &&
    process.env.SGW_CI_SKIP_DATABASE === 'true'
  )
}

function publicProjectTranslations(document: CmsProjectDocument): ProjectTranslations {
  const translations: ProjectTranslations = {
    en: normalizeProjectTranslation(document.translations?.en),
  }
  const chinese = normalizeProjectTranslation(document.translations?.zh)
  const japanese = normalizeProjectTranslation(document.translations?.ja)
  if (hasProjectTranslationContent(chinese)) translations.zh = chinese
  if (hasProjectTranslationContent(japanese)) translations.ja = japanese
  return translations
}

function toPublicProject(document: CmsProjectDocument): Project {
  if (!document._id) throw new Error('Public project is missing its MongoDB ObjectId.')
  return {
    _id: document._id.toString(),
    category: normalizeCmsProjectCategories(document.category).map(getProjectCategoryLabel),
    coverImage: document.coverImage,
    details: document.details,
    galleryImages: document.galleryImages,
    mediaMetadata: document.mediaMetadata,
    lat: document.lat,
    lng: document.lng,
    location: document.location,
    slug: normalizeSlug(document.slug),
    summary: document.summary,
    title: document.title,
    translations: publicProjectTranslations(document),
    workTypes: localizeProjectWorkTypes(document.workTypes, 'th'),
    year: document.year,
  }
}

export const listPublicProjects = cache(async () => {
  if (skipDatabaseDuringCiBuild()) return []

  const collection = await getCmsProjectsCollection()
  const rows = await collection.find({
    deletedAt: { $exists: false },
    status: 'active',
  }).sort({ year: -1, updatedAt: -1, title: 1 }).toArray()
  return rows.map(toPublicProject)
})

export const getPublicProjectById = cache(async (id: string | number) => {
  const objectId = String(id)
  if (!ObjectId.isValid(objectId)) return null
  if (skipDatabaseDuringCiBuild()) return null

  const collection = await getCmsProjectsCollection()
  const row = await collection.findOne({
    _id: new ObjectId(objectId),
    deletedAt: { $exists: false },
    status: 'active',
  })
  return row ? toPublicProject(row) : null
})
