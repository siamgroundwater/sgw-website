import 'server-only'

import { ObjectId, type ClientSession, type Filter, type Sort } from 'mongodb'
import {
  getCmsLearningCollection,
  getCmsProjectRevisionsCollection,
  getCmsProjectsCollection,
  getCmsServicesCollection,
  getCmsSiteMediaCollection,
  getCmsStagedProjectMediaCollection,
  getCmsTeamDirectoryCollection,
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
  CmsProjectTranslations,
  CmsServiceInput,
  CmsServiceRecord,
  CmsStatus,
} from '@/types/cms'
import { normalizeSlug } from '@/lib/slug'
import { normalizeCmsProjectCategories } from '@/lib/cms-project-categories'
import { normalizeProjectWorkTypes } from '@/lib/project-work-types'
import { hasProjectTranslationContent, normalizeProjectTranslation } from '@/lib/project-translations'
import { ensureCmsIndexes } from '../db/cms-indexes.ts'
import { ensureCmsStagedMediaIndexes } from './staged-media-indexes'

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
        ensureCmsIndexes(projects, 'projects'),
        ensureCmsIndexes(revisions, 'projectRevisions'),
        ensureCmsStagedMediaIndexes(stagedMedia),
        ensureCmsIndexes(services, 'services'),
        ensureCmsIndexes(learning, 'learning'),
      ])
    })().catch((error) => {
      indexPromise = null
      throw error
    })
  }
  await indexPromise
}

type CmsProjectActor = { displayName: string; userId: string }

function projectTranslations(input: { translations?: CmsProjectDocument['translations'] }): CmsProjectTranslations {
  const translations: CmsProjectTranslations = {
    en: normalizeProjectTranslation(input.translations?.en),
  }
  const chinese = normalizeProjectTranslation(input.translations?.zh)
  const japanese = normalizeProjectTranslation(input.translations?.ja)
  if (hasProjectTranslationContent(chinese)) translations.zh = chinese
  if (hasProjectTranslationContent(japanese)) translations.ja = japanese
  return translations
}

