import 'server-only'

import {
  getCmsAuditLogsCollection,
  pingMongo,
} from '@/server/db'

export async function getCmsDashboardData() {
  const [health, activity] = await Promise.all([
    pingMongo(),
    getCmsAuditLogsCollection(),
  ])

  const recent = await activity.find({}).sort({ createdAt: -1 }).limit(8).toArray()

  return {
    dbName: health.dbName,
    recent: recent.map((row) => ({
      action: row.action,
      actor: row.actor.displayName,
      createdAt: row.createdAt.toISOString(),
      id: row._id?.toString() || '',
      summary: row.summary,
    })),
  }
}
