import 'server-only'
import { ObjectId, type Filter } from 'mongodb'
import { cmsAuditDateRange, type CmsAuditFilters } from '@/lib/cms-audit'
import { recordCmsOperationalEvent } from './operations'

import { getCmsAuditLogsCollection, getCmsProjectsCollection } from '@/server/db'
import type {
  CmsAuditAction,
  CmsAuditChange,
  CmsAuditLogDocument,
  CmsAuditScalar,
  CmsContentType,
  CmsUserRole,
} from '@/server/db'

const retentionDays = 365
const retentionMs = retentionDays * 24 * 60 * 60 * 1000
const maxTextLength = 240
let indexPromise: Promise<void> | null = null

export type CmsAuditActor = {
  displayName: string
  role: CmsUserRole
  userId: string
  username: string
}

function truncate(value: string) {
  const clean = value.trim()
  return clean.length > maxTextLength ? `${clean.slice(0, maxTextLength - 3)}...` : clean
}

function scalar(value: unknown): CmsAuditScalar {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return truncate(value)
  if (Array.isArray(value)) {
    return value.every((item) => ['boolean', 'number', 'string'].includes(typeof item))
      ? truncate(value.join(' · '))
      : `${value.length} item${value.length === 1 ? '' : 's'}`
  }
  return 'Changed'
}

export function createAuditChanges(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  labels: Record<string, string>
) {
  const changes: CmsAuditChange[] = []
  for (const [field, label] of Object.entries(labels)) {
    const previous = scalar(before?.[field])
    const next = scalar(after?.[field])
    if (previous !== next) changes.push({ before: previous, after: next, field: label })
  }
  return changes
}

async function ensureIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const logs = await getCmsAuditLogsCollection()
      await Promise.all([
        logs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        logs.createIndex({ createdAt: -1 }),
        logs.createIndex({ 'entity.type': 1, createdAt: -1 }),
      ])
    })().catch(error => { indexPromise = null; throw error })
  }
  await indexPromise
}

export async function recordCmsAudit(input: {
  action: CmsAuditAction
  actor: CmsAuditActor
  changes?: CmsAuditChange[]
  entity: { id: string; label?: string; type: CmsContentType | 'user' | 'import' | 'media' }
  metadata?: Record<string, unknown>
  summary: string
}) {
  try {
    await ensureIndexes()
    const logs = await getCmsAuditLogsCollection()
    const now = new Date()
    await logs.insertOne({
      action: input.action,
      actor: {
        displayName: truncate(input.actor.displayName),
        role: input.actor.role,
        userId: truncate(input.actor.userId),
        username: truncate(input.actor.username),
      },
      changes: input.changes?.slice(0, 30),
      createdAt: now,
      entity: {
        id: truncate(input.entity.id),
        label: input.entity.label ? truncate(input.entity.label) : undefined,
        type: input.entity.type,
      },
      expiresAt: new Date(now.getTime() + retentionMs),
      metadata: input.metadata
        ? Object.fromEntries(
            Object.entries(input.metadata)
              .slice(0, 20)
              .map(([key, value]) => [key, scalar(value)])
          )
        : undefined,
      summary: truncate(input.summary),
    })
  } catch (error) {
    console.error('Could not write CMS audit log', error)
    await recordCmsOperationalEvent({ kind: 'audit-write', ok: false, error: 'The content change succeeded but its activity log could not be recorded.' })
  }
}

export async function listCmsAuditLogs(limit = 100) {
  await ensureIndexes()
  const logs = await getCmsAuditLogsCollection()
  const rows = await logs.find({}).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).toArray()
  return rows.map((row) => ({
    action: row.action,
    actor: row.actor,
    changes: row.changes || [],
    createdAt: row.createdAt.toISOString(),
    entity: row.entity,
    id: row._id?.toString() || '',
    summary: row.summary,
  }))
}

export async function searchCmsAuditLogs(filters: CmsAuditFilters) {
  const collection = await getCmsAuditLogsCollection()
  const clauses: Filter<CmsAuditLogDocument>[] = [{ expiresAt: { $gt: new Date() } }]
  const literal = (value: string) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.actor) clauses.push({ $or: [{ 'actor.displayName': literal(filters.actor) }, { 'actor.username': literal(filters.actor) }] })
  if (filters.project) clauses.push({ 'entity.type': 'project', $or: [{ 'entity.label': literal(filters.project) }, { 'entity.id': filters.project }] })
  if (filters.action) clauses.push({ action: filters.action })
  if (filters.from || filters.to) clauses.push({ createdAt: cmsAuditDateRange(filters) })
  const query: Filter<CmsAuditLogDocument> = { $and: clauses }
  const pageSize = 25
  const total = await collection.countDocuments(query)
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(filters.page, pages)
  const rows = await collection.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray()
  const projectIds = [...new Set(rows.filter((row) => row.entity.type === 'project' && /^[a-f\d]{24}$/i.test(row.entity.id)).map((row) => row.entity.id))]
  const availableProjects = projectIds.length
    ? await (await getCmsProjectsCollection()).find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) }, deletedAt: { $exists: false } }, { projection: { _id: 1 } }).toArray()
    : []
  const availableIds = new Set(availableProjects.map((project) => String(project._id)))
  return {
    page, pages, total,
    logs: rows.map((row) => ({ action: row.action, actor: row.actor, changes: row.changes || [], createdAt: row.createdAt.toISOString(), entity: row.entity, id: row._id?.toString() || '', summary: row.summary, projectHref: row.entity.type === 'project' && availableIds.has(row.entity.id) ? `/cms/projects/${row.entity.id}` : null })),
  }
}
