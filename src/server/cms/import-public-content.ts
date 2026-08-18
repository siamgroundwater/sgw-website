import 'server-only'

import { learningArticles } from '@/data/learning'
import { recoveredThaiServiceDetails } from '@/data/service-page-details'
import { localizedContent, SERVICE_KEYS } from '@/i18n/localized-content'
import {
  ensureCmsContentIndexes,
} from './content'
import {
  getCmsLearningCollection,
  getCmsProjectsCollection,
  getCmsServicesCollection,
} from '@/server/db'
import { normalizeSlug } from '@/lib/slug'

const serviceHeroImages = {
  consult: '/images/services/consult/legacy-03.jpg',
  drilling: '/images/services/drilling/legacy-01.jpg',
  maintenance: '/images/services/maintenance/legacy-01.jpg',
  survey: '/images/services/survey/legacy-01.jpg',
} as const

type ImportCount = { inserted: number; skipped: number; updated: number }

async function importProjects(): Promise<ImportCount> {
  const collection = await getCmsProjectsCollection()
  const existing = await collection.countDocuments({ deletedAt: { $exists: false } })
  return { inserted: 0, skipped: existing, updated: 0 }
}

async function importServices(): Promise<ImportCount> {
  const collection = await getCmsServicesCollection()
  const existing = await collection
    .find({ deletedAt: { $exists: false } }, { projection: { key: 1, source: 1 } })
    .toArray()
  const byKey = new Map(existing.map((row) => [row.key, row]))
  const count: ImportCount = { inserted: 0, skipped: 0, updated: 0 }

  for (const key of SERVICE_KEYS) {
    const previous = byKey.get(key)
    if (previous?.source === 'cms') {
      count.skipped += 1
      continue
    }

    const now = new Date()
    const copy = localizedContent.th.services.items[key]
    const document = {
      blocks: recoveredThaiServiceDetails[key].map((block) => ({
        bullets: block.bullets || [],
        text: block.text,
        title: block.title,
      })),
      description: copy.intro,
      heroImage: serviceHeroImages[key],
      key,
      slug: key,
      source: 'public-snapshot' as const,
      status: 'active' as const,
      title: copy.title,
      updatedAt: now,
    }

    if (previous?._id) {
      await collection.updateOne({ _id: previous._id }, { $set: document })
      count.updated += 1
    } else {
      await collection.insertOne({ ...document, createdAt: now })
      count.inserted += 1
    }
  }

  return count
}

async function importLearning(): Promise<ImportCount> {
  const collection = await getCmsLearningCollection()
  const existing = await collection
    .find({ deletedAt: { $exists: false } }, { projection: { slug: 1, source: 1 } })
    .toArray()
  const bySlug = new Map(existing.map((row) => [normalizeSlug(row.slug), row]))
  const count: ImportCount = { inserted: 0, skipped: 0, updated: 0 }

  for (const article of learningArticles) {
    const slug = normalizeSlug(article.slug)
    const previous = bySlug.get(slug)
    if (previous?.source === 'cms') {
      count.skipped += 1
      continue
    }

    const now = new Date()
    const document = {
      audience: article.audience,
      description: article.description,
      eyebrow: article.eyebrow,
      heroImage: '',
      sections: article.sections.map((section) => ({
        bullets: section.bullets || [],
        heading: section.heading,
        image: '',
        paragraphs: section.paragraphs,
      })),
      slug,
      source: 'public-snapshot' as const,
      sources: article.sources || [],
      status: 'active' as const,
      title: article.title,
      updatedAt: now,
    }

    if (previous?._id) {
      await collection.updateOne({ _id: previous._id }, { $set: document })
      count.updated += 1
    } else {
      await collection.insertOne({ ...document, createdAt: now })
      count.inserted += 1
    }
  }

  return count
}

export async function importPublicContentSnapshot() {
  await ensureCmsContentIndexes()
  const [projectResult, serviceResult, learningResult] = await Promise.all([
    importProjects(),
    importServices(),
    importLearning(),
  ])

  return {
    learning: learningResult,
    projects: projectResult,
    services: serviceResult,
  }
}
