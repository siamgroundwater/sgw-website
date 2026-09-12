'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowUp, Expand, ImagePlus, LoaderCircle, Star, Trash2, X } from 'lucide-react'
import { formatImageBytes, prepareProjectImage, type PreparedClientImage } from '@/lib/client-image-compression'
import { moveProjectImage, orderedProjectImages } from '@/lib/cms-project-editor'
import { CMS_PROJECT_MAX_GALLERY_IMAGES } from '@/lib/cms-validation'
import { useCmsLanguage } from './CmsLanguage'

type ImageMetadata = { alt: string; caption: string }
type Props = {
  disabled?: boolean
  error?: string
  help?: string
  label: string
  multiple?: boolean
  onChange: (values: string[]) => void
  onPendingChange: (values: PreparedClientImage[]) => void
  onPreparingChange: (preparing: boolean) => void
  onUseAsCover?: (image: string | PreparedClientImage) => void
  order?: string[]
  onOrderChange?: (order: string[]) => void
  onMetadataChange?: (key: string, value: ImageMetadata) => void
  metadata?: Record<string, ImageMetadata>
  pending: PreparedClientImage[]
  required?: boolean
  values: string[]
}

const acceptedTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export default function CmsDeferredProjectImages({ disabled = false, error, help, label, multiple = false, onChange, onPendingChange, onPreparingChange, onUseAsCover, order = [], onOrderChange, onMetadataChange, metadata = {}, pending, required = false, values }: Props) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const inputId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const previewDialog = useRef<HTMLDialogElement>(null)
  const [preparing, setPreparing] = useState(false)
  const [prepareError, setPrepareError] = useState('')
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)
  const available = multiple ? Math.max(0, Math.min(12 - pending.length, CMS_PROJECT_MAX_GALLERY_IMAGES - values.length - pending.length)) : 1

  useEffect(() => {
    if (preview) previewDialog.current?.showModal()
    else previewDialog.current?.close()
  }, [preview])

  function compressionError(error: unknown, fileName: string) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'UNSUPPORTED_IMAGE_TYPE') return text(fileName + ': รองรับ JPG, PNG, WebP, GIF และ AVIF', fileName + ': use JPG, PNG, WebP, GIF, or AVIF.')
    if (code === 'ANIMATED_IMAGE_TOO_LARGE') return text(fileName + ': GIF ต้องไม่เกิน 3.5 MB', fileName + ': GIF files must be 3.5 MB or smaller.')
    if (code === 'IMAGE_COMPRESSION_TOO_LARGE') return text('ไม่สามารถลดขนาด ' + fileName + ' ให้ต่ำกว่า 3 MB ได้', 'Could not reduce ' + fileName + ' below 3 MB.')
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
    onPreparingChange(true)
    setPrepareError('')
    const next: PreparedClientImage[] = []
    const failed: string[] = []
    try {
      for (const file of selected) {
        try { next.push(await prepareProjectImage(file)) }
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
      setPreparing(false)
      onPreparingChange(false)
    }
  }

  function removePending(id: string) {
    const item = pending.find((candidate) => candidate.id === id)
    if (item) URL.revokeObjectURL(item.previewUrl)
    onPendingChange(pending.filter((candidate) => candidate.id !== id))
  }

  const imageOrder = orderedProjectImages(values, pending.map((item) => item.id), order)
  const images = [
    ...values.map((src, index) => ({ key: src, src, index, pendingImage: undefined as PreparedClientImage | undefined })),
    ...pending.map((item, index) => ({ key: item.id, src: item.previewUrl, index, pendingImage: item })),
  ].sort((left, right) => imageOrder.indexOf(left.key) - imageOrder.indexOf(right.key))

  return <div className="cms-field cms-field-full cms-project-images" data-field={multiple ? 'galleryImages' : 'coverImage'}>
    <span className="cms-field-label">{label}{required ? <span className="cms-required" aria-hidden="true">*</span> : null}</span>
    <div className="cms-media-actions">
      <button className="cms-button-secondary" type="button" disabled={disabled || preparing || available === 0} onClick={() => fileInput.current?.click()} aria-describedby={inputId + '-help'}>
        {preparing ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
        {preparing ? text('กำลังบีบอัด...', 'Compressing...') : multiple ? text('เลือกภาพ', 'Select images') : text('เลือกภาพ', 'Select image')}
      </button>
      <input ref={fileInput} hidden id={inputId} type="file" accept={acceptedTypes} multiple={multiple} disabled={disabled || preparing} onChange={prepare} />
      {multiple ? <span className="cms-field-help">{text((values.length + pending.length) + '/' + CMS_PROJECT_MAX_GALLERY_IMAGES + ' ภาพ · เลือกได้อีก ' + available + ' ภาพในครั้งนี้', (values.length + pending.length) + '/' + CMS_PROJECT_MAX_GALLERY_IMAGES + ' images · ' + available + ' more this save')}</span> : null}
    </div>
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
        <button className="cms-media-preview-button" type="button" onClick={() => setPreview({ src: image.src, alt })} aria-label={text('ขยายภาพ ' + (order + 1), 'Enlarge image ' + (order + 1))}><img src={image.src} alt={alt} /><Expand aria-hidden="true" /></button>
        <figcaption className="cms-media-state">{image.pendingImage ? <>{text('พร้อมเมื่อกดบันทึก', 'Ready on Save')} · {formatImageBytes(image.pendingImage.originalBytes)} → {formatImageBytes(image.pendingImage.file.size)}</> : text('บันทึกแล้ว', 'Saved')}{!multiple && pending.length && !image.pendingImage ? ' · ' + text('จะถูกแทนที่', 'Will be replaced') : ''}</figcaption>
        <div className="cms-image-controls">
          {multiple ? <><button className="cms-icon-button" type="button" disabled={disabled || imageIndex === 0} onClick={() => move(-1)} aria-label={text('ย้ายภาพ ' + (order + 1) + ' ไปก่อนหน้า', 'Move image ' + (order + 1) + ' earlier')}><ArrowUp aria-hidden="true" /></button><button className="cms-icon-button" type="button" disabled={disabled || imageIndex === groupLength - 1} onClick={() => move(1)} aria-label={text('ย้ายภาพ ' + (order + 1) + ' ไปถัดไป', 'Move image ' + (order + 1) + ' later')}><ArrowDown aria-hidden="true" /></button></> : null}
          {onUseAsCover ? <button className="cms-button-secondary" type="button" disabled={disabled} onClick={() => onUseAsCover(image.pendingImage || image.src)}><Star aria-hidden="true" />{text('ใช้เป็นภาพปก', 'Use as cover')}</button> : null}
          <button className="cms-icon-button" type="button" disabled={disabled} onClick={() => image.pendingImage ? removePending(image.pendingImage.id) : onChange(values.filter((_, index) => index !== image.index))} aria-label={text('นำภาพ ' + (order + 1) + ' ออก', 'Remove image ' + (order + 1))}><Trash2 aria-hidden="true" /></button>
        </div>
        {onMetadataChange ? <details className="cms-image-description"><summary>{text('คำอธิบายภาพ (ไม่บังคับ)', 'Image description (optional)')}</summary><label className="cms-field"><span>{text('คำอธิบายสำหรับผู้ใช้โปรแกรมอ่านหน้าจอ', 'Alternative text')}</span><input maxLength={300} value={info.alt} disabled={disabled} onChange={(event) => onMetadataChange(image.key, { ...info, alt: event.target.value })} /></label><label className="cms-field"><span>{text('คำบรรยายใต้ภาพ', 'Caption')}</span><input maxLength={600} value={info.caption} disabled={disabled} onChange={(event) => onMetadataChange(image.key, { ...info, caption: event.target.value })} /></label></details> : null}
      </figure>
    })}</div> : null}
    <dialog ref={previewDialog} className="cms-image-dialog" onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) previewDialog.current?.close() }} aria-label={text('ภาพขยาย', 'Enlarged image')}>
      <button className="cms-icon-button" type="button" onClick={() => previewDialog.current?.close()} aria-label={text('ปิดภาพขยาย', 'Close enlarged image')} autoFocus><X aria-hidden="true" /></button>
      {preview ? <img src={preview.src} alt={preview.alt} /> : null}
    </dialog>
  </div>
}
