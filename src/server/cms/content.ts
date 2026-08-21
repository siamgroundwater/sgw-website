import 'server-only'

import { ObjectId } from 'mongodb'
import {
  getCmsLearningCollection,
  getCmsProjectRevisionsCollection,
  getCmsProjectsCollection,
  getCmsServicesCollection,
  getCmsStagedProjectMediaCollection,
} from '@/server/db'
import type {
  CmsLearningDocument,
  CmsProjectContent,
  CmsProjectDocument,
  CmsServiceDocument,
} from '@/server/db'
import type {
  CmsLearningInput,
  CmsLearningRecord,
  CmsProjectInput,
  CmsProjectRecord,
  CmsProjectRevisionRecord,
  CmsServiceInput,
  CmsServiceRecord,
  CmsStatus,
} from '@/types/cms'
import { normalizeSlug } from '@/lib/slug'
import { normalizeCmsProjectCategories } from '@/lib/cms-project-categories'
import { normalizeProjectWorkTypes } from '@/lib/project-work-types'

export class CmsContentError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(message: string, status = 400, fields?: Record<string, string>) {
    super(message)
    this.name = 'CmsContentError'
    this.status = status
    this.fields = fields
  }
}

let indexPromise: Promise<void> | null = null

export async function ensureCmsContentIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const [projects, revisions, services, learning, stagedMedia] = await Promise.all([
        getCmsProjectsCollection(),
        getCmsProjectRevisionsCollection(),
        getCmsServicesCollection(),
        getCmsLearningCollection(),
        getCmsStagedProjectMediaCollection(),
      ])
      await Promise.all([
        projects.createIndex(
          { slug: 1 },
          { unique: true, partialFilterExpression: { deletedAt: null } }
        ),
        projects.createIndex({ status: 1, year: -1, updatedAt: -1 }),
        projects.createIndex({ title: 'text', location: 'text', summary: 'text' }),
        revisions.createIndex({ projectId: 1, version: -1 }, { unique: true }),
        stagedMedia.createIndex({ expiresAt: 1 }),
        stagedMedia.createIndex({ 'asset.publicId': 1 }, { unique: true }),
        stagedMedia.createIndex({ submissionId: 1, userId: 1 }),
        services.createIndex(
          { key: 1 },
          { unique: true, partialFilterExpression: { deletedAt: null } }
        ),
        services.createIndex(
          { slug: 1 },
          { unique: true, partialFilterExpression: { deletedAt: null } }
        ),
        learning.createIndex(
          { slug: 1 },
          { unique: true, partialFilterExpression: { deletedAt: null } }
        ),
        learning.createIndex({ status: 1, updatedAt: -1 }),
      ])
    })()
  }
  await indexPromise
}

type CmsPublishActor = { displayName: string; userId: string }

function projectTranslations(input: { translations?: CmsProjectDocument['translations'] }) {
  const english = input.translations?.en
  return {
    en: {
      details: english?.details || [],
      location: english?.location || '',
      summary: english?.summary || '',
      title: english?.title || '',
    },
  }
}

function projectContentFromInput(input: CmsProjectInput): CmsProjectContent {
  return {
    category: input.category,
    coverImage: input.coverImage,
    details: input.details,
    galleryImages: input.galleryImages,
    lat: input.lat,
    lng: input.lng,
    location: input.location,
    slug: normalizeSlug(input.slug),
    summary: input.summary,
    title: input.title,
    translations: projectTranslations(input),
    workTypes: input.workTypes,
    year: input.year,
  }
}

function publishedProjectContent(document: CmsProjectDocument): CmsProjectContent {
  return {
    category: normalizeCmsProjectCategories(document.category),
    coverImage: document.coverImage,
    details: document.details,
    galleryImages: document.galleryImages,
    lat: document.lat,
    lng: document.lng,
    location: document.location,
    slug: normalizeSlug(document.slug),
    summary: document.summary,
    title: document.title,
    translations: projectTranslations(document),
    workTypes: normalizeProjectWorkTypes(document.workTypes),
    year: document.year,
  }
}

function assertObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new CmsContentError('Invalid content id.')
  return new ObjectId(id)
}

function duplicateError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
  )
}

function throwWriteError(error: unknown): never {
  if (duplicateError(error)) {
    throw new CmsContentError('Slug or unique content key already exists.', 409, {
      slug: 'This slug or content key is already in use.',
    })
  }
  throw error
}

