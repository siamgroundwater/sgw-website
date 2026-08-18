import { NextResponse } from 'next/server'
import { requireCmsApiPermission } from '@/server/cms/guards'
import {
  readCmsJsonBody,
  requireJsonRequest,
  requireSameOrigin,
} from '@/server/cms/http'
import {
  getCmsMediaMaxUploadBytes,
  deleteCmsImages,
  uploadCmsImage,
} from '@/server/cloudinary/media'
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
  if (code.includes('Cloudinary environment variables')) {
    return NextResponse.json({ error: 'CMS media storage is not configured.' }, { status: 500 })
  }
  console.error('Staged project image upload failed', error)
  return NextResponse.json({ error: 'Could not upload the project image.' }, { status: 500 })
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 })
  const file = formData.get('file')
  const slug = formString(formData, 'slug') || undefined
  const submissionId = formString(formData, 'submissionId')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Select an image to upload.' }, { status: 400 })
  }
  if (!validSubmissionId(submissionId)) {
    return NextResponse.json({ error: 'Invalid project submission id.' }, { status: 400 })
  }

  try {
    const asset = await uploadCmsImage(file, 'projects', slug)
    try {
      await registerStagedProjectMedia(asset, submissionId, user.userId)
      const token = createStagedProjectMediaToken(asset, submissionId, user.userId)
      return NextResponse.json({ staged: { asset, token } }, { status: 201 })
    } catch (error) {
      await deleteCmsImages([asset.publicId]).catch((cleanupError) => {
        console.error('Could not remove an unregistered staged project image', cleanupError)
      })
      throw error
    }
  } catch (error) {
    return uploadError(error)
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.value as Record<string, unknown> | null

  try {
    const staged = await verifyStagedProjectMediaTokens(body?.tokens, body?.submissionId, user)
    const result = await rollbackStagedProjectMedia(staged)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
      return NextResponse.json({ error: 'Invalid or expired staged project media.' }, { status: 400 })
    }
    console.error('Could not roll back staged project media', error)
    return NextResponse.json({ error: 'Could not clean up staged project media.' }, { status: 500 })
  }
}
