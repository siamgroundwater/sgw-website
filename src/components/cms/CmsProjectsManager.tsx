'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, FolderKanban, ImageIcon, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import { CMS_PROJECT_CATEGORIES, type CmsProjectCategory, type CmsProjectRecord, type CmsStatus } from '@/types/cms'
import { cmsDateLocale, cmsProjectCategoryLabel, cmsProjectWorkTypeLabel, cmsSourceLabel, cmsStatusLabel } from '@/lib/cms-locale'
import { useCmsLanguage } from './CmsLanguage'

const categoryValues: CmsProjectCategory[] = [...CMS_PROJECT_CATEGORIES]

export default function CmsProjectsManager({
  canDelete,
  canWrite,
  initialItems,
}: {
  canDelete: boolean
  canWrite: boolean
  initialItems: CmsProjectRecord[]
}) {
  const { locale } = useCmsLanguage()
  const copy = locale === 'th' ? {
    allCategories: 'ทุกหมวดหมู่', allStatuses: 'ทุกสถานะ', cancel: 'ยกเลิก', closeConfirmation: 'ปิดการยืนยันการลบ',
    confirmHelp: 'ปุ่มนำผลงานออกจะยังใช้ไม่ได้ จนกว่าชื่อจะตรงกันทุกตัวอักษร', confirmLabel: 'พิมพ์ชื่อผลงานให้ตรงกันทุกตัวอักษรเพื่อยืนยัน:',
    edit: 'แก้ไข', empty: 'ไม่พบผลงานที่ตรงกับการค้นหาและตัวกรองปัจจุบัน', errorReach: 'ไม่สามารถเชื่อมต่อบริการผลงาน CMS ได้', errorRemove: 'ไม่สามารถนำผลงานออได้',
    filterCategory: 'กรองผลงานตามหมวดหมู่', filterStatus: 'กรองผลงานตามสถานะ', library: 'คลังผลงาน', locationMissing: 'ยังไม่ได้เพิ่มสถานที่',
    newProject: 'เพิ่มผลงาน', noCover: 'ไม่มีภาพปก', remove: 'นำออก', removeDescription: 'ระบบจะเก็บรายการนี้เป็นรายการที่นำออกและคงประวัติการใช้งานไว้ หากผลงานเผยแพร่อยู่ ระบบจะนำออกจากเว็บไซต์สาธารณะทันที',
    removeProject: 'นำผลงานออ', removeQuestion: 'นำผลงานนี้ออหรือไม่?', removing: 'กำลังนำออ...', search: 'ค้นหาชื่อ สถานที่ slug หรือหมวดหมู่', searchLabel: 'ค้นหาผลงาน',
    shown: (filtered: number, total: number) => `แสดง ${filtered} จาก ${total} รายการ การบันทึกฉบับร่างไม่กระทบเว็บไซต์จนกว่าจะกดเผยแพร่`, strict: 'การยืนยันแบบเข้มงวด', typeMissing: 'ยังไม่ได้เพิ่มประเภทงาน', updated: 'อัปเดต', view: 'ดู',
  } : {
    allCategories: 'All categories', allStatuses: 'All statuses', cancel: 'Cancel', closeConfirmation: 'Close removal confirmation', confirmHelp: 'The Remove project button stays disabled until the title matches exactly.', confirmLabel: 'Type the exact project title to confirm:',
    edit: 'Edit', empty: 'No projects match the current search and filter.', errorReach: 'Could not reach the CMS project service.', errorRemove: 'Could not remove the project.', filterCategory: 'Filter projects by category', filterStatus: 'Filter projects by status', library: 'Project library', locationMissing: 'Location not added',
    newProject: 'New project', noCover: 'No cover image', remove: 'Remove', removeDescription: 'This archives the record and retains its audit history. If it is published, it will be removed from the public website immediately.', removeProject: 'Remove project', removeQuestion: 'Remove this project?', removing: 'Removing...', search: 'Search title, location, slug, or category', searchLabel: 'Search projects',
    shown: (filtered: number, total: number) => `${filtered} of ${total} records shown. Draft saves stay private until Publish is selected.`, strict: 'Strict confirmation', typeMissing: 'Work type not added', updated: 'Updated', view: 'View',
  }
  const [items, setItems] = useState(initialItems)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | CmsStatus>('all')
  const [category, setCategory] = useState<'all' | CmsProjectCategory>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<CmsProjectRecord | null>(null)
  const [removalConfirmation, setRemovalConfirmation] = useState('')
  const confirmationInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase('th')
    return items.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status
      const matchesCategory = category === 'all' || item.category.includes(category)
      const haystack = `${item.title} ${item.location} ${item.translations.en.title} ${item.translations.en.location} ${item.slug} ${item.category.map((value) => cmsProjectCategoryLabel(locale, value)).join(' ')} ${item.workTypes.map((value) => cmsProjectWorkTypeLabel(locale, value)).join(' ')}`.toLocaleLowerCase(locale)
      return matchesStatus && matchesCategory && (!cleanQuery || haystack.includes(cleanQuery))
    })
  }, [category, items, locale, query, status])

  useEffect(() => {
    if (!pendingRemoval) return
    confirmationInputRef.current?.focus()
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        setPendingRemoval(null)
        setRemovalConfirmation('')
        setError('')
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [busy, pendingRemoval])

  function requestRemoval(item: CmsProjectRecord) {
    if (!canDelete) return
    setPendingRemoval(item)
    setRemovalConfirmation('')
    setError('')
  }

  function cancelRemoval() {
    if (busy) return
    setPendingRemoval(null)
    setRemovalConfirmation('')
    setError('')
  }

  async function remove() {
    if (!canDelete || !pendingRemoval || removalConfirmation !== pendingRemoval.title) return
    const item = pendingRemoval
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/cms/projects?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(copy.errorRemove)
        return
      }
      setItems((previous) => previous.filter((row) => row.id !== item.id))
      setPendingRemoval(null)
      setRemovalConfirmation('')
    } catch {
      setError(copy.errorReach)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cms-panel">
        <header className="cms-panel-header cms-panel-header-single">
          <div><h2>{copy.library}</h2><p>{copy.shown(filtered.length, items.length)}</p></div>
          {canWrite ? <a className="cms-button" href="/cms/projects/new" target="_blank" rel="noopener noreferrer"><Plus aria-hidden="true" />{copy.newProject}</a> : null}
        </header>

        <div className="cms-toolbar">
          <label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.searchLabel} /></label>
          <select className="cms-filter" value={category} onChange={(event) => setCategory(event.target.value as 'all' | CmsProjectCategory)} aria-label={copy.filterCategory}>
            <option value="all">{copy.allCategories}</option>{categoryValues.map((value) => <option key={value} value={value}>{cmsProjectCategoryLabel(locale, value)}</option>)}
          </select>
          <select className="cms-filter" value={status} onChange={(event) => setStatus(event.target.value as 'all' | CmsStatus)} aria-label={copy.filterStatus}>
            <option value="all">{copy.allStatuses}</option><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{cmsStatusLabel(locale, 'draft')}</option><option value="archived">{cmsStatusLabel(locale, 'archived')}</option>
          </select>
        </div>

        <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}</div>

        {filtered.length ? (
          <div className="cms-project-grid">
            {filtered.map((item) => {
              const displayTitle = locale === 'en' ? item.translations.en.title || item.title : item.title
              const displayLocation = locale === 'en' ? item.translations.en.location || item.location : item.location
              return <article className="cms-project-card" key={item.id}>
                <div className="cms-project-card-media">
                  {item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <div className="cms-project-card-placeholder"><ImageIcon aria-hidden="true" /><span>{copy.noCover}</span></div>}
                  <div className="cms-project-card-badges">
                    <span className="cms-status" data-status={item.status}>{cmsStatusLabel(locale, item.status)}</span>
                  </div>
                </div>

                <div className="cms-project-card-body">
                  <div className="cms-project-card-heading">
                    <h3>{displayTitle}</h3>
                  </div>

                  <div className="cms-project-card-meta">
                    {item.year ? <span>{item.year}</span> : null}
                    <span>{displayLocation || copy.locationMissing}</span>
                  </div>

                  <p className="cms-project-card-type">{item.workTypes.map((value) => cmsProjectWorkTypeLabel(locale, value)).join(' · ') || copy.typeMissing}</p>
                  <p className="cms-project-category">{item.category.map((value) => cmsProjectCategoryLabel(locale, value)).join(' · ')}</p>

                  <footer className="cms-project-card-footer">
                    <div className="cms-project-card-source"><strong>{cmsSourceLabel(locale, item.source === 'cms' ? 'cms' : 'public')}</strong><span>{copy.updated} {new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium' }).format(new Date(item.updatedAt))}</span></div>
                    <div className="cms-project-card-actions">
                      <a className="cms-button-secondary" href={`/cms/projects/${item.id}`} target="_blank" rel="noopener noreferrer" aria-label={`${canWrite ? copy.edit : copy.view} ${item.title}`}>{canWrite ? <Pencil aria-hidden="true" /> : <Eye aria-hidden="true" />}{canWrite ? copy.edit : copy.view}</a>
                      {canDelete ? <button className="cms-button-danger" type="button" onClick={() => requestRemoval(item)} disabled={busy} aria-label={`${copy.remove} ${item.title}`}><Trash2 aria-hidden="true" />{copy.remove}</button> : null}
                    </div>
                  </footer>
                </div>
              </article>
            })}
          </div>
        ) : <div className="cms-empty"><FolderKanban aria-hidden="true" /><p>{copy.empty}</p></div>}

        {pendingRemoval ? (
          <div className="cms-confirm-backdrop" role="presentation">
            <section className="cms-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-project-title" aria-describedby="remove-project-description">
              <header className="cms-confirm-header">
                <span className="cms-confirm-icon"><TriangleAlert aria-hidden="true" /></span>
                <div><p className="cms-eyebrow">{copy.strict}</p><h2 id="remove-project-title">{copy.removeQuestion}</h2></div>
                <button className="cms-icon-button" type="button" onClick={cancelRemoval} disabled={busy} aria-label={copy.closeConfirmation}><X aria-hidden="true" /></button>
              </header>

              <div className="cms-confirm-warning" id="remove-project-description">
                <strong>{pendingRemoval.title}</strong>
                <p>{copy.removeDescription}</p>
              </div>

              <label className="cms-field">
                <span>{copy.confirmLabel}</span>
                <strong className="cms-confirm-phrase">{pendingRemoval.title}</strong>
                <input ref={confirmationInputRef} value={removalConfirmation} onChange={(event) => setRemovalConfirmation(event.target.value)} autoComplete="off" disabled={busy} aria-invalid={Boolean(removalConfirmation && removalConfirmation !== pendingRemoval.title)} />
                <span className="cms-field-help">{copy.confirmHelp}</span>
              </label>

              <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}</div>
              <div className="cms-confirm-actions">
                <button className="cms-button-secondary" type="button" onClick={cancelRemoval} disabled={busy}>{copy.cancel}</button>
                <button className="cms-button-danger" type="button" onClick={remove} disabled={busy || removalConfirmation !== pendingRemoval.title}><Trash2 aria-hidden="true" />{busy ? copy.removing : copy.removeProject}</button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
  )
}