export function serializeCmsProject(document: CmsProjectDocument): CmsProjectRecord {
  if (!document._id) throw new Error('CMS project is missing _id.')
  const content = document.draft || publishedProjectContent(document)
  return {
    category: normalizeCmsProjectCategories(content.category),
    coverImage: content.coverImage,
    createdAt: document.createdAt.toISOString(),
    details: content.details,
    galleryImages: content.galleryImages,
    hasUnpublishedChanges: Boolean(document.draft) || document.status === 'draft',
    id: document._id.toString(),
    lat: content.lat,
    lng: content.lng,
    location: content.location,
    publishedAt: document.publishedAt?.toISOString() || null,
    publishedBy: document.publishedBy || null,
    publishedVersion: document.publishedVersion || (document.status === 'active' ? 1 : 0),
    slug: normalizeSlug(content.slug),
    source: document.source,
    status: document.status,
    summary: content.summary,
    title: content.title,
    translations: projectTranslations(content),
    updatedAt: document.updatedAt.toISOString(),
    workTypes: normalizeProjectWorkTypes(content.workTypes),
    year: content.year,
  }
}

export function serializeCmsService(document: CmsServiceDocument): CmsServiceRecord {
  if (!document._id) throw new Error('CMS service is missing _id.')
  return {
    blocks: document.blocks,
    createdAt: document.createdAt.toISOString(),
    description: document.description,
    heroImage: document.heroImage,
    id: document._id.toString(),
    key: document.key,
    slug: normalizeSlug(document.slug),
    source: document.source,
    status: document.status,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
  }
}

export function serializeCmsLearning(document: CmsLearningDocument): CmsLearningRecord {
  if (!document._id) throw new Error('CMS learning article is missing _id.')
  return {
    audience: document.audience,
    createdAt: document.createdAt.toISOString(),
    description: document.description,
    eyebrow: document.eyebrow,
    heroImage: document.heroImage || '',
    id: document._id.toString(),
    sections: document.sections.map((section) => ({
      ...section,
      image: section.image || '',
    })),
    slug: normalizeSlug(document.slug),
    source: document.source,
    sources: document.sources,
    status: document.status,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
  }
}

function statusFilter(status?: CmsStatus) {
  return status ? { status } : {}
}

export async function listCmsProjects(status?: CmsStatus) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const rows = await collection
    .find({ deletedAt: { $exists: false }, ...statusFilter(status) })
    .sort({ year: -1, updatedAt: -1, title: 1 })
    .limit(300)
    .toArray()
  return rows.map(serializeCmsProject)
}

export async function listCmsServices(status?: CmsStatus) {
  await ensureCmsContentIndexes()
  const collection = await getCmsServicesCollection()
  const rows = await collection
    .find({ deletedAt: { $exists: false }, ...statusFilter(status) })
    .sort({ updatedAt: -1, title: 1 })
    .limit(40)
    .toArray()
  return rows.map(serializeCmsService)
}

export async function listCmsLearning(status?: CmsStatus) {
  await ensureCmsContentIndexes()
  const collection = await getCmsLearningCollection()
  const rows = await collection
    .find({ deletedAt: { $exists: false }, ...statusFilter(status) })
    .sort({ updatedAt: -1, title: 1 })
    .limit(100)
    .toArray()
  return rows.map(serializeCmsLearning)
}

export async function getCmsProjectById(id: string) {
  await ensureCmsContentIndexes()
  const row = await (await getCmsProjectsCollection()).findOne({
    _id: assertObjectId(id),
    deletedAt: { $exists: false },
  })
  return row ? serializeCmsProject(row) : null
}

export async function getCmsProjectMediaUrlsInUse(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.map((value) => value.trim()).filter(Boolean)))
  if (!uniqueUrls.length) return new Set<string>()
  const collection = await getCmsProjectsCollection()
  const rows = await collection.find(
    {
      deletedAt: { $exists: false },
      $or: [
        { coverImage: { $in: uniqueUrls } },
        { galleryImages: { $in: uniqueUrls } },
        { 'draft.coverImage': { $in: uniqueUrls } },
        { 'draft.galleryImages': { $in: uniqueUrls } },
      ],
    },
    { projection: { coverImage: 1, galleryImages: 1, draft: 1 } }
  ).toArray()
  const inUse = new Set<string>()
  for (const row of rows) {
    if (uniqueUrls.includes(row.coverImage)) inUse.add(row.coverImage)
    for (const image of row.galleryImages) {
      if (uniqueUrls.includes(image)) inUse.add(image)
    }
    if (row.draft && uniqueUrls.includes(row.draft.coverImage)) inUse.add(row.draft.coverImage)
    for (const image of row.draft?.galleryImages || []) {
      if (uniqueUrls.includes(image)) inUse.add(image)
    }
  }
  return inUse
}

export async function getCmsServiceById(id: string) {
  await ensureCmsContentIndexes()
  const row = await (await getCmsServicesCollection()).findOne({
    _id: assertObjectId(id),
    deletedAt: { $exists: false },
  })
  return row ? serializeCmsService(row) : null
}

