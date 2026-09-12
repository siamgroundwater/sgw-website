import { CMS_PROJECT_CATEGORIES, CMS_PROJECT_WORK_TYPES, type CmsProjectInput, type CmsProjectTranslation } from '../types/cms.ts'

/** A stable content marker, not a security hash. Normalized like saved project text. */
export function thaiProjectContentHash(project: Pick<CmsProjectInput, 'title' | 'location' | 'summary' | 'details'>) {
  const content = JSON.stringify([
    project.title.trim(), project.location.trim(), project.summary.trim(),
    project.details.map((value) => value.trim()).filter(Boolean),
  ])
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function translationCompletion(translation: CmsProjectTranslation) {
  return ['title', 'location', 'summary', 'details'].filter((field) => {
    const value = translation[field as keyof CmsProjectTranslation]
    return Array.isArray(value) ? value.some((item) => item.trim()) : Boolean(value.trim())
  }).length
}

export function moveProjectImage<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items
  const next = [...items]
  ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
  return next
}

export function orderedProjectImages(saved: string[], pendingIds: string[], order: string[]) {
  const available = new Set([...saved, ...pendingIds])
  return [...new Set([...order.filter((key) => available.has(key)), ...available])]
}

export type RecoverableProjectImage = {
  id: string
  name: string
  originalBytes: number
  kind: 'cover' | 'gallery'
  metadata: { alt: string; caption: string }
}

export function reconnectProjectImageDescriptions(images: Array<{ id: string; originalName: string; originalBytes: number }>, recovered: RecoverableProjectImage[], kind: RecoverableProjectImage['kind']) {
  const remaining = [...recovered]
  const metadata: Record<string, { alt: string; caption: string }> = {}
  const restoredIds: Record<string, string> = {}
  for (const image of images) {
    const match = remaining.findIndex((item) => item.kind === kind && item.name === image.originalName && item.originalBytes === image.originalBytes)
    if (match < 0) continue
    const [item] = remaining.splice(match, 1)
    metadata[image.id] = item.metadata
    restoredIds[item.id] = image.id
  }
  return { metadata, remaining, restoredIds }
}

export type ProjectTemplate = {
  id: string
  name: string
  category: CmsProjectInput['category']
  workTypes: CmsProjectInput['workTypes']
  details: string[]
}

export function projectTemplate(value: unknown): ProjectTemplate | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<ProjectTemplate>
  if (typeof item.id !== 'string' || typeof item.name !== 'string' || !Array.isArray(item.category) || !Array.isArray(item.workTypes) || !Array.isArray(item.details)) return null
  if (!item.details.every((detail) => typeof detail === 'string')) return null
  if (!item.category.every((category) => CMS_PROJECT_CATEGORIES.includes(category)) || !item.workTypes.every((workType) => CMS_PROJECT_WORK_TYPES.includes(workType))) return null
  return { id: item.id, name: item.name.slice(0, 80), category: item.category, workTypes: item.workTypes, details: item.details.slice(0, 80).map((detail) => detail.slice(0, 6000)) }
}

export function hasRecoverableProjectShape(value: unknown): value is CmsProjectInput & { updatedAt: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  const stringList = (list: unknown) => Array.isArray(list) && list.every((part) => typeof part === 'string')
  if (!['title', 'slug', 'location', 'summary', 'coverImage', 'updatedAt'].every((key) => typeof item[key] === 'string')) return false
  if (!['details', 'galleryImages', 'category', 'workTypes'].every((key) => stringList(item[key]))) return false
  if (!['year', 'lat', 'lng'].every((key) => item[key] === null || (typeof item[key] === 'number' && Number.isFinite(item[key])))) return false
  if (!item.translations || typeof item.translations !== 'object' || Array.isArray(item.translations)) return false
  const translations = item.translations as Record<string, unknown>
  for (const key of ['en', 'zh', 'ja']) {
    const translation = translations[key]
    if (translation === undefined && key !== 'en') continue
    if (!translation || typeof translation !== 'object' || Array.isArray(translation)) return false
    const content = translation as Record<string, unknown>
    if (!['title', 'location', 'summary'].every((field) => typeof content[field] === 'string') || !stringList(content.details)) return false
  }
  return true
}
