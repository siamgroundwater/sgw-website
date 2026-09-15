import type { Collection, IndexDescription } from 'mongodb'

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

export type CmsCollectionKey = keyof typeof cmsCollectionNames

// Shared by runtime initialization, administrative scripts and the read-only
// audit. Changing a model's indexed fields requires updating this contract.
export const cmsIndexDefinitions: Record<CmsCollectionKey, IndexDescription[]> = {
  auditLogs: [
    { key: { expiresAt: 1 }, name: 'expiresAt_1', expireAfterSeconds: 0 },
    { key: { createdAt: -1 }, name: 'createdAt_-1' },
    { key: { 'entity.type': 1, createdAt: -1 }, name: 'entity.type_1_createdAt_-1' },
  ],
  learning: [
    { key: { slug: 1 }, name: 'slug_1', unique: true, partialFilterExpression: { deletedAt: null } },
    { key: { status: 1, updatedAt: -1 }, name: 'status_1_updatedAt_-1' },
  ],
  projects: [
    { key: { slug: 1 }, name: 'slug_1', unique: true, partialFilterExpression: { deletedAt: null } },
    { key: { status: 1, year: -1, updatedAt: -1 }, name: 'status_1_year_-1_updatedAt_-1' },
    { key: { title: 'text', location: 'text', summary: 'text' }, name: 'title_text_location_text_summary_text' },
  ],
  projectRevisions: [
    { key: { projectId: 1, version: -1 }, name: 'projectId_1_version_-1', unique: true },
  ],
  services: [
    { key: { key: 1 }, name: 'key_1', unique: true, partialFilterExpression: { deletedAt: null } },
    { key: { slug: 1 }, name: 'slug_1', unique: true, partialFilterExpression: { deletedAt: null } },
  ],
  // Section identity is the built-in unique _id index; no additional constraint.
  siteMedia: [],
  stagedProjectMedia: [
    // Not a TTL index: the cleaner must delete owned images before their records.
    { key: { expiresAt: 1 }, name: 'expiresAt_1' },
    { key: { 'asset.publicId': 1 }, name: 'asset.publicId_1', unique: true },
    { key: { submissionId: 1, userId: 1 }, name: 'submissionId_1_userId_1' },
  ],
  teamDirectory: [{ key: { updatedAt: -1 }, name: 'updatedAt_-1' }],
  teamOperations: [
    { key: { userId: 1, operationId: 1 }, name: 'userId_1_operationId_1', unique: true },
    { key: { createdAt: 1 }, name: 'createdAt_1', expireAfterSeconds: 7 * 24 * 60 * 60 },
  ],
  users: [
    { key: { usernameLower: 1 }, name: 'usernameLower_1', unique: true },
    { key: { status: 1, role: 1 }, name: 'status_1_role_1' },
  ],
  projectOperations: [
    { key: { userId: 1, operationId: 1 }, name: 'userId_1_operationId_1', unique: true },
  ],
  operationalEvents: [{ key: { kind: 1, createdAt: -1 }, name: 'kind_1_createdAt_-1' }],
}

export async function ensureCmsIndexes(collection: Pick<Collection, 'createIndex'>, kind: CmsCollectionKey) {
  await Promise.all(cmsIndexDefinitions[kind].map(({ key, ...options }) => collection.createIndex(key, options)))
}
