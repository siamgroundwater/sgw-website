import {
  CMS_PROJECT_CATEGORIES,
  CMS_PROJECT_WORK_TYPES,
  type CmsProjectCategory,
  type CmsProjectWorkType,
  type CmsProjectInput,
  type CmsLearningInput,
  type CmsServiceInput,
  type CmsStatus,
} from '../types/cms.ts'
import { normalizeSlug } from './slug.ts'

export type ValidationResult<T> =
  | { data: T; errors: null }
  | { data: null; errors: Record<string, string> }

const statusValues: CmsStatus[] = ['draft', 'active', 'archived']
const projectCategories: readonly CmsProjectCategory[] = CMS_PROJECT_CATEGORIES
const projectWorkTypes: readonly CmsProjectWorkType[] = CMS_PROJECT_WORK_TYPES
const serviceKeys: CmsServiceInput['key'][] = [
  'survey',
  'drilling',
  'maintenance',
  'consult',
]

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanStringList(value: unknown, limit = 100, itemLength = 500) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanString(item, itemLength))
    .filter(Boolean)
    .slice(0, limit)
}

function isSafeSlug(value: string) {
  return (
    value.length >= 2 &&
    value.length <= 180 &&
    !/[\s/\\?#\u0000-\u001f]/.test(value)
  )
}

function isSafeAsset(value: string) {
  if (!value) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isSafeLink(value: string) {
  if (!value) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function readNumber(value: unknown) {
  if (value === null || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function readStatus(value: unknown): CmsStatus {
  return statusValues.includes(value as CmsStatus) ? (value as CmsStatus) : 'draft'
}

export function validateProjectInput(value: unknown): ValidationResult<CmsProjectInput> {
  const body = recordOf(value)
  if (!body) return { data: null, errors: { form: 'Invalid project data.' } }

  const title = cleanString(body.title, 180)
  const slug = normalizeSlug(cleanString(body.slug, 1000)).slice(0, 180)
  const location = cleanString(body.location, 300)
  const summary = cleanString(body.summary, 12000)
  const coverImage = cleanString(body.coverImage, 1000)
  const rawCategories = Array.isArray(body.category) ? body.category : []
  const category = Array.from(new Set(rawCategories.filter(
    (item): item is CmsProjectCategory => projectCategories.includes(item as CmsProjectCategory)
  )))
  const rawWorkTypes = Array.isArray(body.workTypes) ? body.workTypes : []
  const workTypes = Array.from(new Set(rawWorkTypes.filter(
    (item): item is CmsProjectWorkType => projectWorkTypes.includes(item as CmsProjectWorkType)
  )))
  const year = readNumber(body.year)
  const lat = readNumber(body.lat)
  const lng = readNumber(body.lng)
  const galleryImages = cleanStringList(body.galleryImages, 120, 1000)
  const translations = recordOf(body.translations)
  const english = recordOf(translations?.en)
  const errors: Record<string, string> = {}

  if (!title) errors.title = 'Project title is required.'
  if (!isSafeSlug(slug)) errors.slug = 'Use a URL-safe slug without spaces or slashes.'
  if (!location) errors.location = 'Project location is required.'
  if (!category.length || rawCategories.some((item) => !projectCategories.includes(item as CmsProjectCategory))) {
    errors.category = 'Choose at least one valid project category.'
  }
  if (rawWorkTypes.some((item) => !projectWorkTypes.includes(item as CmsProjectWorkType))) {
    errors.workTypes = 'Choose valid project work types.'
  }
  if (!statusValues.includes(body.status as CmsStatus)) errors.status = 'Choose a valid content status.'
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 5)) {
    errors.year = 'Enter a valid four-digit year.'
  }
  if (lat !== null && (lat < -90 || lat > 90)) errors.lat = 'Latitude must be between -90 and 90.'
  if (lng !== null && (lng < -180 || lng > 180)) errors.lng = 'Longitude must be between -180 and 180.'
  if ((lat === null) !== (lng === null)) {
    errors.lat = 'Enter both latitude and longitude, or leave both empty.'
    errors.lng = 'Enter both latitude and longitude, or leave both empty.'
  }
  if (!isSafeAsset(coverImage)) errors.coverImage = 'Use an absolute HTTP(S) URL or a local / path.'
  if (galleryImages.some((image) => !isSafeAsset(image))) errors.galleryImages = 'Every gallery item must be a valid asset URL or local path.'

  if (Object.keys(errors).length) return { data: null, errors }

  return {
    errors: null,
    data: {
      category,
      coverImage,
      details: cleanStringList(body.details, 80, 6000),
      galleryImages,
      lat,
      lng,
      location,
      slug,
      status: readStatus(body.status),
      summary,
      title,
      translations: {
        en: {
          details: cleanStringList(english?.details, 80, 6000),
          location: cleanString(english?.location, 300),
          summary: cleanString(english?.summary, 12000),
          title: cleanString(english?.title, 180),
        },
      },
      workTypes,
      year,
    },
  }
}

export function validateProjectForPublishing(input: CmsProjectInput) {
  const errors: Record<string, string> = {}
  if (!input.summary) errors.summary = 'Thai project summary is required before publishing.'
  if (!input.coverImage) errors.coverImage = 'Cover image is required before publishing.'
  return Object.keys(errors).length ? errors : null
}

export function validateServiceInput(value: unknown): ValidationResult<CmsServiceInput> {
  const body = recordOf(value)
  if (!body) return { data: null, errors: { form: 'Invalid service data.' } }

  const title = cleanString(body.title, 180)
  const slug = normalizeSlug(cleanString(body.slug, 1000)).slice(0, 180)
  const description = cleanString(body.description, 4000)
  const heroImage = cleanString(body.heroImage, 1000)
  const key = serviceKeys.includes(body.key as CmsServiceInput['key'])
    ? (body.key as CmsServiceInput['key'])
    : null
  const rawBlocks = Array.isArray(body.blocks) ? body.blocks.slice(0, 24) : []
  const blocks = rawBlocks
    .map(recordOf)
    .filter((block): block is Record<string, unknown> => Boolean(block))
    .map((block) => ({
      bullets: cleanStringList(block.bullets, 30, 500),
      text: cleanString(block.text, 6000),
      title: cleanString(block.title, 180),
    }))
    .filter((block) => block.title || block.text)
  const errors: Record<string, string> = {}

  if (!title) errors.title = 'Service title is required.'
  if (!isSafeSlug(slug)) errors.slug = 'Use a URL-safe slug without spaces or slashes.'
  if (!key) errors.key = 'Choose a valid SGW service.'
  if (!description) errors.description = 'Service description is required.'
  if (!statusValues.includes(body.status as CmsStatus)) errors.status = 'Choose a valid content status.'
  if (!blocks.length) errors.blocks = 'Add at least one service detail block.'
  if (blocks.some((block) => !block.title || !block.text)) errors.blocks = 'Every service block needs a title and description.'
  if (!isSafeAsset(heroImage)) errors.heroImage = 'Use an absolute HTTP(S) URL or a local / path.'

  if (Object.keys(errors).length || !key) return { data: null, errors }
  return {
    errors: null,
    data: {
      blocks,
      description,
      heroImage,
      key,
      slug,
      status: readStatus(body.status),
      title,
    },
  }
}

export function validateLearningInput(value: unknown): ValidationResult<CmsLearningInput> {
  const body = recordOf(value)
  if (!body) return { data: null, errors: { form: 'Invalid learning article data.' } }

  const title = cleanString(body.title, 180)
  const slug = normalizeSlug(cleanString(body.slug, 1000)).slice(0, 180)
  const description = cleanString(body.description, 4000)
  const eyebrow = cleanString(body.eyebrow, 120)
  const heroImage = cleanString(body.heroImage, 1000)
  const audience = cleanString(body.audience, 1000)
  const rawSections = Array.isArray(body.sections) ? body.sections.slice(0, 40) : []
  const sections = rawSections
    .map(recordOf)
    .filter((section): section is Record<string, unknown> => Boolean(section))
    .map((section) => ({
      bullets: cleanStringList(section.bullets, 50, 1000),
      heading: cleanString(section.heading, 220),
      image: cleanString(section.image, 1000),
      paragraphs: cleanStringList(section.paragraphs, 30, 6000),
    }))
    .filter((section) => section.heading || section.paragraphs.length || section.bullets.length)
  const rawSources = Array.isArray(body.sources) ? body.sources.slice(0, 30) : []
  const sources = rawSources
    .map(recordOf)
    .filter((source): source is Record<string, unknown> => Boolean(source))
    .map((source) => ({
      href: cleanString(source.href, 1000),
      label: cleanString(source.label, 220),
    }))
    .filter((source) => source.label || source.href)
  const errors: Record<string, string> = {}

  if (!title) errors.title = 'Article title is required.'
  if (!isSafeSlug(slug)) errors.slug = 'Use a URL-safe slug without spaces or slashes.'
  if (!description) errors.description = 'Article description is required.'
  if (!audience) errors.audience = 'Describe the intended audience.'
  if (!isSafeAsset(heroImage)) errors.heroImage = 'Use an absolute HTTP(S) URL or a local / path.'
  if (!statusValues.includes(body.status as CmsStatus)) errors.status = 'Choose a valid content status.'
  if (!sections.length) errors.sections = 'Add at least one learning section.'
  if (sections.some((section) => !section.heading || (!section.paragraphs.length && !section.bullets.length))) {
    errors.sections = 'Every section needs a heading and learning content.'
  }
  if (sections.some((section) => !isSafeAsset(section.image))) {
    errors.sections = 'Every section image must use an HTTP(S) URL or a local / path.'
  }
  if (sources.some((source) => !source.label || !isSafeLink(source.href))) {
    errors.sources = 'Every source needs a label and a valid HTTP(S) URL.'
  }

  if (Object.keys(errors).length) return { data: null, errors }
  return {
    errors: null,
    data: {
      audience,
      description,
      eyebrow,
      heroImage,
      sections,
      slug,
      sources,
      status: readStatus(body.status),
      title,
    },
  }
}
