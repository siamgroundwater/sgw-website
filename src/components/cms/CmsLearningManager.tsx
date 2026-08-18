'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, BookOpen, Edit3, Plus, Save, Search, X } from 'lucide-react'
import type { CmsLearningInput, CmsLearningRecord, CmsStatus } from '@/types/cms'
import { cmsSourceLabel, cmsStatusLabel, localizeCmsFieldErrors } from '@/lib/cms-locale'
import CmsImageUpload from './CmsImageUpload'
import { useCmsLanguage } from './CmsLanguage'

const blankArticle: CmsLearningInput = {
  audience: '',
  description: '',
  eyebrow: '',
  heroImage: '',
  sections: [{ bullets: [], heading: '', image: '', paragraphs: [] }],
  slug: '',
  sources: [],
  status: 'draft',
  title: '',
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function paragraphs(value: string) {
  return value.split(/\r?\n\s*\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function slugify(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '-').replace(/[/?#\\]/g, '').replace(/-+/g, '-')
}

export default function CmsLearningManager({ initialItems, canWrite, canDelete }: { initialItems: CmsLearningRecord[]; canWrite: boolean; canDelete: boolean }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const editorRef = useRef<HTMLElement>(null)
  const [items, setItems] = useState(initialItems)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | CmsStatus>('all')
  const [form, setForm] = useState<CmsLearningInput>(blankArticle)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase('th')
    return items.filter((item) => (status === 'all' || item.status === status) && (!clean || `${item.title} ${item.slug} ${item.eyebrow} ${item.audience}`.toLocaleLowerCase('th').includes(clean)))
  }, [items, query, status])

  function set<K extends keyof CmsLearningInput>(key: K, value: CmsLearningInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function show(item?: CmsLearningRecord) {
    setEditingId(item?.id || null)
    setForm(item ? { ...item, sections: item.sections.map((section) => ({ ...section, bullets: [...section.bullets], image: section.image || '', paragraphs: [...section.paragraphs] })), sources: item.sources.map((source) => ({ ...source })) } : { ...blankArticle, sections: [{ bullets: [], heading: '', image: '', paragraphs: [] }], sources: [] })
    setError('')
    setMessage('')
    setFieldErrors({})
    setOpen(true)
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  function close() {
    setOpen(false)
    setEditingId(null)
    setError('')
    setFieldErrors({})
  }

  function updateSection(index: number, patch: Partial<CmsLearningInput['sections'][number]>) {
    set('sections', form.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section))
  }

  function updateSource(index: number, patch: Partial<CmsLearningInput['sources'][number]>) {
    set('sources', form.sources.map((source, sourceIndex) => sourceIndex === index ? { ...source, ...patch } : source))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    setBusy(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const response = await fetch('/api/cms/learning', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId || undefined }) })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string>; item?: CmsLearningRecord }
      if (!response.ok || !payload.item) {
        setError(text('ไม่สามารถบันทึกบทความความรู้ได้', 'Could not save the learning article.'))
        setFieldErrors(localizeCmsFieldErrors(locale, payload.fields || {}))
        return
      }
      setItems((previous) => previous.some((item) => item.id === payload.item?.id) ? previous.map((item) => item.id === payload.item?.id ? payload.item! : item) : [payload.item!, ...previous])
      setEditingId(payload.item.id)
      setForm({ ...payload.item })
      setMessage(text('บันทึกบทความในพื้นที่ CMS ส่วนตัวแล้ว เว็บไซต์สาธารณะยังไม่เปลี่ยนแปลง', 'Learning article saved in the private CMS workspace. The public website is unchanged.'))
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อตัวแก้ไขบทความ CMS ได้', 'Could not reach the CMS learning editor.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: CmsLearningRecord) {
    if (!canDelete || !window.confirm(th ? `นำ “${item.title}” ออกจากพื้นที่ CMS หรือไม่?` : `Remove “${item.title}” from the CMS workspace?`)) return
    setBusy(true)
    try {
      const response = await fetch(`/api/cms/learning?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await response.json().catch(() => ({}))
      if (!response.ok) { setError(text('ไม่สามารถนำบทความออกได้', 'Could not remove the learning article.')); return }
      setItems((previous) => previous.filter((row) => row.id !== item.id))
      if (editingId === item.id) close()
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อตัวแก้ไขบทความ CMS ได้', 'Could not reach the CMS learning editor.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="cms-panel">
        <header className="cms-panel-header"><div><h2>{text('คลังความรู้', 'Learning library')}</h2><p>{th ? `แสดง ${filtered.length} จาก ${items.length} บทความ` : `${filtered.length} of ${items.length} learning records shown.`}</p></div>{canWrite ? <button className="cms-button" type="button" onClick={() => show()}><Plus aria-hidden="true" />{text('เพิ่มบทความ', 'New article')}</button> : null}</header>
        <div className="cms-toolbar"><label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('ค้นหาชื่อ กลุ่มเป้าหมาย หรือ slug', 'Search title, audience, or slug')} aria-label={text('ค้นหาบทความความรู้', 'Search learning articles')} /></label><select className="cms-filter" value={status} onChange={(event) => setStatus(event.target.value as 'all' | CmsStatus)} aria-label={text('กรองบทความตามสถานะ', 'Filter learning articles by status')}><option value="all">{text('ทุกสถานะ', 'All statuses')}</option><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{cmsStatusLabel(locale, 'draft')}</option><option value="archived">{cmsStatusLabel(locale, 'archived')}</option></select></div>
        {filtered.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>{text('บทความ', 'Article')}</th><th>{text('กลุ่มเป้าหมาย', 'Audience')}</th><th>{text('ส่วนเนื้อหา', 'Sections')}</th><th>{text('สถานะ', 'Status')}</th><th>{text('การจัดการ', 'Actions')}</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="cms-title-cell"><strong>{item.title}</strong><span>{item.slug} · {cmsSourceLabel(locale, item.source === 'cms' ? 'cms' : 'public')}</span></div></td><td>{item.audience}</td><td>{item.sections.length}</td><td><span className="cms-status" data-status={item.status}>{cmsStatusLabel(locale, item.status)}</span></td><td><div className="cms-row-actions"><button className="cms-icon-button" type="button" onClick={() => show(item)} aria-label={`${canWrite ? text('แก้ไข', 'Edit') : text('ดู', 'View')} ${item.title}`}><Edit3 aria-hidden="true" /></button>{canDelete ? <button className="cms-icon-button" type="button" onClick={() => remove(item)} aria-label={`${text('นำออก', 'Remove')} ${item.title}`}><Archive aria-hidden="true" /></button> : null}</div></td></tr>)}</tbody></table></div> : <div className="cms-empty"><BookOpen aria-hidden="true" /><p>{text('ไม่พบบทความที่ตรงกับตัวกรองปัจจุบัน', 'No learning records match the current filter.')}</p></div>}
      </section>

      {open ? <section className="cms-editor" ref={editorRef} aria-labelledby="learning-editor-title">
        <header className="cms-editor-header"><div><p className="cms-eyebrow">{editingId ? text('รายการความรู้', 'Learning record') : text('บทความใหม่', 'New article')}</p><h2 id="learning-editor-title">{editingId ? form.title || text('แก้ไขบทความ', 'Edit article') : text('เพิ่มบทความความรู้', 'Add learning article')}</h2><p>{text('จัดโครงสร้างเนื้อหาให้อ่านได้รวดเร็ว และระบุแหล่งที่มาให้ชัดเจน', 'Structure the content for fast scanning while keeping sources explicit.')}</p></div><button className="cms-icon-button" type="button" onClick={close} aria-label={text('ปิดตัวแก้ไขบทความ', 'Close learning editor')}><X aria-hidden="true" /></button></header>
        <form className="cms-form" onSubmit={save}>
          <div className="cms-form-grid">
            <label className="cms-field cms-field-full"><span>{text('ชื่อบทความ', 'Article title')}</span><input value={form.title} onChange={(event) => set('title', event.target.value)} onBlur={() => { if (!form.slug) set('slug', slugify(form.title)) }} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title ? <span className="cms-field-error">{fieldErrors.title}</span> : null}</label>
            <label className="cms-field"><span>{text('ข้อความเหนือหัวข้อ', 'Eyebrow')}</span><input value={form.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} disabled={!canWrite} /></label>
            <label className="cms-field"><span>Slug</span><input value={form.slug} onChange={(event) => set('slug', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.slug)} />{fieldErrors.slug ? <span className="cms-field-error">{fieldErrors.slug}</span> : null}</label>
            <label className="cms-field"><span>{text('สถานะ', 'Status')}</span><select value={form.status} onChange={(event) => set('status', event.target.value as CmsStatus)} disabled={!canWrite}><option value="draft">{cmsStatusLabel(locale, 'draft')}</option><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="archived">{cmsStatusLabel(locale, 'archived')}</option></select></label>
            <label className="cms-field"><span>{text('กลุ่มเป้าหมาย', 'Intended audience')}</span><input value={form.audience} onChange={(event) => set('audience', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.audience)} />{fieldErrors.audience ? <span className="cms-field-error">{fieldErrors.audience}</span> : null}</label>
            <label className="cms-field cms-field-full"><span>{text('คำอธิบาย', 'Description')}</span><textarea value={form.description} onChange={(event) => set('description', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.description)} />{fieldErrors.description ? <span className="cms-field-error">{fieldErrors.description}</span> : null}</label>
            <CmsImageUpload label={text('ภาพหลักของบทความ', 'Article hero image')} folder="learning" slug={form.slug} values={form.heroImage ? [form.heroImage] : []} onChange={(values) => set('heroImage', values[0] || '')} disabled={!canWrite} error={fieldErrors.heroImage} help={text('ภาพเสริมสำหรับการเผยแพร่หน้าความรู้ในอนาคต', 'Optional CMS image for future learning-page publishing.')} />
          </div>

          <div className="cms-repeaters"><div className="cms-repeater-head"><div><h3>{text('ส่วนเนื้อหาความรู้', 'Learning sections')}</h3><p className="cms-field-help">{text('ใช้หนึ่งส่วนต่อหนึ่งวัตถุประสงค์การเรียนรู้ที่ชัดเจน', 'Use one section per clear learning objective.')}</p></div>{canWrite ? <button className="cms-button-secondary" type="button" onClick={() => set('sections', [...form.sections, { bullets: [], heading: '', image: '', paragraphs: [] }])}><Plus aria-hidden="true" />{text('เพิ่มส่วน', 'Add section')}</button> : null}</div>{form.sections.map((section, index) => <fieldset className="cms-repeater" key={index}><div className="cms-repeater-head"><h3>{text('ส่วนที่', 'Section')} {index + 1}</h3>{canWrite && form.sections.length > 1 ? <button className="cms-button-danger" type="button" onClick={() => set('sections', form.sections.filter((_, sectionIndex) => sectionIndex !== index))}>{text('นำออก', 'Remove')}</button> : null}</div><label className="cms-field"><span>{text('หัวข้อ', 'Heading')}</span><input value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} disabled={!canWrite} /></label><CmsImageUpload label={text('ภาพประกอบส่วน', 'Section image')} folder="learning" slug={`${form.slug || 'article'}-section-${index + 1}`} values={section.image ? [section.image] : []} onChange={(values) => updateSection(index, { image: values[0] || '' })} disabled={!canWrite} help={text('ภาพอธิบายเสริมตามความเหมาะสม', 'Optional explanatory image.')} /><label className="cms-field"><span>{text('ย่อหน้า', 'Paragraphs')}</span><textarea value={section.paragraphs.join('\n\n')} onChange={(event) => updateSection(index, { paragraphs: paragraphs(event.target.value) })} disabled={!canWrite} /><span className="cms-field-help">{text('แยกย่อหน้าด้วยบรรทัดว่าง', 'Separate paragraphs with a blank line.')}</span></label><label className="cms-field"><span>{text('รายการย่อย', 'Bullets')}</span><textarea value={section.bullets.join('\n')} onChange={(event) => updateSection(index, { bullets: lines(event.target.value) })} disabled={!canWrite} /><span className="cms-field-help">{text('หนึ่งรายการต่อบรรทัด', 'One bullet per line.')}</span></label></fieldset>)}{fieldErrors.sections ? <p className="cms-field-error">{fieldErrors.sections}</p> : null}</div>

          <div className="cms-repeaters"><div className="cms-repeater-head"><div><h3>{text('แหล่งอ้างอิงทางการ', 'Official sources')}</h3><p className="cms-field-help">{text('ลิงก์ตรงไปยังแหล่งอ้างอิงที่น่าเชื่อถือตามความเหมาะสม', 'Link directly to authoritative references where appropriate.')}</p></div>{canWrite ? <button className="cms-button-secondary" type="button" onClick={() => set('sources', [...form.sources, { href: '', label: '' }])}><Plus aria-hidden="true" />{text('เพิ่มแหล่งอ้างอิง', 'Add source')}</button> : null}</div>{form.sources.map((source, index) => <fieldset className="cms-repeater" key={index}><div className="cms-repeater-head"><h3>{text('แหล่งอ้างอิงที่', 'Source')} {index + 1}</h3>{canWrite ? <button className="cms-button-danger" type="button" onClick={() => set('sources', form.sources.filter((_, sourceIndex) => sourceIndex !== index))}>{text('นำออก', 'Remove')}</button> : null}</div><label className="cms-field"><span>{text('ชื่อแสดง', 'Label')}</span><input value={source.label} onChange={(event) => updateSource(index, { label: event.target.value })} disabled={!canWrite} /></label><label className="cms-field"><span>URL</span><input type="url" value={source.href} onChange={(event) => updateSource(index, { href: event.target.value })} disabled={!canWrite} /></label></fieldset>)}{fieldErrors.sources ? <p className="cms-field-error">{fieldErrors.sources}</p> : null}</div>
          <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
          <div className="cms-form-actions"><button className="cms-button-secondary" type="button" onClick={close}>{text('ยกเลิก', 'Cancel')}</button>{canWrite ? <button className="cms-button" type="submit" disabled={busy}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกบทความ', 'Save article')}</button> : null}</div>
        </form>
      </section> : null}
    </>
  )
}
