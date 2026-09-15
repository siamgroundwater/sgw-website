'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowUp, Expand, ImagePlus, LoaderCircle, Star, Trash2, X } from 'lucide-react'
import {
  formatImageBytes,
  prepareCmsImage,
  type CmsImageCompressionProfile,
  type PreparedClientImage,
} from '@/lib/client-image-compression'
import {
  availableCmsImageSelections,
  CMS_MAX_PENDING_IMAGES_PER_SAVE,
  moveProjectImage,
  orderedProjectImages,
} from '@/lib/cms-project-editor'
import { CMS_PROJECT_MAX_GALLERY_IMAGES } from '@/lib/cms-validation'
import { useCmsLanguage } from './CmsLanguage'

type ImageMetadata = { alt: string; caption: string }
type RemovalCandidate = {
  alt: string
  pendingId: string | null
  position: number
  src: string
  valueIndex: number | null
}

type Props = {
  allowZoom?: boolean
  disabled?: boolean
  compressionProfile?: CmsImageCompressionProfile
  error?: string
  fitImagePreview?: boolean
  help?: string
  label: string
  multiple?: boolean
  maxImages?: number
  onChange: (values: string[]) => void
  onPendingChange: (values: PreparedClientImage[]) => void
  onPreparingChange: (preparing: boolean) => void
  onUseAsCover?: (image: string | PreparedClientImage) => void
  order?: string[]
  onOrderChange?: (order: string[]) => void
  onMetadataChange?: (key: string, value: ImageMetadata) => void
  metadata?: Record<string, ImageMetadata>
  pending: PreparedClientImage[]
  previewRatio?: '16-9' | '4-3'
  required?: boolean
  requireRemoveConfirmation?: boolean
  values: string[]
}

const acceptedTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export default function CmsDeferredProjectImages({ allowZoom = true, compressionProfile = 'standard', disabled = false, error, fitImagePreview = false, help, label, maxImages = CMS_PROJECT_MAX_GALLERY_IMAGES, multiple = false, onChange, onPendingChange, onPreparingChange, onUseAsCover, order = [], onOrderChange, onMetadataChange, metadata = {}, pending, previewRatio, required = false, requireRemoveConfirmation = false, values }: Props) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const inputId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const previewDialog = useRef<HTMLDialogElement>(null)
  const removeDialog = useRef<HTMLDialogElement>(null)
  const removeOpener = useRef<HTMLButtonElement | null>(null)
  const selectButton = useRef<HTMLButtonElement>(null)
  const [preparing, setPreparing] = useState(false)
  const [preparationProgress, setPreparationProgress] = useState(0)
  const [prepareError, setPrepareError] = useState('')
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)
  const [removal, setRemoval] = useState<RemovalCandidate | null>(null)
  const imageLimit = multiple ? Math.max(1, maxImages) : 1
  const pendingLimit = multiple ? Math.min(CMS_MAX_PENDING_IMAGES_PER_SAVE, imageLimit) : 1
  const available = multiple
    ? availableCmsImageSelections(values.length, pending.length, imageLimit, pendingLimit)
    : 1

  useEffect(() => {
    if (preview) previewDialog.current?.showModal()
    else previewDialog.current?.close()
  }, [preview])

  useEffect(() => {
    if (removal && !removeDialog.current?.open) removeDialog.current?.showModal()
  }, [removal])

  function compressionError(error: unknown, fileName: string) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'UNSUPPORTED_IMAGE_TYPE') return text(fileName + ': รองรับ JPG, PNG, WebP, GIF และ AVIF', fileName + ': use JPG, PNG, WebP, GIF, or AVIF.')
    if (code === 'ANIMATED_IMAGE_TOO_LARGE') return text(fileName + ': GIF ต้องไม่เกิน 3.5 MB', fileName + ': GIF files must be 3.5 MB or smaller.')
    if (code === 'IMAGE_COMPRESSION_TOO_LARGE') {
      const limit = compressionProfile === 'high-resolution' ? '3.5 MB' : '3 MB'
      return text('ไม่สามารถลดขนาด ' + fileName + ' ให้ต่ำกว่า ' + limit + ' ได้', 'Could not reduce ' + fileName + ' below ' + limit + '.')
    }
    if (code === 'SITE_MEDIA_RESOLUTION_TOO_LOW') {
      return text(fileName + ': ด้านสั้นต้องมีอย่างน้อย 1,000 พิกเซล และด้านยาวอย่างน้อย 2,000 พิกเซล', fileName + ': use an image with a shortest edge of at least 1,000 px and a longest edge of at least 2,000 px.')
    }
    if (code === 'SITE_MEDIA_ASPECT_RATIO_INVALID') {
      return text(fileName + ': ใช้ภาพแนวตั้งที่มีสัดส่วนใกล้เคียงกับแผนที่หรือโปสเตอร์ปัจจุบัน', fileName + ': use a portrait image with proportions similar to the current map or poster.')
    }
    return text('ไม่สามารถอ่านภาพ ' + fileName + ' ได้ ลองเลือกไฟล์ใหม่', 'Could not read ' + fileName + '. Try another file.')
  }

  async function prepare(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selected.length || disabled || preparing) return
    if (selected.length > available) {
      setPrepareError(text('เลือกได้อีก ' + available + ' ภาพ กรุณาเลือกไฟล์ใหม่ ไม่มีภาพใดถูกเพิ่ม', 'You can select ' + available + ' more images. Please select again; no files were added.'))
      return
    }
    setPreparing(true)
    setPreparationProgress(0)
    onPreparingChange(true)
    setPrepareError('')
    const next: PreparedClientImage[] = []
    const failed: string[] = []
    try {
      // Yield once so the progress region is painted before image decoding starts.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      for (const [index, file] of selected.entries()) {
        try {
          next.push(await prepareCmsImage(file, {
            profile: compressionProfile,
            onProgress: (fileProgress) => {
              setPreparationProgress(Math.round(
                ((index + fileProgress / 100) / selected.length) * 100
              ))
            },
          }))
        }
        catch (error) { failed.push(compressionError(error, file.name)) }
      }
      if (next.length) {
        if (multiple) onPendingChange([...pending, ...next])
        else {
          for (const item of pending) URL.revokeObjectURL(item.previewUrl)
          onPendingChange(next)
        }
      }
      setPrepareError(failed.join(' '))
    } finally {
      if (!failed.length) setPreparationProgress(100)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 120))
      setPreparing(false)
      onPreparingChange(false)
    }
  }

  function removePending(id: string) {
    const item = pending.find((candidate) => candidate.id === id)
    if (item) URL.revokeObjectURL(item.previewUrl)
    onPendingChange(pending.filter((candidate) => candidate.id !== id))
  }

  function removeImage(candidate: RemovalCandidate) {
    if (candidate.pendingId) removePending(candidate.pendingId)
    else if (candidate.valueIndex !== null) {
      onChange(values.filter((_, index) => index !== candidate.valueIndex))
    }
  }

  function requestRemoval(candidate: RemovalCandidate, opener: HTMLButtonElement) {
    if (!requireRemoveConfirmation) {
      removeImage(candidate)
      return
    }
    removeOpener.current = opener
    setRemoval(candidate)
  }

  function closeRemoval() {
    if (removeDialog.current?.open) removeDialog.current.close()
    else setRemoval(null)
  }

  function finishRemoval() {
    if (!removal) return
    removeImage(removal)
    closeRemoval()
  }

  function handleRemovalClosed() {
    setRemoval(null)
    const target = removeOpener.current?.isConnected ? removeOpener.current : selectButton.current
    removeOpener.current = null
    window.requestAnimationFrame(() => target?.focus())
  }

  const imageOrder = orderedProjectImages(values, pending.map((item) => item.id), order)
  const images = [
    ...values.map((src, index) => ({ key: src, src, index, pendingImage: undefined as PreparedClientImage | undefined })),
    ...pending.map((item, index) => ({ key: item.id, src: item.previewUrl, index, pendingImage: item })),
  ].sort((left, right) => imageOrder.indexOf(left.key) - imageOrder.indexOf(right.key))

  return <div className={'cms-field cms-field-full cms-project-images' + (fitImagePreview ? ' cms-project-images-fit' : '') + (previewRatio ? ' cms-project-images-ratio-' + previewRatio : '')} data-field={multiple ? 'galleryImages' : 'coverImage'}>
    <span className="cms-field-label">{label}{required ? <span className="cms-required" aria-hidden="true">*</span> : null}</span>
    <div className="cms-media-actions">
      <button ref={selectButton} className="cms-button-secondary" type="button" disabled={disabled || preparing || available === 0} onClick={() => fileInput.current?.click()} aria-describedby={inputId + '-help'}>
        {preparing ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
        {preparing ? text('กำลังบีบอัด...', 'Compressing...') : multiple ? text('เลือกภาพ', 'Select images') : text('เลือกภาพ', 'Select image')}
      </button>
      <input ref={fileInput} hidden id={inputId} type="file" accept={acceptedTypes} multiple={multiple} disabled={disabled || preparing} onChange={prepare} />
      {multiple ? <span className="cms-field-help">{text((values.length + pending.length) + '/' + imageLimit + ' ภาพ · เลือกได้อีก ' + available + ' ภาพในครั้งนี้', (values.length + pending.length) + '/' + imageLimit + ' images · ' + available + ' more this save')}</span> : null}
    </div>
    {preparing ? <div className="cms-compression-progress" role="status" aria-live="polite">
      <span>{text('กำลังเตรียมและบีบอัดภาพ', 'Preparing and compressing images')} {preparationProgress}%</span>
      <progress max="100" value={preparationProgress}>{preparationProgress}%</progress>
    </div> : null}
    <span id={inputId + '-help'} className="cms-field-help">{help || text('บีบอัดบนอุปกรณ์นี้ อัปโหลดเมื่อกดบันทึกเท่านั้น', 'Compressed on this device. Uploaded only when you save.')}</span>
    {error ? <span className="cms-field-error" role="alert">{error}</span> : null}
    <div aria-live="polite">{prepareError ? <p className="cms-error">{prepareError}</p> : null}</div>
    {images.length ? <div className="cms-media-grid">{images.map((image, order) => {
      const info = metadata[image.key] || { alt: '', caption: '' }
      const alt = info.alt || label + ' ' + (order + 1)
      const groupLength = onOrderChange ? images.length : image.pendingImage ? pending.length : values.length
      const imageIndex = onOrderChange ? order : image.index
      const move = (direction: -1 | 1) => onOrderChange
        ? onOrderChange(moveProjectImage(imageOrder, order, direction))
        : image.pendingImage ? onPendingChange(moveProjectImage(pending, image.index, direction)) : onChange(moveProjectImage(values, image.index, direction))
      return <figure className={'cms-media-item' + (image.pendingImage ? ' cms-media-item-pending' : '')} key={image.key}>
        {allowZoom
          ? <button className="cms-media-preview-button" type="button" onClick={() => setPreview({ src: image.src, alt })} aria-label={text('ขยายภาพ ' + (order + 1), 'Enlarge image ' + (order + 1))}><img src={image.src} alt={alt} /><Expand aria-hidden="true" /></button>
          : <div className="cms-media-preview-static"><img src={image.src} alt={alt} /></div>}
        <figcaption className="cms-media-state">{image.pendingImage ? <>{text('พร้อมเมื่อกดบันทึก', 'Ready on Save')} · {formatImageBytes(image.pendingImage.originalBytes)} → {formatImageBytes(image.pendingImage.file.size)}</> : text('บันทึกแล้ว', 'Saved')}{!multiple && pending.length && !image.pendingImage ? ' · ' + text('จะถูกแทนที่', 'Will be replaced') : ''}</figcaption>
        <div className="cms-image-controls">
          {multiple ? <><button className="cms-icon-button" type="button" disabled={disabled || imageIndex === 0} onClick={() => move(-1)} aria-label={text('ย้ายภาพ ' + (order + 1) + ' ไปก่อนหน้า', 'Move image ' + (order + 1) + ' earlier')}><ArrowUp aria-hidden="true" /></button><button className="cms-icon-button" type="button" disabled={disabled || imageIndex === groupLength - 1} onClick={() => move(1)} aria-label={text('ย้ายภาพ ' + (order + 1) + ' ไปถัดไป', 'Move image ' + (order + 1) + ' later')}><ArrowDown aria-hidden="true" /></button></> : null}
          {onUseAsCover ? <button className="cms-button-secondary" type="button" disabled={disabled} onClick={() => onUseAsCover(image.pendingImage || image.src)}><Star aria-hidden="true" />{text('ใช้เป็นภาพปก', 'Use as cover')}</button> : null}
          <button className="cms-icon-button" type="button" disabled={disabled} onClick={(event) => requestRemoval({ alt, pendingId: image.pendingImage?.id || null, position: order + 1, src: image.src, valueIndex: image.pendingImage ? null : image.index }, event.currentTarget)} aria-label={text('นำภาพ ' + (order + 1) + ' ออก', 'Remove image ' + (order + 1))}><Trash2 aria-hidden="true" /></button>
        </div>
        {onMetadataChange ? <details className="cms-image-description"><summary>{text('คำอธิบายภาพ (ไม่บังคับ)', 'Image description (optional)')}</summary><label className="cms-field"><span>{text('คำอธิบายสำหรับผู้ใช้โปรแกรมอ่านหน้าจอ', 'Alternative text')}</span><input maxLength={300} value={info.alt} disabled={disabled} onChange={(event) => onMetadataChange(image.key, { ...info, alt: event.target.value })} /></label><label className="cms-field"><span>{text('คำบรรยายใต้ภาพ', 'Caption')}</span><input maxLength={600} value={info.caption} disabled={disabled} onChange={(event) => onMetadataChange(image.key, { ...info, caption: event.target.value })} /></label></details> : null}
      </figure>
    })}</div> : null}
    {allowZoom ? <dialog ref={previewDialog} className="cms-image-dialog" onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) previewDialog.current?.close() }} aria-label={text('ภาพขยาย', 'Enlarged image')}>
      <button className="cms-icon-button" type="button" onClick={() => previewDialog.current?.close()} aria-label={text('ปิดภาพขยาย', 'Close enlarged image')} autoFocus><X aria-hidden="true" /></button>
      {preview ? <img src={preview.src} alt={preview.alt} /> : null}
    </dialog> : null}
    {requireRemoveConfirmation ? <dialog ref={removeDialog} className="cms-confirm-dialog cms-native-confirm cms-image-remove-dialog" aria-labelledby={inputId + '-remove-title'} aria-describedby={inputId + '-remove-description'} onCancel={(event) => { event.preventDefault(); closeRemoval() }} onClose={handleRemovalClosed}>
      <header className="cms-confirm-header">
        <span className="cms-confirm-icon"><Trash2 aria-hidden="true" /></span>
        <div><h2 id={inputId + '-remove-title'}>{text('นำภาพนี้ออก?', 'Remove this image?')}</h2><p id={inputId + '-remove-description'}>{text('ภาพจะถูกนำออกจากรายการนี้ การเปลี่ยนแปลงบนเว็บไซต์จะเกิดขึ้นเมื่อกดบันทึก', 'The image will be removed from this list. The public website changes only after you save.')}</p></div>
        <button className="cms-icon-button" type="button" onClick={closeRemoval} aria-label={text('ปิด', 'Close')}><X aria-hidden="true" /></button>
      </header>
      {removal ? <div className="cms-image-remove-preview"><img src={removal.src} alt={removal.alt} /><span>{text('ภาพลำดับที่ ', 'Image ') + removal.position}</span></div> : null}
      <div className="cms-confirm-actions"><button className="cms-button-secondary" type="button" onClick={closeRemoval} autoFocus>{text('ยกเลิก', 'Cancel')}</button><button className="cms-button-danger" type="button" onClick={finishRemoval}><Trash2 aria-hidden="true" />{text('นำออก', 'Remove')}</button></div>
    </dialog> : null}
  </div>
}