function projectContentFromInput(input: CmsProjectInput): CmsProjectContent {
  return {
    mediaMetadata: input.mediaMetadata || {},
    translationSourceHash: input.translationSourceHash || {},
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

function currentProjectContent(document: CmsProjectContent): CmsProjectContent {
  return {
    mediaMetadata: document.mediaMetadata || {},
    translationSourceHash: document.translationSourceHash || {},
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
  const content = currentProjectContent(document)
  return {
    mediaMetadata: content.mediaMetadata,
    translationSourceHash: content.translationSourceHash,
    category: normalizeCmsProjectCategories(content.category),
    coverImage: content.coverImage,
    createdAt: document.createdAt.toISOString(),
    details: content.details,
    galleryImages: content.galleryImages,
    deletedAt: document.deletedAt?.toISOString() || null,
    id: document._id.toString(),
    lat: content.lat,
    lng: content.lng,
    location: content.location,
    slug: normalizeSlug(content.slug),
    source: document.source,
    status: document.deletedAt || document.status === 'archived' ? 'archived' : 'active',
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

export type CmsProjectQuery = {
  query?: string
  category?: string
  workType?: string
  sort?: string
  page?: number | string
  pageSize?: number | string
  view?: string
}

export async function queryCmsProjects(options: CmsProjectQuery = {}) {
  await ensureCmsContentIndexes()
  const collection = await getCmsProjectsCollection()
  const pageSize = Math.max(1, Math.min(60, Math.floor(Number(options.pageSize) || 12)))
  const requestedPage = Math.max(1, Math.floor(Number(options.page) || 1))
  const filter: Filter<CmsProjectDocument> = options.view === 'trash'
    ? { $or: [{ deletedAt: { $exists: true } }, { status: 'archived' }] }
    : { deletedAt: { $exists: false }, status: 'active' }
  const clauses: Filter<CmsProjectDocument>[] = [filter]
  if (options.category) clauses.push({ category: options.category as CmsProjectInput['category'][number] })
  if (options.workType) clauses.push({ workTypes: options.workType as CmsProjectInput['workTypes'][number] })
  const query = options.query?.trim().slice(0, 120)
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const fields = ['title', 'location', 'summary', 'slug', 'translations.en.title', 'translations.en.location', 'translations.en.summary', 'translations.zh.title', 'translations.zh.location', 'translations.zh.summary', 'translations.ja.title', 'translations.ja.location', 'translations.ja.summary']
    clauses.push({ $or: fields.map((field) => ({ [field]: { $regex: escaped, $options: 'i' } })) })
  }
  const combined = { $and: clauses }
  const total = await collection.countDocuments(combined)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const sort: Sort = options.sort === 'title' ? { title: 1, _id: 1 } : options.sort === 'year' ? { year: -1, updatedAt: -1, _id: 1 } : { updatedAt: -1, _id: 1 }
  const rows = await collection
    .find(combined)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray()
  return { items: rows.map(serializeCmsProject), total, page, pageSize, totalPages }
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

export async function getCmsProjectById(id: string, includeDeleted = false) {
  await ensureCmsContentIndexes()
  const row = await (await getCmsProjectsCollection()).findOne({
    _id: assertObjectId(id),
    ...(includeDeleted ? {} : { deletedAt: { $exists: false }, status: 'active' as const }),
  })
  return row ? serializeCmsProject(row) : null
}

export async function getCmsProjectMediaUrlsInUse(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.map((value) => value.trim()).filter(Boolean)))
  if (!uniqueUrls.length) return new Set<string>()
  const collection = await getCmsProjectsCollection()
  // Preserve historical media until every environment has completed the backed-up migration.
  const rows = await collection.find<CmsProjectDocument & { draft?: Pick<CmsProjectContent, 'coverImage' | 'galleryImages'> }>(
    {
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
  const revisions = await (await getCmsProjectRevisionsCollection()).find({
    $or: [{ 'content.coverImage': { $in: uniqueUrls } }, { 'content.galleryImages': { $in: uniqueUrls } }],
  }, { projection: { content: 1 } }).toArray()
  for (const row of revisions) {
    for (const src of [row.content.coverImage, ...row.content.galleryImages]) {
      if (uniqueUrls.includes(src)) inUse.add(src)
    }
  }
  const siteMedia = await (await getCmsSiteMediaCollection()).find(
    { 'images.src': { $in: uniqueUrls } },
    { projection: { images: 1 } }
  ).toArray()
  for (const row of siteMedia) {
    for (const image of row.images) {
      if (uniqueUrls.includes(image.src)) inUse.add(image.src)
    }
  }
  const teamDirectory = await (await getCmsTeamDirectoryCollection()).findOne(
    { _id: 'about-teams', 'teams.members.image.src': { $in: uniqueUrls } },
    { projection: { 'teams.members.image.src': 1 } }
  )
  for (const team of teamDirectory?.teams || []) {
    for (const member of team.members || []) {
      if (uniqueUrls.includes(member.image.src)) inUse.add(member.image.src)
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
  actor: CmsProjectActor,
  session?: ClientSession
) {
  const collection = await getCmsProjectsCollection()
  const now = new Date()
  const document: CmsProjectDocument = {
    ...projectContentFromInput(input), createdAt: now, source: 'cms', status: 'active', updatedAt: now,
  }
  void actor
  try {
    const result = await collection.insertOne(document, { session })
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

function expectedProjectDate(value: string | undefined) {
  const date = value ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) {
    throw new CmsContentError('Reload the project before saving; its saved version is required.', 428)
  }
  return date
}

export async function updateCmsProject(
  id: string,
  input: CmsProjectInput,
  actor: CmsProjectActor,
  expectedUpdatedAt: string,
  session?: ClientSession
) {
  const collection = await getCmsProjectsCollection()
  const previousDate = expectedProjectDate(expectedUpdatedAt)
  try {
    const result = await collection.findOneAndUpdate(
      { _id: assertObjectId(id), deletedAt: { $exists: false }, status: 'active', updatedAt: previousDate },
      { $set: { ...projectContentFromInput(input), source: 'cms', status: 'active', updatedAt: new Date(Math.max(Date.now(), previousDate.getTime() + 1)) } },
      { returnDocument: 'after', session }
    )
    // Historical draft/revision fields are retained until the backed-up migration handles them.
    if (!result) throw new CmsContentError('This project changed or was removed. Reload its latest version before saving.', 409)
    void actor
    return serializeCmsProject(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
}

export async function restoreCmsProject(
  id: string,
  expectedUpdatedAt: string,
  session?: ClientSession
) {
  const collection = await getCmsProjectsCollection()
  const previousDate = expectedProjectDate(expectedUpdatedAt)
  try {
    const result = await collection.findOneAndUpdate(
      { _id: assertObjectId(id), updatedAt: previousDate, $or: [{ deletedAt: { $exists: true } }, { status: 'archived' }] },
      {
        $set: { source: 'cms', status: 'active', updatedAt: new Date(Math.max(Date.now(), previousDate.getTime() + 1)) },
        $unset: { deletedAt: '' },
      },
      { returnDocument: 'after', session }
    )
    if (!result) throw new CmsContentError('This project changed or is no longer in the trash. Reload before restoring.', 409)
    return serializeCmsProject(result)
  } catch (error) {
    if (error instanceof CmsContentError) throw error
    return throwWriteError(error)
  }
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

export async function deleteCmsProject(id: string, expectedUpdatedAt: string, session?: ClientSession) {
  const previousDate = expectedProjectDate(expectedUpdatedAt)
  const now = new Date(Math.max(Date.now(), previousDate.getTime() + 1))
  const result = await (await getCmsProjectsCollection()).findOneAndUpdate(
    { _id: assertObjectId(id), deletedAt: { $exists: false }, status: 'active', updatedAt: previousDate },
    { $set: { deletedAt: now, status: 'archived', updatedAt: now } },
    { returnDocument: 'after', session }
  )
  if (!result) throw new CmsContentError('This project changed or was already removed. Reload before removing it.', 409)
  return serializeCmsProject(result)
}

export async function deleteCmsService(id: string) {
  await ensureCmsContentIndexes()
  await softDelete(id, await getCmsServicesCollection())
}

export async function deleteCmsLearning(id: string) {
  await ensureCmsContentIndexes()
  await softDelete(id, await getCmsLearningCollection())
}
