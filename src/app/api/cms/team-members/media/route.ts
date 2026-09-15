import { NextResponse } from 'next/server'
import {
  deleteCmsImages,
  getCmsMediaMaxUploadBytes,
  uploadCmsImage,
} from '@/server/cloudinary/media'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import {
  createStagedProjectMediaToken,
  registerStagedProjectMedia,
  rollbackStagedProjectMedia,
  verifyStagedProjectMediaTokens,
} from '@/server/cms/staged-project-media'

export const runtime = 'nodejs'

const mediaTarget = 'team-member'

function formString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function validSubmissionId(value: string) {
  return /^[A-Za-z0-9_-]{8,100}$/.test(value)
}

function uploadError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  if (code === 'UNSUPPORTED_IMAGE_TYPE') return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, GIF, or AVIF image.' }, { status: 415 })
  if (code === 'EMPTY_IMAGE') return NextResponse.json({ error: 'The selected image is empty.' }, { status: 400 })
  if (code === 'IMAGE_TOO_LARGE') {
    const maxMb = Math.floor(getCmsMediaMaxUploadBytes() / 1024 / 1024)
    return NextResponse.json({ error: `The image must be ${maxMb} MB or smaller.` }, { status: 413 })
  }
  if (code === 'INVALID_IMAGE_SIGNATURE') return NextResponse.json({ error: 'The file content does not match its image type.' }, { status: 400 })
  if (code === 'TEAM_PORTRAIT_RESOLUTION_TOO_LOW') return NextResponse.json({ error: 'The portrait must be at least 480 pixels wide and high.' }, { status: 400 })
  if (code === 'TEAM_PORTRAIT_ASPECT_RATIO_INVALID') return NextResponse.json({ error: 'Use a portrait or square image with an aspect ratio from 0.6 to 1.25.' }, { status: 400 })
  if (code.includes('Cloudinary environment variables')) return NextResponse.json({ error: 'CMS media storage is not configured.' }, { status: 500 })
  console.error('Staged team-member portrait upload failed', error)
  return NextResponse.json({ error: 'Could not upload the team-member portrait.' }, { status: 500 })
}

function validatePortraitAsset(asset: { height: number; width: number }) {
  if (Math.min(asset.width, asset.height) < 480) throw new Error('TEAM_PORTRAIT_RESOLUTION_TOO_LOW')
  const aspectRatio = asset.width / asset.height
  if (aspectRatio < 0.6 || aspectRatio > 1.25) throw new Error('TEAM_PORTRAIT_ASPECT_RATIO_INVALID')
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 })
  const file = formData.get('file')
  const submissionId = formString(formData, 'submissionId')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Select a portrait to upload.' }, { status: 400 })
  if (!validSubmissionId(submissionId)) return NextResponse.json({ error: 'Invalid team-member submission id.' }, { status: 400 })

  try {
    const asset = await uploadCmsImage(file, 'teams')
    const removeUploadedAssetOrQueueCleanup = async () => {
      try {
        const removed = await deleteCmsImages([asset.publicId])
        if (removed.includes(asset.publicId)) return
        console.error('Unregistered team portrait cleanup did not confirm Cloudinary deletion; queuing staged cleanup')
      } catch (cleanupError) {
        console.error('Unregistered team portrait cleanup failed; queuing staged cleanup', cleanupError)
      }
      try {
        await registerStagedProjectMedia(asset, submissionId, user.userId, mediaTarget)
      } catch (queueError) {
        console.error('Could not durably queue the unregistered team portrait for cleanup', queueError)
      }
    }
    let registered = false
    try {
      await registerStagedProjectMedia(asset, submissionId, user.userId, mediaTarget)
      registered = true
      validatePortraitAsset(asset)
      const token = createStagedProjectMediaToken(asset, submissionId, user.userId, mediaTarget)
      return NextResponse.json({ staged: { asset, token } }, { status: 201 })
    } catch (error) {
      if (registered) {
        const issuedAt = Date.now()
        await rollbackStagedProjectMedia([{
          asset,
          expiresAt: issuedAt + 30 * 60 * 1000,
          issuedAt,
          submissionId,
          target: mediaTarget,
          userId: user.userId,
        }]).catch((cleanupError) => {
          console.error('Could not roll back a rejected staged team portrait', cleanupError)
        })
      } else {
        await removeUploadedAssetOrQueueCleanup()
      }
      throw error
    }
  } catch (error) {
    return uploadError(error)
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.value as Record<string, unknown> | null
  try {
    const staged = await verifyStagedProjectMediaTokens(
      body?.tokens,
      body?.submissionId,
      user,
      undefined,
      mediaTarget
    )
    return NextResponse.json(await rollbackStagedProjectMedia(staged))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
      return NextResponse.json({ error: 'Invalid or expired staged team-member media.' }, { status: 400 })
    }
    console.error('Could not roll back staged team-member media', error)
    return NextResponse.json({ error: 'Could not clean up staged team-member media.' }, { status: 500 })
  }
}