export async function getCmsLearningById(id: string) {
  await ensureCmsContentIndexes()
  const row = await (await getCmsLearningCollection()).findOne({
    _id: assertObjectId(id),
    deletedAt: { $exists: false },
  })
  return row ? serializeCmsLearning(row) : null
}

export async function createCmsProject(
  input: CmsProjectInput,
  actor: CmsPublishActor,
  publish = false
) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const now = new Date()
  const document: CmsProjectDocument = {
    ...projectContentFromInput(input),
    createdAt: now,
    publishedAt: publish ? now : undefined,
    publishedBy: publish ? actor.displayName : undefined,
    publishedVersion: publish ? 1 : 0,
    source: 'cms',
    status: publish ? 'active' : 'draft',
    updatedAt: now,
  }
  try {
    const result = await collection.insertOne(document)
    return serializeCmsProject({ ...document, _id: result.insertedId })
  } catch (error) {
    return throwWriteError(error)
  }
}

export async function createCmsService(input: CmsServiceInput) {
  await ensureCmsContentIndexes()
  const collection = await getCmsServicesCollection()
  const now = new Date()
  const document: CmsServiceDocument = {
    ...input,
    createdAt: now,
    source: 'cms',
    updatedAt: now,
  }
  try {
    const result = await collection.insertOne(document)
    return serializeCmsService({ ...document, _id: result.insertedId })
  } catch (error) {
    return throwWriteError(error)
  }
}

export async function createCmsLearning(input: CmsLearningInput) {
  await ensureCmsContentIndexes()
  const collection = await getCmsLearningCollection()
  const now = new Date()
  const document: CmsLearningDocument = {
    ...input,
    createdAt: now,
    source: 'cms',
    updatedAt: now,
  }
  try {
    const result = await collection.insertOne(document)
    return serializeCmsLearning({ ...document, _id: result.insertedId })
  } catch (error) {
    return throwWriteError(error)
  }
}

