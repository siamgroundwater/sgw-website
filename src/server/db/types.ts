import type { ObjectId } from 'mongodb'
import type { SiteMediaSectionKey } from '@/lib/site-media'
import type { CmsMediaAsset } from '@/types/cms-media'
import type { CmsProjectRecord } from '@/types/cms'
import type {
  CmsTeamMemberTranslations,
  CmsTeamTranslations,
  TeamDepartment,
  TeamMemberRole,
} from '@/lib/team-directory'
import type {
  CmsProjectCategory,
  CmsProjectTranslation,
  CmsProjectTranslations,
  CmsProjectWorkType,
} from '@/types/cms'

export type {
  CmsProjectCategory,
  CmsProjectTranslation,
  CmsProjectTranslations,
  CmsProjectWorkType,
}

export type CmsDocumentStatus = 'draft' | 'active' | 'archived'
export type CmsUserRole = 'admin' | 'editor' | 'viewer'
export type CmsContentType = 'project' | 'service' | 'learning' | 'team' | 'team-member'

export type CmsTimestampedDocument = {
  _id?: ObjectId
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export type CmsUserDocument = CmsTimestampedDocument & {
  sessionVersion?: number
  sessionsRevokedAt?: Date
  email?: string
  lastLoginAt?: Date
  name: string
  passwordHash: string
  role: CmsUserRole
  status: CmsDocumentStatus
  username: string
  usernameLower: string
}

export type CmsProjectContent = {
  mediaMetadata?: Record<string, { alt: string; caption: string }>
  translationSourceHash?: Partial<Record<'en' | 'ja' | 'zh', string>>
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

export type CmsProjectDocument = CmsTimestampedDocument & CmsProjectContent & {
  source: 'cms' | 'public-snapshot'
  status: 'active' | 'archived'
}

// Recovery-only records from before single Save. The CMS has no revision workflow.
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
  target?: string
  userId: string
  cleanupClaimedAt?: Date
}

export type CmsSiteMediaItem = {
  asset?: CmsMediaAsset
  src: string
}

export type CmsSiteMediaDocument = {
  _id: SiteMediaSectionKey
  createdAt: Date
  images: CmsSiteMediaItem[]
  updatedAt: Date
  updatedBy: string
}

export type CmsTeamMemberDocument = {
  certificates: string[]
  createdAt: Date
  id: string
  image: CmsSiteMediaItem
  name: string
  order: number
  role: TeamMemberRole
  title: string
  translations: CmsTeamMemberTranslations
  updatedAt: Date
}

export type CmsTeamDocument = {
  createdAt: Date
  department: TeamDepartment
  id: string
  members: CmsTeamMemberDocument[]
  name: string
  order: number
  translations: CmsTeamTranslations
  updatedAt: Date
}

export type CmsTeamDirectoryDocument = {
  _id: 'about-teams'
  createdAt: Date
  revision: number
  schemaVersion: 1
  teams: CmsTeamDocument[]
  updatedAt: Date
  updatedBy: string
}

export type CmsTeamOperationResult = {
  memberId?: string
  revision: number
  teamId?: string
}

export type CmsTeamOperationDocument = {
  _id?: ObjectId
  createdAt: Date
  fingerprint: string
  operationId: string
  result: CmsTeamOperationResult
  userId: string
}

export type CmsProjectOperationDocument = {
  _id?: ObjectId
  operationId: string
  userId: string
  fingerprint: string
  item: CmsProjectRecord
  createdAt: Date
}

export type CmsOperationalEventDocument = {
  _id?: ObjectId
  kind: 'media-cleanup' | 'project-revalidation' | 'audit-write'
  ok: boolean
  createdAt: Date
  counts?: { checked: number; removed: number; preserved: number; failed: number; remaining: number }
  projectId?: string
  error?: string
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
