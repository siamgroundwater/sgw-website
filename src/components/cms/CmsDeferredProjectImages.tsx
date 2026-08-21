'use client'

import { useId, useState, type ChangeEvent } from 'react'
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import {
  formatImageBytes,
  prepareProjectImage,
  type PreparedClientImage,
} from '@/lib/client-image-compression'
import { useCmsLanguage } from './CmsLanguage'

type Props = {
  allowManualEntry?: boolean
  disabled?: boolean
  error?: string
  help?: string
  label: string
  multiple?: boolean
  onChange: (values: string[]) => void
  onPendingChange: (values: PreparedClientImage[]) => void
  onPreparingChange: (preparing: boolean) => void
  pending: PreparedClientImage[]
  required?: boolean
  values: string[]
}

const acceptedTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export default function CmsDeferredProjectImages({
  allowManualEntry = true,
  disabled = false,
  error,
  help,
  label,
  multiple = false,
  onChange,
  onPendingChange,
  onPreparingChange,
  pending,
  required = false,
  values,
}: Props) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const inputId = useId()
  const [preparing, setPreparing] = useState(false)
  const [prepareError, setPrepareError] = useState('')

  function compressionError(error: unknown, fileName: string) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'UNSUPPORTED_IMAGE_TYPE') return text(`ไฟล์ ${fileName} ไม่ใช่ชนิดภาพที่รองรับ`, `${fileName} is not a supported image type.`)
    if (code === 'ANIMATED_IMAGE_TOO_LARGE') return text(`ไฟล์ GIF ${fileName} ต้องมีขนาดไม่เกิน 3.5 MB`, `${fileName} must be 3.5 MB or smaller because animated GIFs are preserved.`)
    if (code === 'IMAGE_COMPRESSION_TOO_LARGE') return text(`ไม่สามารถลดขนาด ${fileName} ให้ต่ำกว่า 3 MB ได้`, `Could not reduce ${fileName} below 3 MB.`)
    return text(`ไม่สามารถเตรียมภาพ ${fileName} ได้`, `Could not prepare ${fileName}.`)
  }

  async function prepare(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selected.length || disabled) return
    const available = multiple ? Math.max(0, 12 - pending.length) : 1
    if (!available) {
      setPrepareError(text('เพิ่มภาพใหม่ได้สูงสุด 12 ภาพต่อการบันทึกหนึ่งครั้ง', 'You can add up to 12 new images in one save.'))
      return
    }

    setPreparing(true)
    onPreparingChange(true)
    setPrepareError('')
    const next: PreparedClientImage[] = []
    try {
      for (const file of selected.slice(0, available)) {
        try {
          next.push(await prepareProjectImage(file))
        } catch (error) {
          throw new Error(compressionError(error, file.name))
        }
      }
      if (multiple) {
        onPendingChange([...pending, ...next])
      } else {
        for (const item of pending) URL.revokeObjectURL(item.previewUrl)
        onPendingChange(next.slice(0, 1))
      }
    } catch (error) {
      for (const item of next) URL.revokeObjectURL(item.previewUrl)
      setPrepareError(error instanceof Error ? error.message : text('ไม่สามารถเตรียมภาพได้', 'Could not prepare the image.'))
    } finally {
      setPreparing(false)
      onPreparingChange(false)
    }
  }

  function updateManualValue(value: string) {
    const next = multiple
      ? value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : value.trim() ? [value.trim()] : []
    onChange(next)
  }

  function removePending(id: string) {
    const item = pending.find((candidate) => candidate.id === id)
    if (item) URL.revokeObjectURL(item.previewUrl)
    onPendingChange(pending.filter((candidate) => candidate.id !== id))
  }

  return (
    <div className="cms-field cms-field-full">
      <span className="cms-field-label">{label}{required ? <span className="cms-required" aria-hidden="true">*</span> : null}</span>
      {allowManualEntry && (multiple ? (
        <textarea aria-invalid={Boolean(error)} disabled={disabled || preparing} onChange={(event) => updateManualValue(event.target.value)} value={values.join('\n')} />
      ) : (
        <input aria-invalid={Boolean(error)} disabled={disabled || preparing} onChange={(event) => updateManualValue(event.target.value)} value={values[0] || ''} />
      ))}
      <div className="cms-media-actions">
        <label className="cms-button-secondary" aria-disabled={disabled || preparing} htmlFor={inputId}>
          {preparing ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {preparing ? text('กำลังบีบอัด...', 'Compressing...') : multiple ? text('เลือกภาพ', 'Select images') : text('เลือกภาพ', 'Select image')}
        </label>
        <input className="cms-file-input" id={inputId} type="file" accept={acceptedTypes} multiple={multiple} disabled={disabled || preparing} onChange={prepare} />
      </div>
      {help ? <span className="cms-field-help">{help}</span> : null}
      {error ? <span className="cms-field-error">{error}</span> : null}
      <div aria-live="polite">{prepareError ? <p className="cms-error">{prepareError}</p> : null}</div>
      {values.length || pending.length ? (
        <div className="cms-media-grid">
          {values.map((src, index) => (
            <figure className="cms-media-item" key={`${src}-${index}`}>
              <img src={src} alt={th ? `ภาพปัจจุบัน ${index + 1}` : `Current image ${index + 1}`} />
              <figcaption className="cms-media-state">{text('ภาพปัจจุบัน', 'Current')}</figcaption>
              {!disabled ? <button className="cms-media-remove" type="button" onClick={() => onChange(values.filter((_, valueIndex) => valueIndex !== index))} aria-label={th ? `นำภาพปัจจุบันที่ ${index + 1} ออก` : `Remove current image ${index + 1}`}><Trash2 aria-hidden="true" /></button> : null}
            </figure>
          ))}
          {pending.map((item, index) => (
            <figure className="cms-media-item cms-media-item-pending" key={item.id}>
              <img src={item.previewUrl} alt={th ? `ภาพใหม่พร้อมอัปโหลด ${index + 1}` : `New image ready to upload ${index + 1}`} />
              <figcaption className="cms-media-state">{text('พร้อมเมื่อกดบันทึก', 'Ready on Save')} · {formatImageBytes(item.originalBytes)} → {formatImageBytes(item.file.size)}</figcaption>
              {!disabled ? <button className="cms-media-remove" type="button" onClick={() => removePending(item.id)} aria-label={th ? `นำภาพใหม่ที่ ${index + 1} ออก` : `Remove new image ${index + 1}`}><Trash2 aria-hidden="true" /></button> : null}
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
