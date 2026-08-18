'use client'

import { useId, useState, type ChangeEvent } from 'react'
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import type { CmsMediaAsset, CmsMediaFolder } from '@/types/cms-media'
import { useCmsLanguage } from './CmsLanguage'

type Props = {
  disabled?: boolean
  error?: string
  folder: CmsMediaFolder
  help?: string
  label: string
  multiple?: boolean
  onChange: (values: string[]) => void
  slug?: string
  values: string[]
}

const acceptedTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export default function CmsImageUpload({
  disabled = false,
  error,
  folder,
  help,
  label,
  multiple = false,
  onChange,
  slug,
  values,
}: Props) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length || disabled) return

    setBusy(true)
    setUploadError('')
    setUploadMessage('')
    let nextValues = multiple ? [...values] : []
    let uploaded = 0

    try {
      for (const file of files.slice(0, multiple ? 12 : 1)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)
        if (slug?.trim()) formData.append('slug', slug.trim())

        const response = await fetch('/api/cms/media', {
          body: formData,
          method: 'POST',
        })
        const payload = (await response.json().catch(() => ({}))) as {
          asset?: CmsMediaAsset
          error?: string
        }
        if (!response.ok || !payload.asset) {
          throw new Error(th ? `ไม่สามารถอัปโหลด ${file.name} ได้` : (payload.error || `Could not upload ${file.name}.`))
        }
        nextValues = [...nextValues, payload.asset.src]
        uploaded += 1
      }
      onChange(Array.from(new Set(nextValues)))
      setUploadMessage(th ? `อัปโหลดภาพ ${uploaded} ภาพไปยังคลังสื่อ SGW แล้ว` : `${uploaded} image${uploaded === 1 ? '' : 's'} uploaded to SGW media storage.`)
    } catch (caught) {
      if (uploaded) onChange(Array.from(new Set(nextValues)))
      setUploadError(caught instanceof Error ? caught.message : text('ไม่สามารถอัปโหลดภาพได้', 'Could not upload the image.'))
    } finally {
      setBusy(false)
    }
  }

  function updateManualValue(value: string) {
    const next = multiple
      ? value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : value.trim() ? [value] : []
    onChange(next)
  }

  return (
    <div className="cms-field cms-field-full">
      <span className="cms-field-label">{label}</span>
      {multiple ? (
        <textarea
          aria-invalid={Boolean(error)}
          disabled={disabled || busy}
          onChange={(event) => updateManualValue(event.target.value)}
          value={values.join('\n')}
        />
      ) : (
        <input
          aria-invalid={Boolean(error)}
          disabled={disabled || busy}
          onChange={(event) => updateManualValue(event.target.value)}
          value={values[0] || ''}
        />
      )}
      <div className="cms-media-actions">
        <label className="cms-button-secondary" aria-disabled={disabled || busy} htmlFor={inputId}>
          {busy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {busy ? text('กำลังอัปโหลด...', 'Uploading...') : multiple ? text('อัปโหลดภาพ', 'Upload images') : text('อัปโหลดภาพ', 'Upload image')}
        </label>
        <input
          className="cms-file-input"
          id={inputId}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          disabled={disabled || busy}
          onChange={upload}
        />
        <span className="cms-field-help">{text('JPG, PNG, WebP, GIF หรือ AVIF ขนาดไม่เกิน 4 MB ต่อภาพ', 'JPG, PNG, WebP, GIF, or AVIF. Up to 4 MB each.')}</span>
      </div>
      {help ? <span className="cms-field-help">{help}</span> : null}
      {error ? <span className="cms-field-error">{error}</span> : null}
      <div aria-live="polite">
        {uploadError ? <p className="cms-error">{uploadError}</p> : null}
        {uploadMessage ? <p className="cms-message">{uploadMessage}</p> : null}
      </div>
      {values.length ? (
        <div className="cms-media-grid">
          {values.map((src, index) => (
            <figure className="cms-media-item" key={`${src}-${index}`}>
              <img src={src} alt={th ? `ตัวอย่าง ${label} ภาพที่ ${index + 1}` : `${label} preview ${index + 1}`} />
              {!disabled ? (
                <button
                  className="cms-media-remove"
                  type="button"
                  onClick={() => onChange(values.filter((_, valueIndex) => valueIndex !== index))}
                  aria-label={th ? `นำภาพที่ ${index + 1} ออกจากรายการนี้` : `Remove image ${index + 1} from this record`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  )
}
