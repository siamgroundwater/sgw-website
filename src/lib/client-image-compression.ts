export type PreparedClientImage = {
  file: File
  id: string
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
const preservedImageLimitBytes = 3.5 * 1024 * 1024
const longestEdge = 2200

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

export async function prepareProjectImage(file: File): Promise<PreparedClientImage> {
  if (!acceptedTypes.has(file.type)) throw new Error('UNSUPPORTED_IMAGE_TYPE')
  if (!file.size) throw new Error('EMPTY_IMAGE')

  // Preserve GIF animation. Other supported formats are decoded, resized, and encoded as WebP.
  if (file.type === 'image/gif') {
    if (file.size > preservedImageLimitBytes) throw new Error('ANIMATED_IMAGE_TOO_LARGE')
    return {
      file,
      id: crypto.randomUUID(),
      originalBytes: file.size,
      previewUrl: URL.createObjectURL(file),
    }
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const initialScale = Math.min(1, longestEdge / Math.max(bitmap.width, bitmap.height))
    let scale = initialScale
    let quality = 0.84
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
      const blob = await canvasBlob(canvas, quality)
      if (!best || blob.size < best.size) best = blob
      if (blob.size <= targetBytes) break
      scale *= 0.82
      quality = Math.max(0.62, quality - 0.05)
    }

    if (!best || best.size > targetBytes) throw new Error('IMAGE_COMPRESSION_TOO_LARGE')
    const preparedFile = file.size <= targetBytes && file.size <= best.size
      ? file
      : new File([best], outputName(file.name), { type: 'image/webp', lastModified: Date.now() })
    return {
      file: preparedFile,
      id: crypto.randomUUID(),
      originalBytes: file.size,
      previewUrl: URL.createObjectURL(preparedFile),
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('IMAGE_')) throw error
    throw new Error('IMAGE_DECODE_FAILED')
  } finally {
    bitmap?.close()
  }
}

export function formatImageBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
