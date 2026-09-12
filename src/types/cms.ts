export type CmsStatus = 'draft' | 'active' | 'archived'
export type CmsRole = 'admin' | 'editor' | 'viewer'

export const CMS_PROJECT_CATEGORIES = ['government', 'factory', 'resort', 'agriculture', 'dewatering', 'other'] as const
export type CmsProjectCategory = (typeof CMS_PROJECT_CATEGORIES)[number]

export const CMS_PROJECT_WORK_TYPES = [
  'groundwater-survey',
  'groundwater-well-drilling',
  'groundwater-project-remediation',
  'groundwater-well-maintenance',
  'mineral-water',
  'island-work',
  'other',
] as const
export type CmsProjectWorkType = (typeof CMS_PROJECT_WORK_TYPES)[number]

export type CmsProjectTranslation = {
  details: string[]
  location: string
  summary: string
  title: string
}

export const CMS_PROJECT_TRANSLATION_LOCALES = ['en', 'zh', 'ja'] as const
export type CmsProjectTranslationLocale = (typeof CMS_PROJECT_TRANSLATION_LOCALES)[number]

export type CmsProjectTranslations = {
  en: CmsProjectTranslation
  ja?: CmsProjectTranslation
  zh?: CmsProjectTranslation
}

export type CmsProjectInput = {
  mediaMetadata?: Record<string, { alt: string; caption: string }>
  translationSourceHash?: Partial<Record<CmsProjectTranslationLocale, string>>
  category: CmsProjectCategory[]
  coverImage: string
  details: string[]
  galleryImages: string[]
  lat: number | null
  lng: number | null
  location: string
  slug: string
  status: 'active' | 'archived'
  summary: string
  title: string
  translations: CmsProjectTranslations
  workTypes: CmsProjectWorkType[]
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
  deletedAt: string | null
  id: string
  source: 'cms' | 'public-snapshot'
  updatedAt: string
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
  expiresAt?: number
  displayName: string
  role: CmsRole
  userId: string
  username: string
}
