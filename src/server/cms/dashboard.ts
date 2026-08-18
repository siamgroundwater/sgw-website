import 'server-only'

import {
  getCmsAuditLogsCollection,
  getCmsLearningCollection,
  getCmsProjectsCollection,
  getCmsServicesCollection,
  getCmsUsersCollection,
  pingMongo,
} from '@/server/db'

export async function getCmsDashboardData() {
  const [health, projects, services, learning, users, activity] = await Promise.all([
    pingMongo(),
    getCmsProjectsCollection(),
    getCmsServicesCollection(),
    getCmsLearningCollection(),
    getCmsUsersCollection(),
    getCmsAuditLogsCollection(),
  ])

  const activeFilter = { deletedAt: { $exists: false } }
  const [projectCount, serviceCount, learningCount, userCount, recent] = await Promise.all([
    projects.countDocuments(activeFilter),
    services.countDocuments(activeFilter),
    learning.countDocuments(activeFilter),
    users.countDocuments(activeFilter),
    activity.find({}).sort({ createdAt: -1 }).limit(8).toArray(),
  ])

  return {
    dbName: health.dbName,
    counts: {
      learning: learningCount,
      projects: projectCount,
      services: serviceCount,
      users: userCount,
    },
    recent: recent.map((row) => ({
      action: row.action,
      actor: row.actor.displayName,
      createdAt: row.createdAt.toISOString(),
      id: row._id?.toString() || '',
      summary: row.summary,
    })),
  }
}
