import 'server-only'

import { getMongoCollection } from './mongodb'
import type {
  CmsAuditLogDocument,
  CmsLearningDocument,
  CmsProjectDocument,
  CmsProjectRevisionDocument,
  CmsServiceDocument,
  CmsStagedProjectMediaDocument,
  CmsUserDocument,
} from './types'

export const cmsCollectionNames = {
  auditLogs: 'cmsAuditLogs',
  learning: 'cmsLearning',
  projects: 'cmsProjects',
  projectRevisions: 'cmsProjectRevisions',
  services: 'cmsServices',
  stagedProjectMedia: 'cmsStagedProjectMedia',
  users: 'cmsUsers',
} as const

export function getCmsAuditLogsCollection() {
  return getMongoCollection<CmsAuditLogDocument>(cmsCollectionNames.auditLogs)
}

export function getCmsLearningCollection() {
  return getMongoCollection<CmsLearningDocument>(cmsCollectionNames.learning)
}

export function getCmsProjectsCollection() {
  return getMongoCollection<CmsProjectDocument>(cmsCollectionNames.projects)
}

export function getCmsProjectRevisionsCollection() {
  return getMongoCollection<CmsProjectRevisionDocument>(cmsCollectionNames.projectRevisions)
}

export function getCmsStagedProjectMediaCollection() {
  return getMongoCollection<CmsStagedProjectMediaDocument>(cmsCollectionNames.stagedProjectMedia)
}

export function getCmsServicesCollection() {
  return getMongoCollection<CmsServiceDocument>(cmsCollectionNames.services)
}

export function getCmsUsersCollection() {
  return getMongoCollection<CmsUserDocument>(cmsCollectionNames.users)
}
