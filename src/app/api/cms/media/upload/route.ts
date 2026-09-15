import { NextResponse } from 'next/server'
import {
  isSiteMediaSectionKey,
  siteMediaUploadTarget,
} from '@/lib/site-media'
import {
  deleteCmsImages,
  getCmsMediaMaxUploadBytes,
  uploadCmsImage,
} from '@/server/cloudinary/media'
import { requireCmsApiPermission } from '@/server/cms/guards'
import {
  readCmsJsonBody,
  requireJsonRequest,
  requireSameOrigin,
} from '@/server/cms/http'
import {
  createStagedProjectMediaToken,
  registerStagedProjectMedia,
  rollbackStagedProjectMedia,
  verifyStagedProjectMediaTokens,
} from '@/server/cms/staged-project-media'

export const runtime = 'nodejs'

function formString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function validSubmissionId(value: string) {
  return /^[A-Za-z0-9_-]{8,100}$/.test(value)
}

function uploadError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  if (code === 'UNSUPPORTED_IMAGE_TYPE') {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, GIF, or AVIF image.' }, { status: 415 })
  }
  if (code === 'EMPTY_IMAGE') {
    return NextResponse.json({ error: 'The selected image is empty.' }, { status: 400 })
  }
  if (code === 'IMAGE_TOO_LARGE') {
    const maxMb = Math.floor(getCmsMediaMaxUploadBytes() / 1024 / 1024)
    return NextResponse.json({ error: `The image must be ${maxMb} MB or smaller.` }, { status: 413 })
  }
  if (code === 'INVALID_IMAGE_SIGNATURE') {
    return NextResponse.json({ error: 'The file content does not match its image type.' }, { status: 400 })
  }
  if (code === 'SITE_MEDIA_RESOLUTION_TOO_LOW') {
    return NextResponse.json({ error: 'Use a high-resolution image at least 1,000 px wide with a 2,000 px longest edge.' }, { status: 400 })
  }
  if (code === 'SITE_MEDIA_ASPECT_RATIO_INVALID') {
    return NextResponse.json({ error: 'Use a portrait image with proportions similar to the current map or poster.' }, { status: 400 })
  }
  if (code.includes('Cloudinary environment variables')) {
    return NextResponse.json({ error: 'CMS media storage is not configured.' }, { status: 500 })
  }
  console.error('Staged website image upload failed', error)
  return NextResponse.json({ error: 'Could not upload the website image.' }, { status: 500 })
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('media:write')
  if (response || !user) return response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 })
  const file = formData.get('file')
  const section = formString(formData, 'section')
  const submissionId = formString(formData, 'submissionId')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Select an image to upload.' }, { status: 400 })
  }
  if (!isSiteMediaSectionKey(section) || !validSubmissionId(submissionId)) {
    return NextResponse.json({ error: 'Invalid website-media upload.' }, { status: 400 })
  }

  const target = siteMediaUploadTarget(section)
  const folder = section.startsWith('service-') ? 'services' : 'site'
  try {
    const asset = await uploadCmsImage(file, folder, section)
    const removeUploadedAssetOrQueueCleanup = async (reason: string) => {
      try {
        const removed = await deleteCmsImages([asset.publicId])
        if (removed.includes(asset.publicId)) return
        console.error(`${reason} cleanup did not confirm Cloudinary deletion; queuing staged cleanup`)
      } catch (cleanupError) {
        console.error(`${reason} cleanup failed; queuing staged cleanup`, cleanupError)
      }
      try {
        await registerStagedProjectMedia(asset, submissionId, user.userId, target)
      } catch (queueError) {
        console.error('Could not durably queue website image for cleanup', queueError)
      }
    }
    const rejectUploadedAsset = async (code: string) => {
      await removeUploadedAssetOrQueueCleanup('Immediate rejected-image')
      throw new Error(code)
    }
    if (
      (section === 'project-map' || section === 'governance') &&
      (Math.min(asset.width, asset.height) < 1000 || Math.max(asset.width, asset.height) < 2000)
    ) {
      await rejectUploadedAsset('SITE_MEDIA_RESOLUTION_TOO_LOW')
    }
    if (section === 'project-map' || section === 'governance') {
      const portraitRatio = Math.min(asset.width, asset.height) / Math.max(asset.width, asset.height)
      if (asset.height <= asset.width || portraitRatio < 0.62 || portraitRatio > 0.78) {
        await rejectUploadedAsset('SITE_MEDIA_ASPECT_RATIO_INVALID')
      }
    }
    try {
      await registerStagedProjectMedia(asset, submissionId, user.userId, target)
      const token = createStagedProjectMediaToken(asset, submissionId, user.userId, target)
      return NextResponse.json({ staged: { asset, token } }, { status: 201 })
    } catch (error) {
      await removeUploadedAssetOrQueueCleanup('Unregistered website image')
      throw error
    }
  } catch (error) {
    return uploadError(error)
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('media:write')
  if (response || !user) return response
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.value as Record<string, unknown> | null
  const section = body?.section
  if (!isSiteMediaSectionKey(section)) {
    return NextResponse.json({ error: 'Invalid media section.' }, { status: 400 })
  }

  try {
    const staged = await verifyStagedProjectMediaTokens(
      body?.tokens,
      body?.submissionId,
      user,
      undefined,
      siteMediaUploadTarget(section)
    )
    const result = await rollbackStagedProjectMedia(staged)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
      return NextResponse.json({ error: 'Invalid or expired staged website media.' }, { status: 400 })
    }
    console.error('Could not roll back staged website media', error)
    return NextResponse.json({ error: 'Could not clean up staged website media.' }, { status: 500 })
  }
}
