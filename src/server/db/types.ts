import type { ObjectId } from 'mongodb'
import type { CmsProjectCategory, CmsProjectWorkType } from '@/types/cms'

export type { CmsProjectCategory, CmsProjectWorkType }

export type CmsDocumentStatus = 'draft' | 'active' | 'archived'
export type CmsUserRole = 'admin' | 'editor' | 'viewer'
export type CmsContentType = 'project' | 'service' | 'learning'

export type CmsTimestampedDocument = {
  _id?: ObjectId
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export type CmsUserDocument = CmsTimestampedDocument & {
  email?: string
  lastLoginAt?: Date
  name: string
  passwordHash: string
  role: CmsUserRole
  status: CmsDocumentStatus
  username: string
  usernameLower: string
}

export type CmsProjectTranslation = {
  details: string[]
  location: string
  summary: string
  title: string
}

export type CmsProjectTranslations = {
  en: CmsProjectTranslation
}

export type CmsProjectContent = {
  category: CmsProjectCategory[]
  coverImage: string
  details: string[]
  galleryImages: string[]
  lat: number | null
  lng: number | null
  location: string
  slug: string
  summary: string
  title: string
  translations?: CmsProjectTranslations
  workTypes: CmsProjectWorkType[]
  year: number | null
}

export type CmsProjectDraft = CmsProjectContent & {
  savedAt: Date
  savedBy: string
}

export type CmsProjectDocument = CmsTimestampedDocument & CmsProjectContent & {
  draft?: CmsProjectDraft
  publishedAt?: Date
  publishedBy?: string
  publishedVersion?: number
  source: 'cms' | 'public-snapshot'
  status: CmsDocumentStatus
}

export type CmsProjectRevisionDocument = {
  _id?: ObjectId
  content: CmsProjectContent
  projectId: ObjectId
  publishedAt: Date
  publishedBy: string
  version: number
}

export type CmsStagedProjectMediaDocument = {
  _id?: ObjectId
  asset: {
    bytes: number
    createdAt: string
    format: string
    height: number
    publicId: string
    src: string
    width: number
  }
  createdAt: Date
  expiresAt: Date
  submissionId: string
  userId: string
}

export type CmsServiceBlock = {
  bullets: string[]
  text: string
  title: string
}

export type CmsServiceDocument = CmsTimestampedDocument & {
  blocks: CmsServiceBlock[]
  description: string
  heroImage: string
  key: 'survey' | 'drilling' | 'maintenance' | 'consult'
  slug: string
  source: 'cms' | 'public-snapshot'
  status: CmsDocumentStatus
  title: string
}

export type CmsLearningSection = {
  bullets: string[]
  heading: string
  image?: string
  paragraphs: string[]
}

export type CmsLearningSource = {
  href: string
  label: string
}

export type CmsLearningDocument = CmsTimestampedDocument & {
  audience: string
  description: string
  eyebrow: string
  heroImage?: string
  sections: CmsLearningSection[]
  slug: string
  source: 'cms' | 'public-snapshot'
  sources: CmsLearningSource[]
  status: CmsDocumentStatus
  title: string
}

export type CmsAuditAction =
  | 'content.create'
  | 'content.update'
  | 'content.publish'
  | 'content.unpublish'
  | 'content.restore'
  | 'content.archive'
  | 'content.import'
  | 'media.upload'
  | 'user.create'
  | 'user.update'
  | 'user.delete'

export type CmsAuditScalar = boolean | number | string | null

export type CmsAuditChange = {
  after?: CmsAuditScalar
  before?: CmsAuditScalar
  field: string
}

export type CmsAuditLogDocument = {
  _id?: ObjectId
  action: CmsAuditAction
  actor: {
    displayName: string
    role: CmsUserRole
    userId: string
    username: string
  }
  changes?: CmsAuditChange[]
  createdAt: Date
  entity: {
    id: string
    label?: string
    type: CmsContentType | 'user' | 'import' | 'media'
  }
  expiresAt: Date
  metadata?: Record<string, CmsAuditScalar>
  summary: string
}
