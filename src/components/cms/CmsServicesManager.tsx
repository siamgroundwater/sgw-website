'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, Edit3, Plus, Save, Search, Wrench, X } from 'lucide-react'
import type { CmsServiceInput, CmsServiceRecord, CmsStatus } from '@/types/cms'
import { cmsSourceLabel, cmsStatusLabel, localizeCmsFieldErrors } from '@/lib/cms-locale'
import CmsImageUpload from './CmsImageUpload'
import { useCmsLanguage } from './CmsLanguage'

const blankService: CmsServiceInput = {
  blocks: [{ bullets: [], text: '', title: '' }],
  description: '',
  heroImage: '',
  key: 'survey',
  slug: '',
  status: 'draft',
  title: '',
}

const serviceKeys: CmsServiceInput['key'][] = ['survey', 'drilling', 'maintenance', 'consult']

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

export default function CmsServicesManager({ initialItems, canWrite, canDelete }: { initialItems: CmsServiceRecord[]; canWrite: boolean; canDelete: boolean }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const editorRef = useRef<HTMLElement>(null)
  const [items, setItems] = useState(initialItems)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | CmsStatus>('all')
  const [form, setForm] = useState<CmsServiceInput>(blankService)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase('th')
    return items.filter((item) => (status === 'all' || item.status === status) && (!clean || `${item.title} ${item.slug} ${item.key} ${item.description}`.toLocaleLowerCase('th').includes(clean)))
  }, [items, query, status])

  function set<K extends keyof CmsServiceInput>(key: K, value: CmsServiceInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function show(item?: CmsServiceRecord) {
    setEditingId(item?.id || null)
    setForm(item ? { ...item, blocks: item.blocks.map((block) => ({ ...block, bullets: [...block.bullets] })) } : { ...blankService, blocks: [{ bullets: [], text: '', title: '' }] })
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

  function updateBlock(index: number, patch: Partial<CmsServiceInput['blocks'][number]>) {
    set('blocks', form.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    setBusy(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const response = await fetch('/api/cms/services', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId || undefined }) })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string>; item?: CmsServiceRecord }
      if (!response.ok || !payload.item) {
        setError(text('ไม่สามารถบันทึกบริการได้', 'Could not save the service.'))
        setFieldErrors(localizeCmsFieldErrors(locale, payload.fields || {}))
        return
      }
      setItems((previous) => previous.some((item) => item.id === payload.item?.id) ? previous.map((item) => item.id === payload.item?.id ? payload.item! : item) : [payload.item!, ...previous])
      setEditingId(payload.item.id)
      setForm({ ...payload.item })
      setMessage(text('บันทึกบริการในพื้นที่ CMS ส่วนตัวแล้ว เว็บไซต์สาธารณะยังไม่เปลี่ยนแปลง', 'Service saved in the private CMS workspace. The public website is unchanged.'))
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อตัวแก้ไขบริการ CMS ได้', 'Could not reach the CMS service editor.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: CmsServiceRecord) {
    if (!canDelete || !window.confirm(th ? `นำ “${item.title}” ออกจากพื้นที่ CMS หรือไม่?` : `Remove “${item.title}” from the CMS workspace?`)) return
    setBusy(true)
    try {
      const response = await fetch(`/api/cms/services?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await response.json().catch(() => ({}))
      if (!response.ok) { setError(text('ไม่สามารถนำบริการออกได้', 'Could not remove the service.')); return }
      setItems((previous) => previous.filter((row) => row.id !== item.id))
      if (editingId === item.id) close()
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อตัวแก้ไขบริการ CMS ได้', 'Could not reach the CMS service editor.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="cms-panel">
        <header className="cms-panel-header"><div><h2>{text('คลังบริการ', 'Service library')}</h2><p>{th ? `แสดง ${filtered.length} จาก ${items.length} รายการบริการ` : `${filtered.length} of ${items.length} service records shown.`}</p></div>{canWrite ? <button className="cms-button" type="button" onClick={() => show()}><Plus aria-hidden="true" />{text('เพิ่มบริการ', 'New service record')}</button> : null}</header>
        <div className="cms-toolbar"><label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('ค้นหาบริการ', 'Search services')} aria-label={text('ค้นหาบริการ', 'Search services')} /></label><select className="cms-filter" value={status} onChange={(event) => setStatus(event.target.value as 'all' | CmsStatus)} aria-label={text('กรองบริการตามสถานะ', 'Filter services by status')}><option value="all">{text('ทุกสถานะ', 'All statuses')}</option><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{cmsStatusLabel(locale, 'draft')}</option><option value="archived">{cmsStatusLabel(locale, 'archived')}</option></select></div>
        {filtered.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>{text('บริการ', 'Service')}</th><th>{text('คีย์', 'Key')}</th><th>{text('ส่วนเนื้อหา', 'Blocks')}</th><th>{text('สถานะ', 'Status')}</th><th>{text('การจัดการ', 'Actions')}</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="cms-title-cell"><strong>{item.title}</strong><span>{item.slug} · {cmsSourceLabel(locale, item.source === 'cms' ? 'cms' : 'public')}</span></div></td><td>{item.key}</td><td>{item.blocks.length}</td><td><span className="cms-status" data-status={item.status}>{cmsStatusLabel(locale, item.status)}</span></td><td><div className="cms-row-actions"><button className="cms-icon-button" type="button" onClick={() => show(item)} aria-label={`${canWrite ? text('แก้ไข', 'Edit') : text('ดู', 'View')} ${item.title}`}><Edit3 aria-hidden="true" /></button>{canDelete ? <button className="cms-icon-button" type="button" onClick={() => remove(item)} aria-label={`${text('นำออก', 'Remove')} ${item.title}`}><Archive aria-hidden="true" /></button> : null}</div></td></tr>)}</tbody></table></div> : <div className="cms-empty"><Wrench aria-hidden="true" /><p>{text('ไม่พบบริการที่ตรงกับตัวกรองปัจจุบัน', 'No service records match the current filter.')}</p></div>}
      </section>

      {open ? <section className="cms-editor" ref={editorRef} aria-labelledby="service-editor-title">
        <header className="cms-editor-header"><div><p className="cms-eyebrow">{editingId ? text('รายการบริการ', 'Service record') : text('รายการใหม่', 'New record')}</p><h2 id="service-editor-title">{editingId ? form.title || text('แก้ไขบริการ', 'Edit service') : text('เพิ่มบริการ', 'Add service')}</h2><p>{text('ใช้ถ้อยคำที่ลูกค้าเข้าใจง่าย โดยยังคงความถูกต้องทางเทคนิค', 'Use clear customer-facing wording while preserving technical accuracy.')}</p></div><button className="cms-icon-button" type="button" onClick={close} aria-label={text('ปิดตัวแก้ไขบริการ', 'Close service editor')}><X aria-hidden="true" /></button></header>
        <form className="cms-form" onSubmit={save}>
          <div className="cms-form-grid">
            <label className="cms-field cms-field-full"><span>{text('ชื่อบริการ', 'Service title')}</span><input value={form.title} onChange={(event) => set('title', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title ? <span className="cms-field-error">{fieldErrors.title}</span> : null}</label>
            <label className="cms-field"><span>{text('คีย์บริการ', 'Service key')}</span><select value={form.key} onChange={(event) => { const key = event.target.value as CmsServiceInput['key']; set('key', key); if (!editingId) set('slug', key) }} disabled={!canWrite}>{serviceKeys.map((key) => <option key={key} value={key}>{key}</option>)}</select>{fieldErrors.key ? <span className="cms-field-error">{fieldErrors.key}</span> : null}</label>
            <label className="cms-field"><span>Slug</span><input value={form.slug} onChange={(event) => set('slug', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.slug)} />{fieldErrors.slug ? <span className="cms-field-error">{fieldErrors.slug}</span> : null}</label>
            <label className="cms-field"><span>{text('สถานะ', 'Status')}</span><select value={form.status} onChange={(event) => set('status', event.target.value as CmsStatus)} disabled={!canWrite}><option value="draft">{cmsStatusLabel(locale, 'draft')}</option><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="archived">{cmsStatusLabel(locale, 'archived')}</option></select></label>
            <CmsImageUpload label={text('ภาพหลัก', 'Hero image')} folder="services" slug={form.slug || form.key} values={form.heroImage ? [form.heroImage] : []} onChange={(values) => set('heroImage', values[0] || '')} disabled={!canWrite} error={fieldErrors.heroImage} help={text('อัปโหลดภาพใหม่ หรือกรอก HTTPS URL หรือพาธภายในที่มีอยู่', 'Upload a new image or enter an existing HTTPS URL or local path.')} />
            <label className="cms-field cms-field-full"><span>{text('คำอธิบายบริการ', 'Service description')}</span><textarea value={form.description} onChange={(event) => set('description', event.target.value)} disabled={!canWrite} aria-invalid={Boolean(fieldErrors.description)} />{fieldErrors.description ? <span className="cms-field-error">{fieldErrors.description}</span> : null}</label>
          </div>
          <div className="cms-repeaters"><div className="cms-repeater-head"><div><h3>{text('ส่วนรายละเอียดบริการ', 'Service detail blocks')}</h3><p className="cms-field-help">{text('แต่ละส่วนควรอธิบายพื้นที่งานที่ชัดเจนหนึ่งส่วน', 'Each block explains one distinct area of work.')}</p></div>{canWrite ? <button className="cms-button-secondary" type="button" onClick={() => set('blocks', [...form.blocks, { bullets: [], text: '', title: '' }])}><Plus aria-hidden="true" />{text('เพิ่มส่วน', 'Add block')}</button> : null}</div>{form.blocks.map((block, index) => <fieldset className="cms-repeater" key={index}><div className="cms-repeater-head"><h3>{text('ส่วน', 'Block')} {index + 1}</h3>{canWrite && form.blocks.length > 1 ? <button className="cms-button-danger" type="button" onClick={() => set('blocks', form.blocks.filter((_, blockIndex) => blockIndex !== index))}>{text('นำออก', 'Remove')}</button> : null}</div><label className="cms-field"><span>{text('หัวข้อ', 'Heading')}</span><input value={block.title} onChange={(event) => updateBlock(index, { title: event.target.value })} disabled={!canWrite} /></label><label className="cms-field"><span>{text('คำอธิบาย', 'Description')}</span><textarea value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} disabled={!canWrite} /></label><label className="cms-field"><span>{text('รายการย่อย', 'Bullets')}</span><textarea value={block.bullets.join('\n')} onChange={(event) => updateBlock(index, { bullets: lines(event.target.value) })} disabled={!canWrite} /><span className="cms-field-help">{text('หนึ่งรายการต่อบรรทัด', 'One bullet per line.')}</span></label></fieldset>)}{fieldErrors.blocks ? <p className="cms-field-error">{fieldErrors.blocks}</p> : null}</div>
          <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
          <div className="cms-form-actions"><button className="cms-button-secondary" type="button" onClick={close}>{text('ยกเลิก', 'Cancel')}</button>{canWrite ? <button className="cms-button" type="submit" disabled={busy}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกบริการ', 'Save service')}</button> : null}</div>
        </form>
      </section> : null}
    </>
  )
}
