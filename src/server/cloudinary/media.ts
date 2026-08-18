import 'server-only'

import type { UploadApiOptions, UploadApiResponse } from 'cloudinary'
import { cmsMediaFolders, type CmsMediaAsset, type CmsMediaFolder } from '@/types/cms-media'
import { configureCloudinary, getCloudinaryRootFolder } from './config'

const allowedMimeTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const defaultMaxUploadSizeMb = 4
const absoluteMaxUploadSizeMb = 10

export function isCmsMediaFolder(value: string): value is CmsMediaFolder {
  return cmsMediaFolders.includes(value as CmsMediaFolder)
}

export function getCmsMediaMaxUploadBytes() {
  const configured = Number(process.env.CLOUDINARY_MAX_FILE_SIZE_MB ?? defaultMaxUploadSizeMb)
  const sizeMb = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, absoluteMaxUploadSizeMb)
    : defaultMaxUploadSizeMb
  return Math.floor(sizeMb * 1024 * 1024)
}

function normalizeFolderSegment(value: string) {
  return value
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function getCmsMediaFolder(folder: CmsMediaFolder, slug?: string) {
  const slugFolder = slug ? normalizeFolderSegment(slug) : ''
  return [getCloudinaryRootFolder(), folder, slugFolder].filter(Boolean).join('/')
}

export function isCmsOwnedMediaPublicId(publicId: string) {
  const root = getCloudinaryRootFolder()
  return publicId === root || publicId.startsWith(`${root}/`)
}

function hasBytes(buffer: Buffer, offset: number, bytes: number[]) {
  return bytes.every((byte, index) => buffer[offset + index] === byte)
}

function matchesFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') return hasBytes(buffer, 0, [0xff, 0xd8, 0xff])
  if (mimeType === 'image/png') return hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mimeType === 'image/gif') {
    const signature = buffer.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (mimeType === 'image/avif') {
    if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false
    const brands = buffer.subarray(8, 32).toString('ascii')
    return brands.includes('avif') || brands.includes('avis')
  }
  return false
}

export async function validateCmsImageFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error('UNSUPPORTED_IMAGE_TYPE')
  }
  if (file.size <= 0) throw new Error('EMPTY_IMAGE')
  if (file.size > getCmsMediaMaxUploadBytes()) throw new Error('IMAGE_TOO_LARGE')

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!matchesFileSignature(buffer, file.type)) {
    throw new Error('INVALID_IMAGE_SIGNATURE')
  }
  return buffer
}

function mapUploadResult(result: UploadApiResponse): CmsMediaAsset {
  return {
    bytes: result.bytes,
    createdAt: result.created_at,
    format: result.format,
    height: result.height,
    publicId: result.public_id,
    src: result.secure_url,
    width: result.width,
  }
}

export async function uploadCmsImage(file: File, folder: CmsMediaFolder, slug?: string) {
  const buffer = await validateCmsImageFile(file)
  const client = configureCloudinary()
  const options: UploadApiOptions = {
    folder: getCmsMediaFolder(folder, slug),
    overwrite: false,
    resource_type: 'image',
    tags: ['sgw', 'cms', folder],
    unique_filename: true,
    use_filename: true,
  }

  return new Promise<CmsMediaAsset>((resolve, reject) => {
    const stream = client.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error('Cloudinary upload failed.'))
        return
      }
      resolve(mapUploadResult(result))
    })
    stream.end(buffer)
  })
}

export async function deleteCmsImages(publicIds: string[]) {
  const uniqueIds = Array.from(new Set(publicIds.map((value) => value.trim()).filter(Boolean)))
  if (!uniqueIds.length) return []
  if (uniqueIds.some((publicId) => !isCmsOwnedMediaPublicId(publicId))) {
    throw new Error('REFUSED_NON_CMS_MEDIA_DELETE')
  }

  const client = configureCloudinary()
  const removed: string[] = []
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100)
    const result = await client.api.delete_resources(batch, {
      invalidate: true,
      resource_type: 'image',
      type: 'upload',
    }) as { deleted?: Record<string, string> }
    for (const publicId of batch) {
      const status = result.deleted?.[publicId]
      if (status === 'deleted' || status === 'not_found') removed.push(publicId)
    }
  }
  return removed
}
