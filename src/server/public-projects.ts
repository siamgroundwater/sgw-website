import 'server-only'

import { cache } from 'react'
import { ObjectId } from 'mongodb'
import { getProjectTypePresentation } from '@/lib/project-categories'
import type { Project } from '@/lib/projects'
import { getCmsProjectsCollection } from '@/server/db'
import type { CmsProjectDocument } from '@/server/db'
import { normalizeSlug } from '@/lib/slug'

function toPublicProject(document: CmsProjectDocument): Project {
  if (!document._id) throw new Error('Public project is missing its MongoDB ObjectId.')
  const presentation = getProjectTypePresentation(document.projectType)
  const english = document.translations?.en
  return {
    _id: document._id.toString(),
    businessTypes: document.businessTypes,
    category: [presentation.category],
    coverImage: document.coverImage,
    details: document.details,
    galleryImages: document.galleryImages,
    lat: document.lat,
    legacyPostId: document.legacyPostId || 0,
    legacyUrl: document.legacyUrl || '',
    lng: document.lng,
    location: document.location,
    projectType: document.projectType,
    projectTypeLabel: presentation.label,
    slug: normalizeSlug(document.slug),
    summary: document.summary,
    title: document.title,
    translations: {
      en: {
        businessTypes: english?.businessTypes || [],
        details: english?.details || [],
        location: english?.location || '',
        summary: english?.summary || '',
        title: english?.title || '',
        workTypes: english?.workTypes || [],
      },
    },
    workTypes: document.workTypes,
    year: document.year,
  }
}

export const listPublicProjects = cache(async () => {
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
  const collection = await getCmsProjectsCollection()
  const row = await collection.findOne({
    _id: new ObjectId(objectId),
    deletedAt: { $exists: false },
    status: 'active',
  })
  return row ? toPublicProject(row) : null
})

export const getPublicProjectByLegacyId = cache(async (id: string | number) => {
  const publicId = Number(id)
  if (!Number.isInteger(publicId) || publicId < 1) return null
  const collection = await getCmsProjectsCollection()
  const row = await collection.findOne({
    publicId,
    deletedAt: { $exists: false },
    status: 'active',
  })
  return row ? toPublicProject(row) : null
})
