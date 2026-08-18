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
    })()
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
  user: CmsAuditActor
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
    })
    if (registered !== verified.length) throw new Error('INVALID_STAGED_MEDIA')
  }
  return verified
}

export async function commitStagedProjectMedia(payloads: CmsStagedMediaTokenPayload[]) {
  if (!payloads.length) return
  await ensureStagedMediaIndexes()
  await (await getCmsStagedProjectMediaCollection()).deleteMany({
    'asset.publicId': { $in: payloads.map(({ asset }) => asset.publicId) },
  })
}

export async function rollbackStagedProjectMedia(payloads: CmsStagedMediaTokenPayload[]) {
  if (!payloads.length) return { preserved: [], removed: [] }
  await ensureStagedMediaIndexes()
  const inUse = await getCmsProjectMediaUrlsInUse(payloads.map(({ asset }) => asset.src))
  const removable = payloads.filter(({ asset }) => !inUse.has(asset.src))
  const removed = await deleteCmsImages(removable.map(({ asset }) => asset.publicId))
  const finished = new Set([
    ...removed,
    ...payloads.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId),
  ])
  if (finished.size) {
    await (await getCmsStagedProjectMediaCollection()).deleteMany({
      'asset.publicId': { $in: Array.from(finished) },
    })
  }
  return {
    preserved: payloads.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId),
    removed,
  }
}

export async function cleanupExpiredStagedProjectMedia(limit = 200) {
  await ensureStagedMediaIndexes()
  const collection = await getCmsStagedProjectMediaCollection()
  const rows = await collection.find({ expiresAt: { $lte: new Date() } }).sort({ expiresAt: 1 }).limit(Math.min(limit, 500)).toArray()
  if (!rows.length) return { checked: 0, preserved: 0, removed: 0 }
  const inUse = await getCmsProjectMediaUrlsInUse(rows.map(({ asset }) => asset.src))
  const removable = rows.filter(({ asset }) => !inUse.has(asset.src))
  const removed = await deleteCmsImages(removable.map(({ asset }) => asset.publicId))
  const finished = new Set([
    ...removed,
    ...rows.filter(({ asset }) => inUse.has(asset.src)).map(({ asset }) => asset.publicId),
  ])
  if (finished.size) {
    await collection.deleteMany({ 'asset.publicId': { $in: Array.from(finished) } })
  }
  return {
    checked: rows.length,
    preserved: rows.filter(({ asset }) => inUse.has(asset.src)).length,
    removed: removed.length,
  }
}
