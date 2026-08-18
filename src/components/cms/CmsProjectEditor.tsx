'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, LoaderCircle, RotateCcw, Save, Send, Undo2 } from 'lucide-react'
import type { CmsProjectInput, CmsProjectRecord, CmsProjectRevisionRecord } from '@/types/cms'
import type { CmsStagedMediaUpload } from '@/types/cms-media'
import { cmsProjectCategoryLabel, localizeCmsFieldErrors } from '@/lib/cms-locale'
import { validateProjectForPublishing, validateProjectInput } from '@/lib/cms-validation'
import type { PreparedClientImage } from '@/lib/client-image-compression'
import CmsDeferredProjectImages from './CmsDeferredProjectImages'
import { useCmsLanguage } from './CmsLanguage'

type ProjectEditorForm = CmsProjectInput & Pick<
  CmsProjectRecord,
  'hasUnpublishedChanges' | 'publishedAt' | 'publishedBy' | 'publishedVersion' | 'updatedAt'
>

const blankProject: ProjectEditorForm = {
  businessTypes: [],
  category: 'other',
  coverImage: '',
  details: [],
  galleryImages: [],
  hasUnpublishedChanges: true,
  lat: null,
  lng: null,
  location: '',
  projectType: 'other',
  publishedAt: null,
  publishedBy: null,
  publishedVersion: 0,
  slug: '',
  status: 'draft',
  summary: '',
  title: '',
  translations: {
    en: { businessTypes: [], details: [], location: '', summary: '', title: '', workTypes: [] },
  },
  updatedAt: '',
  workTypes: [],
  year: new Date().getFullYear(),
}

const categoryValues: CmsProjectInput['category'][] = ['government', 'factory', 'resort', 'agriculture', 'dewatering', 'other']

