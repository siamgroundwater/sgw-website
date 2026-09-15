'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ExternalLink, Save } from 'lucide-react'
import type { PreparedClientImage } from '@/lib/client-image-compression'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { orderedProjectImages } from '@/lib/cms-project-editor'
import { siteMediaLimits, type SiteMediaSectionKey } from '@/lib/site-media'
import { siteMediaLabels } from '@/lib/site-media-labels'
import type { CmsStagedMediaUpload } from '@/types/cms-media'
import { useCmsLanguage } from './CmsLanguage'
import CmsDeferredProjectImages from './CmsDeferredProjectImages'
import './CmsProjectEditor.css'

type SiteMediaItem = {
  fallback: boolean
  images: string[]
  section: SiteMediaSectionKey
  updatedAt: string | null
}

type SavePayload = {
  error?: string
  item?: SiteMediaItem
  mediaCleanupFailed?: boolean
  pending?: boolean
}

export default function CmsSiteMediaEditor({
  canWrite,
  initialItem,
}: {
  canWrite: boolean
  initialItem: SiteMediaItem
}) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = useCallback((thai: string, english: string) => th ? thai : english, [th])
  const section = initialItem.section
  const settings = siteMediaLabels[section]
  const single = settings.kind === 'single'
  const service = settings.kind === 'service'
  const highResolution = section === 'project-map' || section === 'governance'
  const initialPrimary = service || single ? initialItem.images.slice(0, 1) : []
  const initialGallery = service ? initialItem.images.slice(1) : initialItem.images
  const [primary, setPrimary] = useState(initialPrimary)
  const [gallery, setGallery] = useState(initialGallery)
  const [primaryPending, setPrimaryPending] = useState<PreparedClientImage[]>([])
  const [galleryPending, setGalleryPending] = useState<PreparedClientImage[]>([])
  const [galleryOrder, setGalleryOrder] = useState<string[]>(initialGallery)
  const [savedImages, setSavedImages] = useState(initialItem.images)
  const [updatedAt, setUpdatedAt] = useState(initialItem.updatedAt)
  const [preparingCount, setPreparingCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [saveStage, setSaveStage] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const pendingRef = useRef<PreparedClientImage[]>([])
  const busyRef = useRef(false)

  const orderedGallery = useMemo(
    () => orderedProjectImages(
      gallery,
      galleryPending.map(({ id }) => id),
      galleryOrder
    ),
    [gallery, galleryOrder, galleryPending]
  )
  const savedRemoteImages = savedImages
  const currentRemoteImages = service || single ? [...primary, ...gallery] : gallery
  const dirty =
    primaryPending.length > 0 ||
    galleryPending.length > 0 ||
    JSON.stringify(currentRemoteImages) !== JSON.stringify(savedRemoteImages) ||
    JSON.stringify(orderedGallery.filter((key) => gallery.includes(key))) !== JSON.stringify(gallery)
  const locked = !canWrite || busy || preparingCount > 0 || uncertain

  useEffect(() => {
    pendingRef.current = [...primaryPending, ...galleryPending]
  }, [galleryPending, primaryPending])

  useEffect(() => () => {
    for (const image of pendingRef.current) URL.revokeObjectURL(image.previewUrl)
  }, [])

  useEffect(() => {
    if (!dirty && !busy && preparingCount === 0) return
    const confirmLeave = () => {
      if (busyRef.current || preparingCount > 0) {
        window.alert(text('กรุณารอให้เตรียมภาพหรือบันทึกเสร็จก่อน', 'Please wait for image preparation or saving to finish.'))
        return false
      }
      return window.confirm(text('มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหน้านี้หรือไม่?', 'You have unsaved changes. Leave this page?'))
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const beforeLeave = (event: Event) => {
      if (!confirmLeave()) event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('sgw-cms-before-leave', beforeLeave)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('sgw-cms-before-leave', beforeLeave)
    }
  }, [busy, dirty, preparingCount, text])

  function setPreparing(preparing: boolean) {
    setPreparingCount((count) => Math.max(0, count + (preparing ? 1 : -1)))
  }

  function clearPending() {
    for (const image of [...primaryPending, ...galleryPending]) {
      URL.revokeObjectURL(image.previewUrl)
    }
    setPrimaryPending([])
    setGalleryPending([])
  }

  async function cleanUpStaged(staged: CmsStagedMediaUpload[], submissionId: string) {
    if (!staged.length) return true
    try {
      const response = await fetch('/api/cms/media/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          submissionId,
          tokens: staged.map(({ token }) => token),
        }),
      })
      handleCmsUnauthorized(response)
      return response.ok
    } catch {
      return false
    }
  }

  async function uploadImage(
    image: PreparedClientImage,
    submissionId: string
  ) {
    const data = new FormData()
    data.append('file', image.file)
    data.append('section', section)
    data.append('submissionId', submissionId)
    const response = await fetch('/api/cms/media/upload', { body: data, method: 'POST' })
    const payload = await response.json().catch(() => ({})) as {
      error?: string
      staged?: CmsStagedMediaUpload
    }
    if (handleCmsUnauthorized(response)) {
      throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
    }
    if (!response.ok || !payload.staged) {
      throw new Error(payload.error || text('อัปโหลดภาพไม่สำเร็จ', 'Image upload failed.'))
    }
    return payload.staged
  }

  function finalImages(uploaded: Map<string, CmsStagedMediaUpload>) {
    const resolve = (key: string) => uploaded.get(key)?.asset.src || key
    if (service) {
      const hero = primaryPending[0]
        ? uploaded.get(primaryPending[0].id)?.asset.src
        : primary[0]
      return [hero || '', ...orderedGallery.map(resolve)].filter(Boolean)
    }
    if (single) {
      const image = primaryPending[0]
        ? uploaded.get(primaryPending[0].id)?.asset.src
        : primary[0]
      return image ? [image] : []
    }
    return orderedGallery.map(resolve)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked || busyRef.current || !dirty) return
    setError('')
    setMessage('')
    if (service && !primaryPending.length && !primary[0]) {
      setError(text('กรุณาเลือกภาพหลักก่อนบันทึก', 'Select a hero image before saving.'))
      return
    }
    const expectedCount = service
      ? ((primaryPending.length || primary.length) ? 1 : 0) + orderedGallery.length
      : single
        ? ((primaryPending.length || primary.length) ? 1 : 0)
        : orderedGallery.length
    const { minimum, maximum } = siteMediaLimits[section]
    if (expectedCount < minimum || expectedCount > maximum) {
      setError(minimum === maximum
        ? text('กรุณาเลือกภาพ 1 ภาพ', 'Select one image.')
        : text(`กรุณาใช้ภาพ ${minimum}-${maximum} ภาพ`, `Use ${minimum}-${maximum} images.`))
      return
    }

    busyRef.current = true
    setBusy(true)
    const submissionId = crypto.randomUUID()
    const staged: CmsStagedMediaUpload[] = []
    const uploaded = new Map<string, CmsStagedMediaUpload>()
    const pending = [...primaryPending, ...galleryPending]
    let uploadFinished = false
    try {
      for (const [index, image] of pending.entries()) {
        setSaveStage(text(
          `กำลังอัปโหลดภาพ ${index + 1} จาก ${pending.length}`,
          `Uploading image ${index + 1} of ${pending.length}`
        ))
        const item = await uploadImage(image, submissionId)
        staged.push(item)
        uploaded.set(image.id, item)
      }
      uploadFinished = true
      setSaveStage(text('กำลังบันทึกลงฐานข้อมูล...', 'Saving to the database...'))
      let response: Response
      try {
        response = await fetch('/api/cms/media', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedUpdatedAt: updatedAt,
            images: finalImages(uploaded),
            section,
            stagedMedia: staged.map(({ token }) => token),
            submissionId,
          }),
        })
      } catch {
        // The request may have committed even though its response was lost.
        // Lock the editor to prevent duplicate uploads until a fresh GET/reload
        // establishes the authoritative database state.
        setUncertain(true)
        throw new Error(text(
          'การเชื่อมต่อขาดหายระหว่างบันทึก กรุณาโหลดหน้านี้ใหม่เพื่อตรวจสอบก่อนลองอีกครั้ง',
          'The connection was lost during the final save. Reload this page to verify the result before trying again.'
        ))
      }
      const payload = await response.json().catch(() => ({})) as SavePayload
      if (handleCmsUnauthorized(response)) {
        throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
      }
      if (!response.ok || !payload.item) {
        if (payload.pending || response.ok) {
          setUncertain(true)
          throw new Error(payload.error || text('ยังยืนยันผลการบันทึกไม่ได้', 'The save result is not confirmed.'))
        }
        setError(payload.error || text('บันทึกไม่สำเร็จ', 'Could not save.'))
        if (payload.mediaCleanupFailed) {
          setMessage(text('ระบบจะตรวจสอบภาพที่ยังไม่ได้ใช้ให้อัตโนมัติ', 'Unused staged images remain queued for automatic cleanup.'))
        }
        return
      }

      clearPending()
      const images = payload.item.images
      if (service || single) {
        setPrimary(images.slice(0, 1))
        setGallery(service ? images.slice(1) : [])
        setGalleryOrder(service ? images.slice(1) : [])
      } else {
        setGallery(images)
        setGalleryOrder(images)
      }
      setUpdatedAt(payload.item.updatedAt)
      setSavedImages(images)
      setMessage(text('บันทึกแล้ว ภาพบนเว็บไซต์อัปเดตทันที', 'Saved. The public website is updated immediately.'))
    } catch (caught) {
      if (!uploadFinished) {
        const cleaned = await cleanUpStaged(staged, submissionId)
        if (!cleaned) setMessage(text('ระบบจะล้างภาพที่ไม่ได้ใช้ให้ภายหลัง', 'Unused staged images remain queued for cleanup.'))
      }
      setError(caught instanceof Error ? caught.message : text('บันทึกไม่สำเร็จ', 'Could not save.'))
    } finally {
      busyRef.current = false
      setBusy(false)
      setSaveStage('')
    }
  }

  return (
    <form className="cms-form cms-site-media-editor cms-project-editor" onSubmit={save}>
      <section className="cms-panel cms-site-media-intro">
        <div>
          <p className="cms-eyebrow">{text('ภาพที่ใช้จริงบนเว็บไซต์', 'Live website media')}</p>
          <h2>{settings.title[locale]}</h2>
          <p>{settings.description[locale]}</p>
        </div>
        <a className="cms-button-secondary" href={settings.publicHref} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          {text('เปิดหน้าเว็บไซต์', 'Open public page')}
        </a>
      </section>

      {service || single ? <section className="cms-panel cms-site-media-group">
        <div className="cms-panel-header">
          <div>
            <h2>{service ? text('ภาพหลัก', 'Hero image') : settings.title[locale]}</h2>
            {service ? <p>{text('ใช้ภาพแนวนอนอัตราส่วน 16:9 เช่น 1920 × 1080 พิกเซล ระบบจะครอบจากกึ่งกลางภาพ', 'Use a 16:9 landscape image, such as 1920 × 1080 px. The website crops from the centre.')}</p> : null}
          </div>
        </div>
        <CmsDeferredProjectImages
          allowZoom={false}
          compressionProfile={highResolution ? 'high-resolution' : 'standard'}
          disabled={locked}
          fitImagePreview={highResolution}
          help={highResolution
            ? text('รักษาความละเอียดเมื่อไฟล์มีขนาดเหมาะสม และอัปโหลดเมื่อกดบันทึกเท่านั้น', 'Preserves resolution when the file is already optimized. Uploaded only on Save.')
            : undefined}
          label={service ? text('ภาพหลัก', 'Hero image') : text('ภาพ', 'Image')}
          onChange={setPrimary}
          onPendingChange={setPrimaryPending}
          onPreparingChange={setPreparing}
          pending={primaryPending}
          previewRatio={service ? '16-9' : undefined}
          required
          requireRemoveConfirmation
          values={primary}
        />
      </section> : null}

      {service || settings.kind === 'slides' ? <section className="cms-panel cms-site-media-group">
        <div className="cms-panel-header">
          <div>
            <h2>{service ? text('ภาพสไลด์', 'Gallery slides') : text('ภาพสไลด์หน้าเกี่ยวกับเรา', 'About hero slides')}</h2>
            {service
              ? <p>{text('ใช้ภาพแนวนอนอัตราส่วน 4:3 เช่น 1600 × 1200 พิกเซล และวางส่วนสำคัญไว้ใกล้กึ่งกลางภาพ', 'Use 4:3 landscape images, such as 1600 × 1200 px, and keep important content near the centre.')}</p>
              : <p>{text('จัดลำดับภาพได้ ระบบจะครอบกลางภาพให้พอดี 3:1 หรือ 16:9', 'Reorder freely. The centre is cropped to 3:1 or 16:9 on the website.')}</p>}
          </div>
        </div>
        <CmsDeferredProjectImages
          allowZoom={false}
          disabled={locked}
          label={service ? text('แกลเลอรี', 'Gallery') : text('สไลด์', 'Slides')}
          maxImages={service ? 12 : siteMediaLimits[section].maximum}
          multiple
          onChange={setGallery}
          onOrderChange={setGalleryOrder}
          onPendingChange={setGalleryPending}
          onPreparingChange={setPreparing}
          order={galleryOrder}
          pending={galleryPending}
          previewRatio={service ? '4-3' : undefined}
          required
          requireRemoveConfirmation
          values={gallery}
        />
      </section> : null}

      <div aria-live="polite">
        {error ? <p className="cms-error" role="alert">{error}</p> : null}
        {message ? <p className="cms-message">{message}</p> : null}
        {saveStage ? <p className="cms-message">{saveStage}</p> : null}
      </div>

      <div className="cms-form-actions cms-site-media-actions">
        <button className="cms-button" type="submit" disabled={locked || !dirty}>
          <Save aria-hidden="true" />
          {busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึก', 'Save')}
        </button>
      </div>
      {!canWrite ? <p className="cms-field-help">{text('บัญชีนี้ดูได้อย่างเดียว', 'This account has read-only access.')}</p> : null}
    </form>
  )
}
