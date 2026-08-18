export type CmsStatus = 'draft' | 'active' | 'archived'
export type CmsRole = 'admin' | 'editor' | 'viewer'

export type CmsProjectTranslation = {
  businessTypes: string[]
  details: string[]
  location: string
  summary: string
  title: string
  workTypes: string[]
}

export type CmsProjectTranslations = {
  en: CmsProjectTranslation
}

export type CmsProjectInput = {
  businessTypes: string[]
  category: 'government' | 'factory' | 'resort' | 'agriculture' | 'dewatering' | 'other'
  coverImage: string
  details: string[]
  galleryImages: string[]
  lat: number | null
  legacyUrl?: string
  lng: number | null
  location: string
  projectType: string
  slug: string
  status: CmsStatus
  summary: string
  title: string
  translations: CmsProjectTranslations
  workTypes: string[]
  year: number | null
}

export type CmsServiceInput = {
  blocks: Array<{ bullets: string[]; text: string; title: string }>
  description: string
  heroImage: string
  key: 'survey' | 'drilling' | 'maintenance' | 'consult'
  slug: string
  status: CmsStatus
  title: string
}

export type CmsLearningInput = {
  audience: string
  description: string
  eyebrow: string
  heroImage: string
  sections: Array<{ bullets: string[]; heading: string; image: string; paragraphs: string[] }>
  slug: string
  sources: Array<{ href: string; label: string }>
  status: CmsStatus
  title: string
}

export type CmsProjectRecord = CmsProjectInput & {
  createdAt: string
  hasUnpublishedChanges: boolean
  id: string
  publishedAt: string | null
  publishedBy: string | null
  publishedVersion: number
  publicId: number
  source: 'cms' | 'public-snapshot'
  updatedAt: string
}

export type CmsProjectRevisionRecord = {
  id: string
  publishedAt: string
  publishedBy: string
  version: number
}

export type CmsServiceRecord = CmsServiceInput & {
  createdAt: string
  id: string
  source: 'cms' | 'public-snapshot'
  updatedAt: string
}

export type CmsLearningRecord = CmsLearningInput & {
  createdAt: string
  id: string
  source: 'cms' | 'public-snapshot'
  updatedAt: string
}

export type CmsContentRecord = CmsProjectRecord | CmsServiceRecord | CmsLearningRecord

export type CmsUserRecord = {
  createdAt: string
  email: string
  id: string
  lastLoginAt: string | null
  name: string
  role: CmsRole
  status: CmsStatus
  username: string
}

export type CmsSession = {
  displayName: string
  role: CmsRole
  userId: string
  username: string
}
