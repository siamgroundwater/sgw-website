import 'server-only'

import { getCmsOperationalEventsCollection, getCmsStagedProjectMediaCollection } from '@/server/db/collections'
import type { CmsOperationalEventDocument } from '@/server/db/types'

export async function recordCmsOperationalEvent(input: Omit<CmsOperationalEventDocument, '_id' | 'createdAt'>) {
  try {
    const collection = await getCmsOperationalEventsCollection()
    await collection.createIndex({ kind: 1, createdAt: -1 })
    await collection.insertOne({ ...input, error: input.error?.slice(0, 240), createdAt: new Date() })
  } catch (error) {
    console.error('Could not record CMS operational status', error)
  }
}

export async function getCmsOperationalStatus() {
  const events = await getCmsOperationalEventsCollection()
  const staged = await getCmsStagedProjectMediaCollection()
  const [lastCleanup, lastSuccessfulCleanup, recentFailures, expiredMediaCount] = await Promise.all([
    events.findOne({ kind: 'media-cleanup' }, { sort: { createdAt: -1 } }),
    events.findOne({ kind: 'media-cleanup', ok: true }, { sort: { createdAt: -1 } }),
    events.find({ ok: false }).sort({ createdAt: -1 }).limit(10).toArray(),
    staged.countDocuments({ expiresAt: { $lte: new Date() } }),
  ])
  return {
    lastCleanup: lastCleanup ? { ...lastCleanup, _id: undefined, createdAt: lastCleanup.createdAt.toISOString() } : null,
    lastSuccessfulCleanupAt: lastSuccessfulCleanup?.createdAt.toISOString() || null,
    cleanupOverdue: !lastSuccessfulCleanup || Date.now() - lastSuccessfulCleanup.createdAt.getTime() > 36 * 60 * 60 * 1000,
    expiredMediaCount,
    recentFailures: recentFailures.map((event) => ({ ...event, _id: undefined, createdAt: event.createdAt.toISOString() })),
  }
}
