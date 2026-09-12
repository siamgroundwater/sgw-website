import 'server-only'

import type { CmsAuditActor } from './audit'
import type { CmsStagedMediaTokenPayload } from '@/lib/cms-staged-media-token'
import {
  createCmsStagedMediaTokenValue,
  verifyCmsStagedMediaTokenValue,
} from '@/lib/cms-staged-media-token'
import { deleteCmsImages, isCmsOwnedMediaPublicId } from '@/server/cloudinary/media'
import { getCmsProjectMediaUrlsInUse } from './content'
import { getCmsStagedProjectMediaCollection } from '@/server/db'
import type { CmsMediaAsset } from '@/types/cms-media'
import type { ClientSession } from 'mongodb'
import { recordCmsOperationalEvent } from './operations'

const stagedMediaMaxAgeSeconds = 30 * 60
let stagedIndexPromise: Promise<void> | null = null

async function ensureStagedMediaIndexes() {
  if (!stagedIndexPromise) {
    stagedIndexPromise = (async () => {
      const collection = await getCmsStagedProjectMediaCollection()
      await Promise.all([
        collection.createIndex({ expiresAt: 1 }),
        collection.createIndex({ 'asset.publicId': 1 }, { unique: true }),
        collection.createIndex({ submissionId: 1, userId: 1 }),
      ])
    })().catch((error) => {
      stagedIndexPromise = null
      throw error
    })
  }
  await stagedIndexPromise
}

function getSecret() {
  const secret = process.env.CMS_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32 || secret.toLowerCase().startsWith('replace-with')) {
    throw new Error('CMS_SESSION_SECRET must contain at least 32 characters.')
  }
  return secret
}

export function createStagedProjectMediaToken(
  asset: CmsMediaAsset,
  submissionId: string,
  userId: string
) {
  return createCmsStagedMediaTokenValue(
    { asset, submissionId, userId },
    getSecret(),
    Date.now(),
    stagedMediaMaxAgeSeconds
  )
}

export async function registerStagedProjectMedia(
  asset: CmsMediaAsset,
  submissionId: string,
  userId: string
) {
  await ensureStagedMediaIndexes()
  const collection = await getCmsStagedProjectMediaCollection()
  const createdAt = new Date()
  await collection.insertOne({
    asset,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + stagedMediaMaxAgeSeconds * 1000),
    submissionId,
    userId,
  })
}

export async function verifyStagedProjectMediaTokens(
  tokens: unknown,
  submissionId: unknown,
  user: CmsAuditActor,
  session?: ClientSession
) {
  await ensureStagedMediaIndexes()
  if (tokens === undefined && submissionId === undefined) return []
  if (!Array.isArray(tokens) || tokens.length > 13 || typeof submissionId !== 'string') {
    throw new Error('INVALID_STAGED_MEDIA')
  }
  const payloads = tokens.map((token) =>
    verifyCmsStagedMediaTokenValue(
      typeof token === 'string' ? token : undefined,
      getSecret()
    )
  )
  if (payloads.some((payload) =>
    !payload ||
    payload.userId !== user.userId ||
    payload.submissionId !== submissionId ||
    !isCmsOwnedMediaPublicId(payload.asset.publicId)
  )) {
    throw new Error('INVALID_STAGED_MEDIA')
  }
  const verified = payloads as CmsStagedMediaTokenPayload[]
  if (new Set(verified.map(({ asset }) => asset.publicId)).size !== verified.length) {
    throw new Error('INVALID_STAGED_MEDIA')
  }
  if (verified.length) {
    const collection = await getCmsStagedProjectMediaCollection()
    const registered = await collection.countDocuments({
      'asset.publicId': { $in: verified.map(({ asset }) => asset.publicId) },
      expiresAt: { $gt: new Date() },
      submissionId,
      userId: user.userId,
      cleanupClaimedAt: { $exists: false },
    }, { session })
    if (registered !== verified.length) throw new Error('INVALID_STAGED_MEDIA')
  }
  return verified
}

