export type PreparedClientImage = {
  file: File
  id: string
  originalName: string
  originalBytes: number
  previewUrl: string
}

const acceptedTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const targetBytes = 3 * 1024 * 1024
const highResolutionTargetBytes = 3.5 * 1024 * 1024
const preservedImageLimitBytes = 3.5 * 1024 * 1024
const longestEdge = 2200
const highResolutionLongestEdge = 5000

export type CmsImageCompressionProfile = 'standard' | 'high-resolution' | 'portrait'

export type CmsImageCompressionOptions = {
  onProgress?: (progress: number) => void
  profile?: CmsImageCompressionProfile
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('IMAGE_COMPRESSION_FAILED')),
      'image/webp',
      quality
    )
  })
}

function outputName(name: string) {
  const stem = name.replace(/\.[^.]+$/, '').trim() || 'project-image'
  return `${stem}.webp`
}

export async function prepareCmsImage(
  file: File,
  options: CmsImageCompressionOptions = {}
): Promise<PreparedClientImage> {
  const profile = options.profile || 'standard'
  let lastProgress = 0
  const progress = (value: number) => {
    const next = Math.max(lastProgress, Math.min(100, Math.round(value)))
    lastProgress = next
    options.onProgress?.(next)
  }

  progress(2)
  if (!acceptedTypes.has(file.type)) throw new Error('UNSUPPORTED_IMAGE_TYPE')
  if (!file.size) throw new Error('EMPTY_IMAGE')
  progress(8)

  if (file.type === 'image/gif' && profile === 'standard' && file.size > preservedImageLimitBytes) {
    throw new Error('ANIMATED_IMAGE_TOO_LARGE')
  }

  // Standard images preserve GIF animation. High-resolution CMS images still
  // decode first so an oversized map/poster cannot bypass its dimension limit.
  if (file.type === 'image/gif' && profile === 'standard') {
    progress(100)
    return {
      file,
      id: crypto.randomUUID(),
      originalName: file.name,
      originalBytes: file.size,
      previewUrl: URL.createObjectURL(file),
    }
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    progress(20)
    const edgeLimit = profile === 'high-resolution' ? highResolutionLongestEdge : longestEdge
    const sizeTarget = profile === 'high-resolution' ? highResolutionTargetBytes : targetBytes
    const sourceLongestEdge = Math.max(bitmap.width, bitmap.height)
    const sourceShortestEdge = Math.min(bitmap.width, bitmap.height)
    const sourceFitsDimensions = sourceLongestEdge <= edgeLimit

    if (profile === 'high-resolution') {
      if (sourceShortestEdge < 1000 || sourceLongestEdge < 2000) {
        throw new Error('SITE_MEDIA_RESOLUTION_TOO_LOW')
      }
      const portraitRatio = sourceShortestEdge / sourceLongestEdge
      if (bitmap.height <= bitmap.width || portraitRatio < 0.62 || portraitRatio > 0.78) {
        throw new Error('SITE_MEDIA_ASPECT_RATIO_INVALID')
      }
    }
    if (profile === 'portrait') {
      if (sourceShortestEdge < 480) throw new Error('TEAM_PORTRAIT_RESOLUTION_TOO_LOW')
      const aspectRatio = bitmap.width / bitmap.height
      if (aspectRatio < 0.6 || aspectRatio > 1.25) throw new Error('TEAM_PORTRAIT_ASPECT_RATIO_INVALID')
    }

    // Avoid needless re-encoding of an already optimized high-resolution
    // source, but only after it has been decoded and its dimensions verified.
    if (profile === 'high-resolution' && file.size <= sizeTarget && sourceFitsDimensions) {
      progress(100)
      return {
        file,
        id: crypto.randomUUID(),
        originalName: file.name,
        originalBytes: file.size,
        previewUrl: URL.createObjectURL(file),
      }
    }

    const initialScale = Math.min(1, edgeLimit / sourceLongestEdge)
    const minimumScale = profile === 'high-resolution'
      ? Math.max(1000 / sourceShortestEdge, 2000 / sourceLongestEdge)
      : profile === 'portrait' ? 480 / sourceShortestEdge : 0
    let scale = initialScale
    let quality = profile === 'high-resolution' ? 0.9 : 0.84
    let best: Blob | null = null

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d', { alpha: true })
      if (!context) throw new Error('IMAGE_COMPRESSION_FAILED')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      progress(25 + attempt * 8)
      const blob = await canvasBlob(canvas, quality)
      progress(31 + attempt * 8)
      if (!best || blob.size < best.size) best = blob
      if (blob.size <= sizeTarget) break
      scale = profile === 'high-resolution' || profile === 'portrait'
        ? Math.max(minimumScale, scale * 0.82)
        : scale * 0.82
      quality = Math.max(profile === 'high-resolution' ? 0.72 : 0.62, quality - 0.05)
    }

    if (!best || best.size > sizeTarget) throw new Error('IMAGE_COMPRESSION_TOO_LARGE')
    const preparedFile = sourceFitsDimensions && file.size <= sizeTarget && file.size <= best.size
      ? file
      : new File([best], outputName(file.name), { type: 'image/webp', lastModified: Date.now() })
    progress(100)
    return {
      file: preparedFile,
      id: crypto.randomUUID(),
      originalName: file.name,
      originalBytes: file.size,
      previewUrl: URL.createObjectURL(preparedFile),
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('IMAGE_') ||
      error.message.startsWith('SITE_MEDIA_') ||
      error.message.startsWith('TEAM_PORTRAIT_')
    )) throw error
    throw new Error('IMAGE_DECODE_FAILED')
  } finally {
    bitmap?.close()
  }
}

export function prepareProjectImage(
  file: File,
  onProgress?: (progress: number) => void
) {
  return prepareCmsImage(file, { onProgress, profile: 'standard' })
}

export function prepareTeamPortrait(
  file: File,
  onProgress?: (progress: number) => void
) {
  return prepareCmsImage(file, { onProgress, profile: 'portrait' })
}

export function formatImageBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