export async function updateCmsProject(
  id: string,
  input: CmsProjectInput,
  actor: CmsPublishActor,
  expectedUpdatedAt?: string
) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const objectId = assertObjectId(id)
  try {
    const current = await collection.findOne({ _id: objectId, deletedAt: { $exists: false } })
    if (!current) throw new CmsContentError('Project not found.', 404)
    if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new CmsContentError('This project changed in another tab. Reload before saving.', 409)
    }
    const now = new Date()
    const content = projectContentFromInput(input)
    const result = current.status === 'active'
      ? await collection.findOneAndUpdate(
          { _id: objectId, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
          {
            $set: {
              draft: { ...content, savedAt: now, savedBy: actor.displayName },
              source: 'cms',
              updatedAt: now,
            },
          },
          { returnDocument: 'after' }
        )
      : await collection.findOneAndUpdate(
          { _id: objectId, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
          {
            $set: { ...content, source: 'cms', status: 'draft', updatedAt: now },
            $unset: { draft: '' },
          },
          { returnDocument: 'after' }
        )
    if (!result) throw new CmsContentError('This project changed in another tab. Reload before saving.', 409)
    return serializeCmsProject(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
}

async function preservePublishedRevision(document: CmsProjectDocument) {
  if (!document._id || document.status !== 'active') return
  const revisions = await getCmsProjectRevisionsCollection()
  const version = document.publishedVersion || 1
  await revisions.updateOne(
    { projectId: document._id, version },
    {
      $setOnInsert: {
        content: publishedProjectContent(document),
        projectId: document._id,
        publishedAt: document.publishedAt || document.updatedAt,
        publishedBy: document.publishedBy || 'Imported project snapshot',
        version,
      },
    },
    { upsert: true }
  )
}

export async function publishCmsProject(
  id: string,
  input: CmsProjectInput,
  actor: CmsPublishActor,
  expectedUpdatedAt?: string
) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const objectId = assertObjectId(id)
  const current = await collection.findOne({ _id: objectId, deletedAt: { $exists: false } })
  if (!current) throw new CmsContentError('Project not found.', 404)
  if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new CmsContentError('This project changed in another tab. Reload before publishing.', 409)
  }
  await preservePublishedRevision(current)
  const now = new Date()
  const nextVersion = current.status === 'active' ? (current.publishedVersion || 1) + 1 : Math.max(1, (current.publishedVersion || 0) + 1)
  try {
    const result = await collection.findOneAndUpdate(
      { _id: objectId, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
      {
        $set: {
          ...projectContentFromInput(input),
          publishedAt: now,
          publishedBy: actor.displayName,
          publishedVersion: nextVersion,
          source: 'cms',
          status: 'active',
          updatedAt: now,
        },
        $unset: { draft: '' },
      },
      { returnDocument: 'after' }
    )
    if (!result) throw new CmsContentError('This project changed in another tab. Reload before publishing.', 409)
    return serializeCmsProject(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
}

export async function unpublishCmsProject(id: string, actor: CmsPublishActor, expectedUpdatedAt?: string) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const objectId = assertObjectId(id)
  const current = await collection.findOne({ _id: objectId, deletedAt: { $exists: false } })
  if (!current) throw new CmsContentError('Project not found.', 404)
  if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new CmsContentError('This project changed in another tab. Reload before unpublishing.', 409)
  }
  if (current.status !== 'active') return serializeCmsProject(current)
  await preservePublishedRevision(current)
  const result = await collection.findOneAndUpdate(
    { _id: objectId, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
    {
      $set: { source: 'cms', status: 'draft', updatedAt: new Date() },
      $unset: { draft: '' },
    },
    { returnDocument: 'after' }
  )
  if (!result) throw new CmsContentError('Project not found.', 404)
  void actor
  return serializeCmsProject(result)
}

export async function listCmsProjectRevisions(id: string): Promise<CmsProjectRevisionRecord[]> {
  await ensureCmsContentIndexes()
  const projectId = assertObjectId(id)
  const rows = await (await getCmsProjectRevisionsCollection())
    .find({ projectId })
    .sort({ version: -1 })
    .limit(30)
    .toArray()
  return rows.map((row) => ({
    id: row._id?.toString() || '',
    publishedAt: row.publishedAt.toISOString(),
    publishedBy: row.publishedBy,
    version: row.version,
  }))
}

export async function restoreCmsProjectRevision(
  id: string,
  revisionId: string,
  actor: CmsPublishActor,
  expectedUpdatedAt?: string
) {
  await ensureCmsContentIndexes()
  const projectId = assertObjectId(id)
  const revisionObjectId = assertObjectId(revisionId)
  const [projects, revisions] = await Promise.all([
    getCmsProjectsCollection(),
    getCmsProjectRevisionsCollection(),
  ])
  const [current, revision] = await Promise.all([
    projects.findOne({ _id: projectId, deletedAt: { $exists: false } }),
    revisions.findOne({ _id: revisionObjectId, projectId }),
  ])
  if (!current || !revision) throw new CmsContentError('Project revision not found.', 404)
  if (expectedUpdatedAt && current.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new CmsContentError('This project changed in another tab. Reload before restoring.', 409)
  }
  await preservePublishedRevision(current)
  const now = new Date()
  const nextVersion = Math.max(current.publishedVersion || 0, revision.version) + 1
  const result = await projects.findOneAndUpdate(
    { _id: projectId, deletedAt: { $exists: false }, updatedAt: current.updatedAt },
    {
      $set: {
        ...revision.content,
        publishedAt: now,
        publishedBy: actor.displayName,
        publishedVersion: nextVersion,
        source: 'cms',
        status: 'active',
        updatedAt: now,
      },
      $unset: { draft: '' },
    },
    { returnDocument: 'after' }
  )
  if (!result) throw new CmsContentError('Project not found.', 404)
  return serializeCmsProject(result)
}

export async function updateCmsService(id: string, input: CmsServiceInput) {
  await ensureCmsContentIndexes()
  const collection = await getCmsServicesCollection()
  const objectId = assertObjectId(id)
  try {
    const result = await collection.findOneAndUpdate(
      { _id: objectId, deletedAt: { $exists: false } },
      { $set: { ...input, source: 'cms', updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) throw new CmsContentError('Service not found.', 404)
    return serializeCmsService(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
}

export async function updateCmsLearning(id: string, input: CmsLearningInput) {
  await ensureCmsContentIndexes()
  const collection = await getCmsLearningCollection()
  const objectId = assertObjectId(id)
  try {
    const result = await collection.findOneAndUpdate(
      { _id: objectId, deletedAt: { $exists: false } },
      { $set: { ...input, source: 'cms', updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) throw new CmsContentError('Learning article not found.', 404)
    return serializeCmsLearning(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
}

async function softDelete(
  id: string,
  collection: Awaited<
    ReturnType<
      | typeof getCmsProjectsCollection
      | typeof getCmsServicesCollection
      | typeof getCmsLearningCollection
    >
  >
) {
  const objectId = assertObjectId(id)
  const now = new Date()
  const result = await collection.updateOne(
    { _id: objectId, deletedAt: { $exists: false } },
    { $set: { deletedAt: now, status: 'archived', updatedAt: now } }
  )
  if (!result.matchedCount) throw new CmsContentError('Content not found.', 404)
}

export async function deleteCmsProject(id: string) {
  await ensureCmsContentIndexes()
  await softDelete(id, await getCmsProjectsCollection())
}

export async function deleteCmsService(id: string) {
  await ensureCmsContentIndexes()
  await softDelete(id, await getCmsServicesCollection())
}

export async function deleteCmsLearning(id: string) {
  await ensureCmsContentIndexes()
  await softDelete(id, await getCmsLearningCollection())
}