export async function commitStagedProjectMedia(payloads: CmsStagedMediaTokenPayload[], session?: ClientSession) {
  if (!payloads.length) return
  await ensureStagedMediaIndexes()
  const result = await (await getCmsStagedProjectMediaCollection()).deleteMany({
    'asset.publicId': { $in: payloads.map(({ asset }) => asset.publicId) },
    cleanupClaimedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }, { session })
  if (result.deletedCount !== payloads.length) throw new Error('INVALID_STAGED_MEDIA')
}

export async function rollbackStagedProjectMedia(payloads: CmsStagedMediaTokenPayload[]) {
  if (!payloads.length) return { preserved: [], removed: [] }
  await ensureStagedMediaIndexes()
  const collection = await getCmsStagedProjectMediaCollection()
  const claimed = []
  for (const payload of payloads) {
    const row = await collection.findOneAndUpdate({
      'asset.publicId': payload.asset.publicId,
      userId: payload.userId,
      submissionId: payload.submissionId,
      cleanupClaimedAt: { $exists: false },
    }, { $set: { cleanupClaimedAt: new Date() } }, { returnDocument: 'after' })
    if (row) claimed.push(payload)
  }
  const inUse = await getCmsProjectMediaUrlsInUse(claimed.map(({ asset }) => asset.src))
  const removable = claimed.filter(({ asset }) => !inUse.has(asset.src))
  const removed = await deleteCmsImages(removable.map(({ asset }) => asset.publicId))
  const finished = new Set([
    ...removed,
    ...claimed.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId),
  ])
  if (finished.size) {
    await (await getCmsStagedProjectMediaCollection()).deleteMany({
      'asset.publicId': { $in: Array.from(finished) },
    })
  }
  return {
    preserved: claimed.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId),
    removed,
  }
}

export async function cleanupExpiredStagedProjectMedia(limit = 200) {
  await ensureStagedMediaIndexes()
  const collection = await getCmsStagedProjectMediaCollection()
  const now = new Date()
  const retryBefore = new Date(now.getTime() - 15 * 60 * 1000)
  const eligible = {
    expiresAt: { $lte: now },
    $or: [{ cleanupClaimedAt: { $exists: false } }, { cleanupClaimedAt: { $lte: retryBefore } }],
  }
  let checked = 0
  let preserved = 0
  let removed = 0
  try {
    const rows = await collection.find(eligible).sort({ expiresAt: 1 }).limit(Math.max(1, Math.min(limit, 500))).toArray()
    const claimed = []
    for (const row of rows) {
      const item = await collection.findOneAndUpdate(
        { _id: row._id, ...eligible },
        { $set: { cleanupClaimedAt: now } },
        { returnDocument: 'after' }
      )
      if (item) claimed.push(item)
    }
    checked = claimed.length
    const inUse = await getCmsProjectMediaUrlsInUse(claimed.map(({ asset }) => asset.src))
    const removable = claimed.filter(({ asset }) => !inUse.has(asset.src))
    const removedIds = await deleteCmsImages(removable.map(({ asset }) => asset.publicId))
    const preservedIds = claimed.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId)
    removed = removedIds.length
    preserved = preservedIds.length
    const finished = [...removedIds, ...preservedIds]
    if (finished.length) await collection.deleteMany({ 'asset.publicId': { $in: finished }, cleanupClaimedAt: now })
    const remaining = await collection.countDocuments({ expiresAt: { $lte: new Date() } })
    const counts = { checked, preserved, removed, failed: checked - preserved - removed, remaining }
    await recordCmsOperationalEvent({ kind: 'media-cleanup', ok: counts.failed === 0, counts })
    return counts
  } catch (error) {
    await recordCmsOperationalEvent({
      kind: 'media-cleanup', ok: false,
      error: 'Media cleanup could not finish. Inspect the server logs and retry.',
    })
    throw error
  }
}
