import 'server-only'
import { ObjectId } from 'mongodb'

import { getCmsAuditLogsCollection, getCmsProjectsCollection, getCmsUsersCollection, pingMongo } from '@/server/db'
import { getCmsOperationalStatus } from './operations'

export async function getCmsDashboardData(includeOperations = false) {
  const [health, projects, users, activity] = await Promise.all([pingMongo(), getCmsProjectsCollection(), getCmsUsersCollection(), getCmsAuditLogsCollection()])
  const [active, removed, userCount, recentProjects, recent, operations] = await Promise.all([
    projects.countDocuments({ deletedAt: { $exists: false }, status: 'active' }),
    projects.countDocuments({ deletedAt: { $exists: true } }),
    includeOperations ? users.countDocuments({ deletedAt: { $exists: false }, status: 'active' }) : Promise.resolve(null),
    projects.find({ deletedAt: { $exists: false }, status: 'active' }, { projection: { title: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(5).toArray(),
    activity.find(includeOperations ? {} : { 'entity.type': 'project' }).sort({ createdAt: -1 }).limit(8).toArray(),
    includeOperations ? getCmsOperationalStatus() : Promise.resolve(null),
  ])
  const activityIds = recent.filter(row => row.entity.type === 'project' && ObjectId.isValid(row.entity.id)).map(row => new ObjectId(row.entity.id))
  const available = new Set((await projects.find({ _id: { $in: activityIds }, status: 'active', deletedAt: { $exists: false } }, { projection: { _id: 1 } }).toArray()).map(row => String(row._id)))
  return {
    dbName: health.dbName, active, removed, userCount, operations,
    recentProjects: recentProjects.map(row => ({ id: String(row._id), title: row.title, updatedAt: row.updatedAt.toISOString() })),
    recent: recent.map(row => ({ action: row.action, actor: row.actor.displayName, createdAt: row.createdAt.toISOString(), id: String(row._id), summary: row.summary, entityId: row.entity.id, entityLabel: row.entity.label || '', entityType: row.entity.type, available: available.has(row.entity.id) })),
  }
}
