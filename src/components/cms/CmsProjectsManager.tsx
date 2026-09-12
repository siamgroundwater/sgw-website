'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Eye, FolderKanban, ImageIcon, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { CMS_PROJECT_CATEGORIES, CMS_PROJECT_WORK_TYPES, type CmsProjectRecord } from '@/types/cms'
import { cmsDateLocale, cmsProjectCategoryLabel, cmsProjectWorkTypeLabel } from '@/lib/cms-locale'
import { useCmsLanguage } from './CmsLanguage'
import './CmsLibraryImprovements.css'

export type ProjectLibraryQuery = { query: string; category: string; workType: string; sort: string; page: number; pageSize: number; view: string }
export type ProjectLibraryResult = { items: CmsProjectRecord[]; total: number; page: number; pageSize: number; totalPages: number }

export default function CmsProjectsManager({ canDelete, canWrite, initialResult, initialQuery }: {
  canDelete: boolean; canWrite: boolean; initialResult: ProjectLibraryResult; initialQuery: ProjectLibraryQuery
}) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const [filters, setFilters] = useState(initialQuery)
  const [result, setResult] = useState(initialResult)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<CmsProjectRecord | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [dialogError, setDialogError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestNumber = useRef(0)
  const mutationId = useRef('')
  const trash = filters.view === 'trash'

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const sequence = ++requestNumber.current
    setLoading(true)
    const params = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]))
    try {
      const response = await fetch('/api/cms/projects?' + params, { cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error(response.status === 401 ? 'session' : 'load')
      const data = await response.json() as ProjectLibraryResult
      if (sequence !== requestNumber.current) return
      setResult(data); setError('')
      window.history.replaceState(null, '', '/cms/projects?' + params)
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught instanceof Error && caught.message === 'session'
        ? (locale === 'th' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' : 'Your session expired. Please sign in again.')
        : (locale === 'th' ? 'โหลดผลงานไม่สำเร็จ กดรีเฟรชเพื่อลองอีกครั้ง' : 'Could not load projects. Select Refresh to retry.'))
    } finally { if (sequence === requestNumber.current) setLoading(false) }
  }, [filters, locale])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 250)
    return () => { window.clearTimeout(timer); abortRef.current?.abort() }
  }, [refresh])
  useEffect(() => {
    const onReturn = () => { if (document.visibilityState === 'visible') void refresh() }
    const onStorage = (event: StorageEvent) => { if (event.key === 'sgw-cms-projects-changed') onReturn() }
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('focus', onReturn); document.removeEventListener('visibilitychange', onReturn); window.removeEventListener('storage', onStorage) }
  }, [refresh])

  function filter(key: keyof ProjectLibraryQuery, value: string | number) {
    setFilters(previous => ({ ...previous, [key]: value, page: key === 'page' ? Number(value) : 1 }))
    setMessage('')
  }
  function openConfirmation(item: CmsProjectRecord, opener: HTMLElement) {
    openerRef.current = opener
    mutationId.current = crypto.randomUUID()
    setSelected(item); setConfirmation(''); setDialogError('')
    dialogRef.current?.showModal()
  }
  function closeConfirmation() {
    if (busy) return
    dialogRef.current?.close(); setSelected(null); openerRef.current?.focus()
  }
  async function mutate() {
    if (!selected || !canDelete || confirmation !== selected.title || busy) return
    setBusy(true); setDialogError('')
    try {
      const response = await fetch('/api/cms/projects', {
        method: trash ? 'PATCH' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, expectedUpdatedAt: selected.updatedAt, operationId: mutationId.current, ...(trash ? { action: 'restore' } : {}) }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setDialogError(payload.fields?.slug ? text('ชื่อ slug ซ้ำกับผลงานที่มีอยู่ กรุณาแก้ชื่อรายการที่ซ้ำก่อนกู้คืน', 'This slug is used by another project. Rename that project before restoring.') : response.status === 409
          ? text('รายการนี้เปลี่ยนไปแล้ว ปิดกล่องนี้แล้วรีเฟรชก่อนลองใหม่', 'This project changed. Close this dialog and refresh before retrying.')
          : response.status === 401 ? text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Please sign in again.')
          : text('ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง', 'The action failed. Please retry.'))
        return
      }
      dialogRef.current?.close(); setSelected(null); openerRef.current?.focus()
      setMessage(trash ? text('กู้คืนผลงานแล้ว และแสดงบนเว็บไซต์ทันที', 'Project restored and visible on the website.') : text('ย้ายผลงานไปถังขยะแล้ว สามารถกู้คืนได้', 'Project moved to Trash. You can restore it.'))
      try { localStorage.setItem('sgw-cms-projects-changed', String(Date.now())) } catch {}
      await refresh()
    } catch { setDialogError(text('การเชื่อมต่อขัดข้อง กดอีกครั้งเพื่อตรวจสอบและทำรายการเดิมต่ออย่างปลอดภัย', 'Connection interrupted. Retry to safely resume the same action.')) }
    finally { setBusy(false) }
  }

  return <section className="cms-panel cms-project-library">
    <header className="cms-panel-header cms-panel-header-single">
      <div><h2>{trash ? text('ถังขยะ', 'Trash') : text('คลังผลงาน', 'Project library')}</h2><p>{trash ? text('รายการที่นำออกยังคงเก็บไว้ ไม่มีการลบถาวรอัตโนมัติ การกู้คืนจะแสดงผลงานบนเว็บไซต์ทันที', 'Removed records are retained without automatic permanent deletion. Restoring makes a project visible immediately.') : text('บันทึกแล้วแสดงบนเว็บไซต์ทันที', 'Saved projects appear on the website immediately.')}</p></div>
      <div className="cms-library-actions">
        {canWrite && <a className="cms-button" href="/cms/projects/new" target="_blank" rel="noopener noreferrer"><Plus aria-hidden="true" />{text('เพิ่มผลงาน', 'New project')}</a>}
        {canDelete && <button className="cms-button-secondary" onClick={() => filter('view', trash ? 'active' : 'trash')} type="button">{trash ? <FolderKanban aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{trash ? text('ผลงานทั้งหมด', 'Projects') : text('ถังขยะ', 'Trash')}</button>}
        <button className="cms-button-secondary" onClick={() => void refresh()} type="button" disabled={loading}><RefreshCw aria-hidden="true" />{text('รีเฟรช', 'Refresh')}</button>
      </div>
    </header>
    <div className="cms-library-filters">
      <label className="cms-search"><Search aria-hidden="true" /><input value={filters.query} onChange={event => filter('query', event.target.value)} placeholder={text('ค้นหาผลงานทุกภาษา', 'Search projects in any language')} aria-label={text('ค้นหาผลงาน', 'Search projects')} /></label>
      <label className="cms-field"><span>{text('หมวดหมู่', 'Category')}</span><select value={filters.category} onChange={event => filter('category', event.target.value)}><option value="">{text('ทุกหมวดหมู่', 'All categories')}</option>{CMS_PROJECT_CATEGORIES.map(value => <option key={value} value={value}>{cmsProjectCategoryLabel(locale, value)}</option>)}</select></label>
      <label className="cms-field"><span>{text('ประเภทงาน', 'Work type')}</span><select value={filters.workType} onChange={event => filter('workType', event.target.value)}><option value="">{text('ทุกประเภท', 'All work types')}</option>{CMS_PROJECT_WORK_TYPES.map(value => <option key={value} value={value}>{cmsProjectWorkTypeLabel(locale, value)}</option>)}</select></label>
      <label className="cms-field"><span>{text('เรียงตาม', 'Sort by')}</span><select value={filters.sort} onChange={event => filter('sort', event.target.value)}><option value="updated">{text('แก้ไขล่าสุด', 'Recently updated')}</option><option value="year">{text('ปีล่าสุด', 'Newest year')}</option><option value="title">{text('ชื่อผลงาน', 'Title')}</option></select></label>
      <label className="cms-field"><span>{text('รายการต่อหน้า', 'Per page')}</span><select value={filters.pageSize} onChange={event => filter('pageSize', Number(event.target.value))}>{[12,24,48].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <div aria-live="polite">{error && <p className="cms-error">{error}</p>}{message && <p className="cms-message">{message}</p>}<p className="cms-library-count">{loading ? text('กำลังโหลด...', 'Loading...') : text('พบ ' + result.total + ' รายการ · หน้า ' + result.page + ' จาก ' + Math.max(1,result.totalPages), result.total + ' projects · Page ' + result.page + ' of ' + Math.max(1,result.totalPages))}</p></div>
    <div aria-busy={loading}>
      {result.items.length ? <div className="cms-project-grid">{result.items.map(item => <article className="cms-project-card" key={item.id}>
        <div className="cms-project-card-media">{item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <div className="cms-project-card-placeholder"><ImageIcon aria-hidden="true" /><span>{text('ไม่มีภาพปก', 'No cover image')}</span></div>}</div>
        <div className="cms-project-card-body"><div className="cms-project-card-heading"><h3>{!th && item.translations.en.title || item.title}</h3></div>
          <div className="cms-project-card-meta">{item.year && <span>{item.year}</span>}<span>{!th && item.translations.en.location || item.location || text('ไม่มีสถานที่', 'No location')}</span></div>
          <p className="cms-project-card-type">{item.workTypes.map(value => cmsProjectWorkTypeLabel(locale,value)).join(' · ') || text('ยังไม่ระบุประเภทงาน', 'No work type')}</p>
          <p className="cms-project-category">{item.category.map(value => cmsProjectCategoryLabel(locale,value)).join(' · ')}</p>
          <footer className="cms-project-card-footer"><span>{text('อัปเดต', 'Updated')} {new Intl.DateTimeFormat(cmsDateLocale(locale),{dateStyle:'medium'}).format(new Date(item.updatedAt))}</span>
            <div className="cms-project-card-actions">{!trash && <>
              <a className="cms-button-secondary" href={'/cms/projects/' + item.id} target="_blank" rel="noopener noreferrer" aria-label={text('เปิด ', 'Open ') + item.title}>{canWrite ? <Pencil aria-hidden="true" /> : <Eye aria-hidden="true" />}{canWrite ? text('แก้ไข', 'Edit') : text('ดู', 'View')}</a>
              {canWrite && <a className="cms-button-secondary" href={'/cms/projects/new?sourceProjectId=' + item.id} target="_blank" rel="noopener noreferrer" aria-label={text('คัดลอก ', 'Duplicate ') + item.title}><Copy aria-hidden="true" />{text('คัดลอก', 'Duplicate')}</a>}
            </>}{canDelete && <button className={trash ? 'cms-button-secondary' : 'cms-button-danger'} type="button" onClick={event => openConfirmation(item,event.currentTarget)} disabled={busy} aria-label={(trash ? text('กู้คืน ', 'Restore ') : text('นำออก ', 'Remove ')) + item.title}>{trash ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{trash ? text('กู้คืน', 'Restore') : text('นำออก', 'Remove')}</button>}</div>
          </footer>
        </div>
      </article>)}</div> : <div className="cms-empty"><FolderKanban aria-hidden="true" /><p>{text('ไม่พบผลงานที่ตรงกับตัวกรอง', 'No projects match these filters.')}</p></div>}
    </div>
    <nav className="cms-library-pagination" aria-label={text('หน้าผลงาน', 'Project pages')}><button className="cms-button-secondary" type="button" disabled={result.page <= 1 || loading} onClick={() => filter('page',result.page-1)}>{text('ก่อนหน้า', 'Previous')}</button><span>{result.page} / {Math.max(1,result.totalPages)}</span><button className="cms-button-secondary" type="button" disabled={result.page >= result.totalPages || loading} onClick={() => filter('page',result.page+1)}>{text('ถัดไป', 'Next')}</button></nav>
    <dialog ref={dialogRef} className="cms-confirm-dialog cms-native-confirm" aria-labelledby="remove-project-title" aria-describedby="remove-project-description" onCancel={event => { event.preventDefault(); closeConfirmation() }}>
      <header className="cms-confirm-header"><h2 id="remove-project-title">{trash ? text('กู้คืนผลงานนี้?', 'Restore this project?') : text('นำผลงานนี้ออก?', 'Remove this project?')}</h2><button type="button" className="cms-icon-button" disabled={busy} onClick={closeConfirmation} aria-label={text('ปิด', 'Close')}><X aria-hidden="true" /></button></header>
      <p id="remove-project-description">{trash ? text('กู้คืนแล้วผลงานจะแสดงบนเว็บไซต์ทันที', 'Restoring makes this project visible on the website immediately.') : text('ผลงานจะหายจากเว็บไซต์ทันที และสามารถกู้คืนจากถังขยะได้', 'This project will leave the website immediately. You can restore it from Trash.')}</p>
      <label className="cms-field"><span>{text('พิมพ์ชื่อผลงานให้ตรงกันเพื่อยืนยัน', 'Type the exact project title to confirm')}</span><strong className="cms-confirm-phrase">{selected?.title}</strong><input autoFocus value={confirmation} autoComplete="off" disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>
      <div role="status">{dialogError && <p className="cms-error">{dialogError}</p>}</div><div className="cms-confirm-actions"><button type="button" className="cms-button-secondary" disabled={busy} onClick={closeConfirmation}>{text('ยกเลิก', 'Cancel')}</button><button type="button" className={trash ? 'cms-button' : 'cms-button-danger'} disabled={busy || !selected || confirmation !== selected.title} onClick={() => void mutate()}>{busy ? text('กำลังดำเนินการ...', 'Working...') : trash ? text('กู้คืน', 'Restore') : text('นำออก', 'Remove')}</button></div>
    </dialog>
  </section>
}
