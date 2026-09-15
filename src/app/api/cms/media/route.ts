import { NextResponse } from 'next/server'
import type { ClientSession } from 'mongodb'
import {
  isSiteMediaSectionKey,
  siteMediaFallbacks,
  siteMediaUploadTarget,
} from '@/lib/site-media'
import type { CmsStagedMediaTokenPayload } from '@/lib/cms-staged-media-token'
import { recordCmsAudit } from '@/server/cms/audit'
import { CmsContentError } from '@/server/cms/content'
import { requireCmsApiPermission } from '@/server/cms/guards'
import {
  readCmsJsonBody,
  requireJsonRequest,
  requireSameOrigin,
} from '@/server/cms/http'
import { revalidatePublicSiteMedia } from '@/server/cms/revalidate'
import {
  getCmsSiteMediaDocument,
  getCmsSiteMediaSection,
  saveCmsSiteMediaSection,
  validateSiteMediaImageList,
} from '@/server/cms/site-media'
import {
  commitStagedProjectMedia,
  rollbackStagedProjectMedia,
  verifyStagedProjectMediaTokens,
} from '@/server/cms/staged-project-media'
import { getMongoClient } from '@/server/db'
import type { CmsSiteMediaDocument, CmsSiteMediaItem } from '@/server/db'

export const runtime = 'nodejs'

function errorResponse(error: unknown, mediaCleanupFailed = false) {
  if (error instanceof CmsContentError) {
    return NextResponse.json(
      { error: error.message, mediaCleanupFailed },
      { status: error.status }
    )
  }
  if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
    return NextResponse.json(
      {
        error: 'The uploaded images expired or cleanup already started. Select them again before saving.',
        mediaCleanupFailed,
      },
      { status: 400 }
    )
  }
  console.error('Could not save website images', error)
  return NextResponse.json(
    { error: 'Could not save website images.', mediaCleanupFailed },
    { status: 500 }
  )
}

function assertAllowedImages(
  images: string[],
  staged: CmsStagedMediaTokenPayload[],
  current: CmsSiteMediaDocument | null,
  section: keyof typeof siteMediaFallbacks
) {
  const used = new Set(images)
  if (staged.some(({ asset }) => !used.has(asset.src))) {
    throw new CmsContentError('An uploaded image is missing from this save.', 400)
  }
  const allowed = new Set([
    ...siteMediaFallbacks[section],
    ...(current?.images.map(({ src }) => src) || []),
    ...staged.map(({ asset }) => asset.src),
  ])
  if (images.some((src) => !allowed.has(src))) {
    throw new CmsContentError('Select images through this editor before saving.', 400)
  }
}

function buildStoredItems(
  images: string[],
  staged: CmsStagedMediaTokenPayload[],
  current: CmsSiteMediaDocument | null
) {
  const uploaded = new Map(staged.map(({ asset }) => [asset.src, asset]))
  const existing = new Map(current?.images.map((item) => [item.src, item]) || [])
  return images.map<CmsSiteMediaItem>((src) => {
    const asset = uploaded.get(src)
    if (asset) return { asset, src }
    return existing.get(src) || { src }
  })
}

async function rollback(staged: CmsStagedMediaTokenPayload[]) {
  try {
    await rollbackStagedProjectMedia(staged)
    return false
  } catch (error) {
    console.error('Could not clean up rejected website images', error)
    return true
  }
}

async function writeSection(
  section: keyof typeof siteMediaFallbacks,
  images: string[],
  staged: CmsStagedMediaTokenPayload[],
  expectedUpdatedAt: unknown,
  userId: string,
  session: ClientSession
) {
  const current = await getCmsSiteMediaDocument(section, session)
  assertAllowedImages(images, staged, current, section)
  const items = buildStoredItems(images, staged, current)
  await commitStagedProjectMedia(staged, session)
  return saveCmsSiteMediaSection(
    section,
    items,
    expectedUpdatedAt,
    userId,
    session
  )
}

export async function GET(request: Request) {
  const { response, user } = await requireCmsApiPermission('media:view')
  if (response || !user) return response
  const section = new URL(request.url).searchParams.get('section')
  if (!isSiteMediaSectionKey(section)) {
    return NextResponse.json({ error: 'Invalid media section.' }, { status: 400 })
  }
  try {
    return NextResponse.json(
      { item: await getCmsSiteMediaSection(section) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('media:write')
  if (response || !user) return response
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.value
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid website-media data.' }, { status: 400 })
  }
  const raw = body as Record<string, unknown>
  const section = raw.section
  if (!isSiteMediaSectionKey(section)) {
    return NextResponse.json({ error: 'Invalid media section.' }, { status: 400 })
  }

  let staged: CmsStagedMediaTokenPayload[] = []
  let images: string[] = []
  let startedWrite = false
  try {
    staged = await verifyStagedProjectMediaTokens(
      raw.stagedMedia,
      raw.submissionId,
      user,
      undefined,
      siteMediaUploadTarget(section)
    )
    images = validateSiteMediaImageList(section, raw.images).images
    const session = (await getMongoClient()).startSession()
    let saved
    try {
      startedWrite = true
      saved = await session.withTransaction(
        async () => {
          staged = await verifyStagedProjectMediaTokens(
            raw.stagedMedia,
            raw.submissionId,
            user,
            session,
            siteMediaUploadTarget(section)
          )
          return writeSection(
            section,
            images,
            staged,
            raw.expectedUpdatedAt,
            user.userId,
            session
          )
        },
        {
          maxCommitTimeMS: 10000,
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        }
      )
    } finally {
      await session.endSession()
    }
    if (!saved) throw new Error('Website-media save returned no result.')

    await recordCmsAudit({
      action: 'content.update',
      actor: user,
      entity: { id: section, label: section, type: 'media' },
      metadata: { imageCount: images.length },
      summary: `Updated website images for ${section}`,
    })
    for (const { asset } of staged) {
      await recordCmsAudit({
        action: 'media.upload',
        actor: user,
        entity: { id: asset.publicId, type: 'media' },
        metadata: { bytes: asset.bytes, height: asset.height, width: asset.width },
        summary: `Uploaded a website image for ${section}`,
      })
    }
    revalidatePublicSiteMedia(section)
    return NextResponse.json({ item: saved })
  } catch (error) {
    if (error instanceof CmsContentError || (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') || !startedWrite) {
      return errorResponse(error, staged.length ? await rollback(staged) : false)
    }

    // A transaction error can happen after MongoDB committed but before the
    // driver received confirmation. Reconcile before deciding whether cleanup
    // is safe, so a committed image is never deleted.
    try {
      const current = await getCmsSiteMediaDocument(section)
      const currentImages = current?.images.map(({ src }) => src) || []
      const currentUrls = new Set(currentImages)
      const savedRequestedImages =
        currentImages.length === images.length &&
        currentImages.every((src, index) => src === images[index])
      if (savedRequestedImages) {
        revalidatePublicSiteMedia(section)
        return NextResponse.json({
          item: await getCmsSiteMediaSection(section),
          recovered: true,
        })
      }
      if (staged.every(({ asset }) => !currentUrls.has(asset.src))) {
        return errorResponse(error, staged.length ? await rollback(staged) : false)
      }
    } catch (reconcileError) {
      console.error('Could not reconcile website-media save', reconcileError)
    }
    return NextResponse.json(
      {
        error: 'The save result could not be confirmed. Reload this page before trying again.',
        pending: true,
      },
      { status: 503 }
    )
  }
}
