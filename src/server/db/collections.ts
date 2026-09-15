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
  CmsProjectOperationDocument,
  CmsOperationalEventDocument,
  CmsSiteMediaDocument,
  CmsTeamDirectoryDocument,
  CmsTeamOperationDocument,
} from './types'

export const cmsCollectionNames = {
  auditLogs: 'cmsAuditLogs',
  learning: 'cmsLearning',
  projects: 'cmsProjects',
  projectRevisions: 'cmsProjectRevisions',
  services: 'cmsServices',
  siteMedia: 'cmsSiteMedia',
  stagedProjectMedia: 'cmsStagedProjectMedia',
  teamDirectory: 'cmsTeamDirectory',
  teamOperations: 'cmsTeamOperations',
  users: 'cmsUsers',
  projectOperations: 'cmsProjectOperations',
  operationalEvents: 'cmsOperationalEvents',
} as const

export function getCmsProjectOperationsCollection() {
  return getMongoCollection<CmsProjectOperationDocument>(cmsCollectionNames.projectOperations)
}

export function getCmsOperationalEventsCollection() {
  return getMongoCollection<CmsOperationalEventDocument>(cmsCollectionNames.operationalEvents)
}

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

export function getCmsSiteMediaCollection() {
  return getMongoCollection<CmsSiteMediaDocument>(cmsCollectionNames.siteMedia)
}

export function getCmsTeamDirectoryCollection() {
  return getMongoCollection<CmsTeamDirectoryDocument>(cmsCollectionNames.teamDirectory)
}

export function getCmsTeamOperationsCollection() {
  return getMongoCollection<CmsTeamOperationDocument>(cmsCollectionNames.teamOperations)
}

export function getCmsUsersCollection() {
  return getMongoCollection<CmsUserDocument>(cmsCollectionNames.users)
}
