import { NextResponse } from 'next/server'
import { recordCmsAudit } from '@/server/cms/audit'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { requireSameOrigin } from '@/server/cms/http'
import {
  getCmsMediaMaxUploadBytes,
  isCmsMediaFolder,
  uploadCmsImage,
} from '@/server/cloudinary/media'

export const runtime = 'nodejs'

function isUploadFile(value: unknown): value is File {
  return value instanceof File
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
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
  console.error('Cloudinary CMS image upload failed', error)
  return NextResponse.json({ error: 'Could not upload the image.' }, { status: 500 })
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const { response, user } = await requireCmsApiPermission('media:write')
  if (response || !user) return response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 })

  const file = formData.get('file')
  const folder = getFormString(formData, 'folder')
  const slug = getFormString(formData, 'slug') || undefined

  if (!isUploadFile(file)) {
    return NextResponse.json({ error: 'Select an image to upload.' }, { status: 400 })
  }
  if (!isCmsMediaFolder(folder)) {
    return NextResponse.json({ error: 'Invalid CMS media folder.' }, { status: 400 })
  }

  try {
    const asset = await uploadCmsImage(file, folder, slug)
    await recordCmsAudit({
      action: 'media.upload',
      actor: user,
      entity: {
        id: asset.publicId,
        label: file.name,
        type: 'media',
      },
      metadata: {
        bytes: asset.bytes,
        folder,
        format: asset.format,
        height: asset.height,
        slug: slug || '',
        width: asset.width,
      },
      summary: `Uploaded CMS image ${file.name}`,
    })
    return NextResponse.json({ asset })
  } catch (error) {
    return uploadError(error)
  }
}