function slugify(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '-').replace(/[/?#\\]/g, '').replace(/-+/g, '-')
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function blocks(value: string) {
  return value.split(/\r?\n---\r?\n/).map((item) => item.trim()).filter(Boolean)
}

export default function CmsProjectEditor({
  canWrite,
  initialItem,
  initialMessage = '',
  initialRevisions = [],
}: {
  canWrite: boolean
  initialItem?: CmsProjectRecord
  initialMessage?: string
  initialRevisions?: CmsProjectRevisionRecord[]
}) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const [editingId, setEditingId] = useState(initialItem?.id || null)
  const [form, setForm] = useState<ProjectEditorForm>(initialItem ? { ...initialItem } : { ...blankProject })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [coverPending, setCoverPending] = useState<PreparedClientImage[]>([])
  const [galleryPending, setGalleryPending] = useState<PreparedClientImage[]>([])
  const [preparingCount, setPreparingCount] = useState(0)
  const [saveStage, setSaveStage] = useState('')
  const revisions = initialRevisions

  function set<K extends keyof CmsProjectInput>(key: K, value: CmsProjectInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value, hasUnpublishedChanges: true }))
  }

  function setEnglish<K extends keyof CmsProjectInput['translations']['en']>(
    key: K,
    value: CmsProjectInput['translations']['en'][K]
  ) {
    setForm((previous) => ({
      ...previous,
      hasUnpublishedChanges: true,
      translations: { en: { ...previous.translations.en, [key]: value } },
    }))
  }

  function setPreparing(preparing: boolean) {
    setPreparingCount((previous) => Math.max(0, previous + (preparing ? 1 : -1)))
  }

  async function uploadPendingImage(
    pending: PreparedClientImage,
    submissionId: string,
    uploadNumber: number,
    uploadTotal: number
  ) {
    setSaveStage(text(`กำลังอัปโหลดภาพ ${uploadNumber} จาก ${uploadTotal}...`, `Uploading image ${uploadNumber} of ${uploadTotal}...`))
    const data = new FormData()
    data.append('file', pending.file)
    data.append('submissionId', submissionId)
    if (form.slug.trim()) data.append('slug', form.slug.trim())
    const response = await fetch('/api/cms/projects/media', { body: data, method: 'POST' })
    const payload = (await response.json().catch(() => ({}))) as { error?: string; staged?: CmsStagedMediaUpload }
    if (!response.ok || !payload.staged) {
      throw new Error(payload.error || text('ไม่สามารถอัปโหลดภาพผลงานได้', 'Could not upload the project image.'))
    }
    return payload.staged
  }

  async function cleanUpStaged(submissionId: string, staged: CmsStagedMediaUpload[]) {
    if (!staged.length) return true
    try {
      setSaveStage(text('กำลังล้างภาพที่อัปโหลดไว้...', 'Cleaning up staged images...'))
      const response = await fetch('/api/cms/projects/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, tokens: staged.map((item) => item.token) }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    setBusy(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    setSaveStage('')
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const intent = submitter?.value === 'publish' ? 'publish' : 'save-draft'
    const preflight = validateProjectInput(form)
    if (preflight.errors) {
      setFieldErrors(localizeCmsFieldErrors(locale, preflight.errors))
      setError(text('กรุณาแก้ไขช่องที่ระบุ ก่อนอัปโหลดภาพ', 'Please correct the highlighted fields before images are uploaded.'))
      setBusy(false)
      return
    }
    if (intent === 'publish') {
      const publishingErrors = validateProjectForPublishing(preflight.data)
      if (publishingErrors) {
        setFieldErrors(localizeCmsFieldErrors(locale, publishingErrors))
        setError(text('กรอกเนื้อหาภาษาไทยและอังกฤษให้ครบก่อนเผยแพร่', 'Complete the Thai and English content before publishing.'))
        setBusy(false)
        return
      }
    }
    const submissionId = crypto.randomUUID()
    const staged: CmsStagedMediaUpload[] = []
    try {
      const allPending = [...coverPending, ...galleryPending]
      for (let index = 0; index < allPending.length; index += 1) {
        staged.push(await uploadPendingImage(allPending[index], submissionId, index + 1, allPending.length))
      }
      const stagedCover = coverPending.length ? staged[0]?.asset.src || '' : form.coverImage
      const stagedGalleryOffset = coverPending.length
      const stagedGallery = galleryPending.map((_, index) => staged[stagedGalleryOffset + index]?.asset.src).filter((value): value is string => Boolean(value))
      const project = {
        ...form,
        coverImage: stagedCover,
        galleryImages: Array.from(new Set([...form.galleryImages, ...stagedGallery])),
        id: editingId || undefined,
        intent,
        expectedUpdatedAt: form.updatedAt || undefined,
        stagedMedia: staged.map((item) => item.token),
        submissionId,
      }
      setSaveStage(text('อัปโหลดภาพแล้ว กำลังบันทึกข้อมูลใน MongoDB...', 'Images uploaded. Saving project data to MongoDB...'))
      const response = await fetch('/api/cms/projects', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string>; item?: CmsProjectRecord; mediaCleanupFailed?: boolean }
      if (!response.ok || !payload.item) {
        const cleaned = await cleanUpStaged(submissionId, staged)
        setError(cleaned
          ? text('ไม่สามารถบันทึกผลงานได้ ภาพใหม่ที่อัปโหลดถูกลบแล้ว', 'Could not save the project. Newly uploaded images were removed.')
          : text('ไม่สามารถบันทึกผลงานได้ และระบบล้างภาพใหม่ไม่สำเร็จ กรุณาติดต่อผู้ดูแล', 'Could not save the project, and image cleanup could not be confirmed. Please contact an administrator.'))
        setFieldErrors(localizeCmsFieldErrors(locale, payload.fields || {}))
        return
      }
      for (const item of [...coverPending, ...galleryPending]) URL.revokeObjectURL(item.previewUrl)
      setCoverPending([])
      setGalleryPending([])
      setEditingId(payload.item.id)
      setForm({ ...payload.item })
      if (!editingId) {
        router.replace(`/cms/projects/${payload.item.id}?created=${intent === 'publish' ? 'published' : 'draft'}`)
        return
      }
      setMessage(intent === 'publish'
        ? text('เผยแพร่ผลงานแล้ว หน้าเว็บไซต์กำลังอัปเดตทันที', 'Project published. Public pages are updating now.')
        : text('บันทึกฉบับร่างแล้ว เว็บไซต์สาธารณะยังใช้ฉบับเผยแพร่ล่าสุด', 'Draft saved. The public website still uses the latest published version.'))
      router.refresh()
    } catch (caught) {
      const cleaned = await cleanUpStaged(submissionId, staged)
      const reason = caught instanceof Error ? caught.message : ''
      setError(cleaned
        ? (reason || text('ไม่สามารถเชื่อมต่อบริการผลงาน CMS ได้', 'Could not reach the CMS project service.'))
        : text('การบันทึกล้มเหลว และระบบล้างภาพใหม่ไม่สำเร็จ กรุณาติดต่อผู้ดูแล', 'Saving failed, and image cleanup could not be confirmed. Please contact an administrator.'))
    } finally {
      setBusy(false)
      setSaveStage('')
    }
  }

  async function publishingAction(action: 'unpublish' | 'restore', revisionId?: string) {
    if (!editingId || !canWrite || busy) return
    const warning = action === 'unpublish'
      ? text('ยกเลิกเผยแพร่ผลงานนี้จากเว็บไซต์สาธารณะหรือไม่?', 'Unpublish this project from the public website?')
      : text('กู้คืนและเผยแพร่เวอร์ชันนี้หรือไม่?', 'Restore and publish this version?')
    if (!window.confirm(warning)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/cms/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, expectedUpdatedAt: form.updatedAt || undefined, id: editingId, revisionId }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: CmsProjectRecord }
      if (!response.ok || !payload.item) throw new Error(payload.error || text('ไม่สามารถเปลี่ยนสถานะการเผยแพร่ได้', 'Could not change publishing state.'))
      setForm({ ...payload.item })
      setMessage(action === 'unpublish'
        ? text('ยกเลิกเผยแพร่แล้ว ผลงานถูกเก็บเป็นฉบับร่าง', 'Project unpublished and retained as a draft.')
        : text('กู้คืนและเผยแพร่เวอร์ชันก่อนหน้าแล้ว', 'Previous version restored and published.'))
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('ไม่สามารถเปลี่ยนสถานะการเผยแพร่ได้', 'Could not change publishing state.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cms-editor" aria-labelledby="project-editor-title">
      <header className="cms-editor-header">
        <div>
          <a className="cms-back-link" href="/cms/projects"><ArrowLeft aria-hidden="true" />{text('กลับไปที่ผลงาน', 'Back to projects')}</a>
          <p className="cms-eyebrow">{editingId ? text('รายการผลงาน', 'Project record') : text('รายการใหม่', 'New record')}</p>
          <h2 id="project-editor-title">{editingId ? form.title || text('แก้ไขผลงาน', 'Edit project') : text('เพิ่มผลงาน', 'Add project')}</h2>
          <p>{canWrite ? text('บันทึกรายการนี้ในพื้นที่ทำงาน CMS', 'Save this record in the CMS workspace.') : text('มุมมองผลงานแบบอ่านอย่างเดียว', 'Read-only project view.')}</p>
        </div>
      </header>
      <form className="cms-form" onSubmit={save}>
        <div className="cms-publishing-status" data-status={form.status}>
          <strong>{form.status === 'active' ? text('เผยแพร่แล้ว', 'Published') : text('ฉบับร่าง', 'Draft')}</strong>
          <span>{form.hasUnpublishedChanges
            ? text('มีการแก้ไขที่ยังไม่เผยแพร่', 'Unpublished changes are ready for preview.')
            : form.status === 'active'
              ? text(`เวอร์ชันเผยแพร่ ${form.publishedVersion}`, `Published version ${form.publishedVersion}`)
              : text('ยังไม่แสดงบนเว็บไซต์สาธารณะ', 'Not visible on the public website.')}</span>
        </div>
        <div className="cms-form-grid">
          <label className="cms-field"><span>{text('ชื่อผลงาน (ไทย)', 'Project title (Thai)')}</span><input value={form.title} onChange={(event) => set('title', event.target.value)} onBlur={() => { if (!form.slug) set('slug', slugify(form.title)) }} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title ? <span className="cms-field-error">{fieldErrors.title}</span> : null}</label>
          <label className="cms-field"><span>Slug</span><input value={form.slug} onChange={(event) => set('slug', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.slug)} />{fieldErrors.slug ? <span className="cms-field-error">{fieldErrors.slug}</span> : <span className="cms-field-help">{text('ห้ามมีช่องว่างหรือเครื่องหมายทับ', 'No spaces or slashes.')}</span>}</label>
          <label className="cms-field"><span>{text('ปี', 'Year')}</span><input type="number" min="1900" max={new Date().getFullYear() + 5} value={form.year ?? ''} onChange={(event) => set('year', event.target.value ? Number(event.target.value) : null)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.year)} />{fieldErrors.year ? <span className="cms-field-error">{fieldErrors.year}</span> : null}</label>
          <label className="cms-field"><span>{text('หมวดหมู่', 'Category')}</span><select value={form.category} onChange={(event) => set('category', event.target.value as CmsProjectInput['category'])} disabled={!canWrite}>{categoryValues.map((category) => <option key={category} value={category}>{cmsProjectCategoryLabel(locale, category)}</option>)}</select></label>
          <label className="cms-field"><span>{text('คีย์ประเภทผลงาน', 'Project type key')}</span><input value={form.projectType} onChange={(event) => set('projectType', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.projectType)} />{fieldErrors.projectType ? <span className="cms-field-error">{fieldErrors.projectType}</span> : null}</label>
          <label className="cms-field cms-field-full"><span>{text('สถานที่ (ไทย)', 'Location (Thai)')}</span><input value={form.location} onChange={(event) => set('location', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.location)} />{fieldErrors.location ? <span className="cms-field-error">{fieldErrors.location}</span> : null}</label>
          <label className="cms-field"><span>{text('ละติจูด', 'Latitude')}</span><input type="number" step="any" value={form.lat ?? ''} onChange={(event) => set('lat', event.target.value ? Number(event.target.value) : null)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.lat)} />{fieldErrors.lat ? <span className="cms-field-error">{fieldErrors.lat}</span> : null}</label>
          <label className="cms-field"><span>{text('ลองจิจูด', 'Longitude')}</span><input type="number" step="any" value={form.lng ?? ''} onChange={(event) => set('lng', event.target.value ? Number(event.target.value) : null)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.lng)} />{fieldErrors.lng ? <span className="cms-field-error">{fieldErrors.lng}</span> : null}</label>
          <label className="cms-field cms-field-full"><span>{text('สรุป (ไทย)', 'Summary (Thai)')}</span><textarea value={form.summary} onChange={(event) => set('summary', event.target.value)} disabled={!canWrite} /></label>
          <label className="cms-field"><span>{text('ประเภทงาน (ไทย)', 'Work types (Thai)')}</span><textarea value={form.workTypes.join('\n')} onChange={(event) => set('workTypes', lines(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">{text('หนึ่งรายการต่อบรรทัด', 'One item per line.')}</span></label>
          <label className="cms-field"><span>{text('ประเภทธุรกิจ (ไทย)', 'Business types (Thai)')}</span><textarea value={form.businessTypes.join('\n')} onChange={(event) => set('businessTypes', lines(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">{text('หนึ่งรายการต่อบรรทัด', 'One item per line.')}</span></label>
          <label className="cms-field cms-field-full"><span>{text('รายละเอียดแต่ละส่วน (ไทย)', 'Detailed sections (Thai)')}</span><textarea value={form.details.join('\n---\n')} onChange={(event) => set('details', blocks(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">{text('แยกแต่ละส่วนด้วยบรรทัดที่มี ---', 'Separate sections with a line containing ---.')}</span></label>

          <div className="cms-language-divider cms-field-full"><strong>English content</strong><span>{text('ต้องกรอกชื่อ สถานที่ และสรุปก่อนเผยแพร่', 'Title, location, and summary are required before publishing.')}</span></div>
          <label className="cms-field cms-field-full"><span>Project title (English)</span><input value={form.translations.en.title} onChange={(event) => setEnglish('title', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors['translations.en.title'])} />{fieldErrors['translations.en.title'] ? <span className="cms-field-error">{fieldErrors['translations.en.title']}</span> : null}</label>
          <label className="cms-field cms-field-full"><span>Location (English)</span><input value={form.translations.en.location} onChange={(event) => setEnglish('location', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors['translations.en.location'])} />{fieldErrors['translations.en.location'] ? <span className="cms-field-error">{fieldErrors['translations.en.location']}</span> : null}</label>
          <label className="cms-field cms-field-full"><span>Summary (English)</span><textarea value={form.translations.en.summary} onChange={(event) => setEnglish('summary', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors['translations.en.summary'])} />{fieldErrors['translations.en.summary'] ? <span className="cms-field-error">{fieldErrors['translations.en.summary']}</span> : null}</label>
          <label className="cms-field"><span>Work types (English)</span><textarea value={form.translations.en.workTypes.join('\n')} onChange={(event) => setEnglish('workTypes', lines(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">One item per line.</span></label>
          <label className="cms-field"><span>Business types (English)</span><textarea value={form.translations.en.businessTypes.join('\n')} onChange={(event) => setEnglish('businessTypes', lines(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">One item per line.</span></label>
          <label className="cms-field cms-field-full"><span>Detailed sections (English)</span><textarea value={form.translations.en.details.join('\n---\n')} onChange={(event) => setEnglish('details', blocks(event.target.value))} disabled={!canWrite} /><span className="cms-field-help">Separate sections with a line containing ---.</span></label>
          <CmsDeferredProjectImages label={text('ภาพปก', 'Cover image')} values={form.coverImage ? [form.coverImage] : []} pending={coverPending} onChange={(values) => set('coverImage', values[0] || '')} onPendingChange={setCoverPending} onPreparingChange={setPreparing} disabled={!canWrite || busy} error={fieldErrors.coverImage} help={text('ภาพใหม่จะแทนภาพปัจจุบันหลังบันทึกสำเร็จ หรือกรอก HTTPS URL หรือพาธภายใน', 'A new image replaces the current image after a successful save, or enter an HTTPS URL or local path.')} />
          <CmsDeferredProjectImages label={text('ภาพแกลเลอรี', 'Gallery images')} values={form.galleryImages} pending={galleryPending} onChange={(values) => set('galleryImages', values)} onPendingChange={setGalleryPending} onPreparingChange={setPreparing} disabled={!canWrite || busy} error={fieldErrors.galleryImages} help={text('หนึ่ง URL ต่อบรรทัด ภาพใหม่จะเพิ่มต่อท้ายเมื่อบันทึกสำเร็จ', 'One URL per line. New images are appended after a successful save.')} multiple />
          <label className="cms-field cms-field-full"><span>{text('URL ต้นฉบับเก่า', 'Legacy source URL')}</span><input value={form.legacyUrl || ''} onChange={(event) => set('legacyUrl', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.legacyUrl)} />{fieldErrors.legacyUrl ? <span className="cms-field-error">{fieldErrors.legacyUrl}</span> : null}</label>
        </div>
        <div aria-live="polite">{saveStage ? <p className="cms-save-stage"><LoaderCircle className="cms-spin" aria-hidden="true" />{saveStage}</p> : null}{error ? <p className="cms-error">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
        <div className="cms-form-actions">
          <a className="cms-button-secondary" href="/cms/projects">{text('ยกเลิก', 'Cancel')}</a>
          {editingId ? <a className="cms-button-secondary" href={`/cms/projects/${editingId}/preview`} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" />{text('ดูตัวอย่างฉบับร่าง', 'Preview draft')}</a> : null}
          {canWrite && form.status === 'active' ? <button className="cms-button-secondary" type="button" onClick={() => publishingAction('unpublish')} disabled={busy}><Undo2 aria-hidden="true" />{text('ยกเลิกเผยแพร่', 'Unpublish')}</button> : null}
          {canWrite ? <button className="cms-button-secondary" type="submit" value="save-draft" disabled={busy || preparingCount > 0}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกฉบับร่าง', 'Save draft')}</button> : null}
          {canWrite ? <button className="cms-button" type="submit" value="publish" disabled={busy || preparingCount > 0}><Send aria-hidden="true" />{busy ? text('กำลังเผยแพร่...', 'Publishing...') : text('เผยแพร่', 'Publish')}</button> : null}
        </div>
      </form>
      {editingId && revisions.length ? (
        <section className="cms-revision-panel" aria-labelledby="project-revisions-title">
          <h3 id="project-revisions-title"><RotateCcw aria-hidden="true" />{text('เวอร์ชันเผยแพร่ก่อนหน้า', 'Previous published versions')}</h3>
          <div className="cms-revision-list">{revisions.map((revision) => (
            <div key={revision.id}><span>v{revision.version} · {new Intl.DateTimeFormat(th ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(revision.publishedAt))} · {revision.publishedBy}</span>{canWrite ? <button className="cms-button-secondary" type="button" disabled={busy} onClick={() => publishingAction('restore', revision.id)}><RotateCcw aria-hidden="true" />{text('กู้คืนและเผยแพร่', 'Restore and publish')}</button> : null}</div>
          ))}</div>
        </section>
      ) : null}
    </section>
  )
}
