'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, Plus, Save, Search, Trash2, UserRound, X } from 'lucide-react'
import { cmsDateLocale, cmsRoleDescription, cmsRoleLabel, cmsStatusLabel } from '@/lib/cms-locale'
import { cmsUserErrorMessage, validateCmsUserForm, type CmsUserField, type CmsUserErrorCode } from '@/lib/cms-access'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import type { CmsRole, CmsStatus, CmsUserRecord } from '@/types/cms'
import { useCmsLanguage } from './CmsLanguage'

type UserForm = { email: string; name: string; password: string; role: CmsRole; status: CmsStatus; username: string }
const blankUser: UserForm = { email: '', name: '', password: '', role: 'editor', status: 'active', username: '' }
const userForm = (user: CmsUserRecord): UserForm => ({ email: user.email, name: user.name, password: '', role: user.role, status: user.status, username: user.username })

export default function CmsUsersManager({ initialUsers, currentUserId }: { initialUsers: CmsUserRecord[]; currentUserId: string }) {
  const { locale } = useCmsLanguage()
  const router = useRouter()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const editorRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState<UserForm>(blankUser)
  const [baseline, setBaseline] = useState(JSON.stringify(blankUser))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Partial<Record<CmsUserField, CmsUserErrorCode>>>({})
  const [message, setMessage] = useState('')
  const dirty = open && JSON.stringify(form) !== baseline
  const discardMessage = text('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการทิ้งการเปลี่ยนแปลงหรือไม่?', 'Discard your unsaved changes?')
  const self = editingId === currentUserId

  useEffect(() => {
    if (!dirty && !busy) return
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = '' }
    function beforeLeave(event: Event) { if (busy || !window.confirm(discardMessage)) event.preventDefault() }
    function followLink(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || event.defaultPrevented || anchor.target === '_blank' || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.getAttribute('href')?.startsWith('#')) return
      if (busy || !window.confirm(discardMessage)) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('sgw-cms-before-leave', beforeLeave)
    document.addEventListener('click', followLink, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('sgw-cms-before-leave', beforeLeave)
      document.removeEventListener('click', followLink, true)
    }
  }, [dirty, busy, discardMessage])

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return users.filter((user) => (!clean || `${user.name} ${user.username} ${user.email} ${cmsRoleLabel(locale, user.role)}`.toLowerCase().includes(clean)) && (!roleFilter || user.role === roleFilter) && (!statusFilter || user.status === statusFilter))
  }, [query, users, roleFilter, statusFilter, locale])

  function focusField(field: string) {
    window.requestAnimationFrame(() => editorRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${field}"]`)?.focus())
  }
  function show(user?: CmsUserRecord) {
    if (busy || (dirty && !window.confirm(discardMessage))) return
    returnFocusRef.current = document.activeElement as HTMLElement
    const next = user ? userForm(user) : { ...blankUser }
    setEditingId(user?.id || null)
    setForm(next)
    setBaseline(JSON.stringify(next))
    setError('')
    setFields({})
    setMessage('')
    setOpen(true)
    focusField('name')
  }
  function close() {
    if (busy || (dirty && !window.confirm(discardMessage))) return
    setOpen(false)
    setEditingId(null)
    setForm({ ...blankUser })
    setFields({})
    setError('')
    window.requestAnimationFrame(() => returnFocusRef.current?.focus())
  }
  function fieldError(field: CmsUserField) {
    return fields[field] ? <span className="cms-access-error" id={`user-${field}-error`}>{cmsUserErrorMessage(fields[field], locale)}</span> : null
  }
  function fieldProps(field: CmsUserField) {
    return { name: field, 'aria-invalid': Boolean(fields[field]), 'aria-describedby': fields[field] ? `user-${field}-error` : undefined }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const errors = validateCmsUserForm(form, Boolean(editingId))
    setFields(errors)
    setError('')
    setMessage('')
    const first = Object.keys(errors)[0]
    if (first) {
      setError(text('ตรวจสอบช่องที่ระบุด้านล่าง', 'Check the highlighted fields below.'))
      focusField(first)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/cms/users', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId || undefined }) })
      const payload = (await response.json().catch(() => ({}))) as { code?: CmsUserErrorCode; field?: CmsUserField; user?: CmsUserRecord }
      if (handleCmsUnauthorized(response)) { setError(text('เซสชันหมดอายุ เข้าสู่ระบบในแท็บใหม่แล้วกลับมาบันทึก ข้อมูลในแบบฟอร์มยังอยู่', 'Session expired. Sign in in a new tab, then return to save. Your form is still here.')); return }
      if (!response.ok || !payload.user) {
        setError(payload.code ? cmsUserErrorMessage(payload.code, locale) : text('ไม่สามารถบันทึกผู้ใช้ CMS ได้ ลองอีกครั้ง', 'Could not save the CMS user. Try again.'))
        if (payload.field && payload.code) { setFields({ [payload.field]: payload.code }); focusField(payload.field) }
        return
      }
      const saved = payload.user
      setUsers((previous) => previous.some((user) => user.id === saved.id) ? previous.map((user) => user.id === saved.id ? saved : user) : [saved, ...previous])
      setEditingId(saved.id)
      const next = userForm(saved)
      setForm(next)
      setBaseline(JSON.stringify(next))
      setMessage(text('บันทึกผู้ใช้ CMS แล้ว', 'CMS user saved.'))
      if (saved.id === currentUserId) router.refresh()
    } catch {
      setError(text('การเชื่อมต่อขัดข้อง ตรวจสอบรายการก่อนลองบันทึกอีกครั้ง เพื่อหลีกเลี่ยงการเพิ่มบัญชีซ้ำ', 'Connection interrupted. Check the user list before retrying to avoid adding the same account twice.'))
    } finally { setBusy(false) }
  }

  async function remove(user: CmsUserRecord) {
    if (busy || !window.confirm(th ? `ยกเลิกสิทธิ์เข้าถึง CMS ของ “${user.name}” หรือไม่?` : `Remove CMS access for “${user.name}”?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/cms/users?id=${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({})) as { code?: CmsUserErrorCode }
      if (handleCmsUnauthorized(response)) { setError(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบในแท็บใหม่', 'Session expired. Sign in in a new tab.')); return }
      if (!response.ok) { setError(payload.code ? cmsUserErrorMessage(payload.code, locale) : text('ไม่สามารถลบผู้ใช้ CMS ได้', 'Could not remove the CMS user.')); return }
      setUsers((previous) => previous.filter((row) => row.id !== user.id))
      if (editingId === user.id) { setOpen(false); setEditingId(null); setForm({ ...blankUser }) }
      setMessage(th ? `ยกเลิกสิทธิ์ของ ${user.name} แล้ว` : `Removed access for ${user.name}.`)
    } catch { setError(text('ไม่สามารถเชื่อมต่อบริการผู้ใช้ CMS ได้', 'Could not reach the CMS user service.')) }
    finally { setBusy(false) }
  }

  const labels = [text('ผู้ใช้', 'User'), text('บทบาท', 'Role'), text('สถานะ', 'Status'), text('เข้าสู่ระบบล่าสุด', 'Last login'), text('การจัดการ', 'Actions')]
  return <>
    <section className="cms-panel">
      <header className="cms-panel-header cms-panel-header-single"><div><h2>{text('สิทธิ์เข้าถึง CMS', 'CMS access')}</h2><p>{text('กำหนดสิทธิ์เท่าที่แต่ละคนจำเป็น ต้องมีผู้ดูแลที่เปิดใช้งานอย่างน้อยหนึ่งคน', 'Assign only the access each person needs. Keep at least one active administrator.')}</p></div><button className="cms-button" type="button" onClick={() => show()} disabled={busy}><Plus aria-hidden="true" />{text('เพิ่มผู้ใช้', 'Add user')}</button></header>
      <div className="cms-audit-filters">
        <label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('ค้นหาผู้ใช้', 'Search users')} aria-label={text('ค้นหาผู้ใช้ CMS', 'Search CMS users')} /></label>
        <label className="cms-field"><span>{labels[1]}</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">{text('ทุกบทบาท', 'All roles')}</option>{(['admin', 'editor', 'viewer'] as const).map((role) => <option key={role} value={role}>{cmsRoleLabel(locale, role)}</option>)}</select></label>
        <label className="cms-field"><span>{labels[2]}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{text('ทุกสถานะ', 'All statuses')}</option>{(['active', 'draft', 'archived'] as const).map((status) => <option key={status} value={status}>{status === 'active' ? cmsStatusLabel(locale, status) : status === 'draft' ? text('ปิดใช้งาน', 'Disabled') : text('เก็บถาวร / ปิดใช้งาน', 'Archived / disabled')}</option>)}</select></label>
      </div>
      {filtered.length ? <div className="cms-table-wrap"><table className="cms-table cms-access-table" role="table"><thead role="rowgroup"><tr role="row">{labels.map((label) => <th scope="col" role="columnheader" key={label}>{label}</th>)}</tr></thead><tbody role="rowgroup">{filtered.map((user) => <tr role="row" key={user.id}>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[0]}</span><div className="cms-title-cell"><strong>{user.name}{user.id === currentUserId ? text(' (คุณ)', ' (you)') : ''}</strong><span>@{user.username}{user.email ? ` · ${user.email}` : ''}</span></div></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[1]}</span><div className="cms-title-cell"><strong>{cmsRoleLabel(locale, user.role)}</strong><span>{cmsRoleDescription(locale, user.role)}</span></div></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[2]}</span><span className="cms-status" data-status={user.status}>{user.status === 'active' ? cmsStatusLabel(locale, user.status) : text('ปิดใช้งาน', 'Disabled')}</span></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[3]}</span>{user.lastLoginAt ? <time dateTime={user.lastLoginAt}>{new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(user.lastLoginAt))}</time> : text('ไม่เคย', 'Never')}</td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[4]}</span><div className="cms-row-actions"><button className="cms-icon-button" type="button" onClick={() => show(user)} disabled={busy} aria-label={`${text('แก้ไข', 'Edit')} ${user.name}`}><Edit3 aria-hidden="true" /></button>{user.id !== currentUserId ? <button className="cms-icon-button" type="button" onClick={() => remove(user)} disabled={busy} aria-label={`${text('ลบ', 'Remove')} ${user.name}`}><Trash2 aria-hidden="true" /></button> : null}</div></td>
      </tr>)}</tbody></table></div> : <div className="cms-empty"><UserRound aria-hidden="true" /><p>{text('ไม่พบผู้ใช้ที่ตรงกับตัวกรอง', 'No users match these filters.')}</p><button className="cms-button-secondary" type="button" onClick={() => { setQuery(''); setRoleFilter(''); setStatusFilter('') }}>{text('ล้างตัวกรอง', 'Clear filters')}</button></div>}
      {!open ? <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div> : null}
    </section>

    {open ? <section className="cms-editor" ref={editorRef} aria-labelledby="user-editor-title">
      <header className="cms-editor-header"><div><p className="cms-eyebrow">{text('การควบคุมสิทธิ์', 'Access control')}</p><h2 id="user-editor-title">{editingId ? text('แก้ไขผู้ใช้ CMS', 'Edit CMS user') : text('เพิ่มผู้ใช้ CMS', 'Add CMS user')}</h2><p>{dirty ? text('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก', 'Unsaved changes') : text('ระบบจะไม่แสดงหรือส่งกลับรหัสผ่าน', 'Passwords are never displayed or returned.')}</p></div><button className="cms-icon-button" type="button" onClick={close} disabled={busy} aria-label={text('ปิดตัวแก้ไขผู้ใช้', 'Close user editor')}><X aria-hidden="true" /></button></header>
      <form className="cms-form" onSubmit={save} noValidate>
        <div aria-live="polite">{error ? <p className="cms-access-summary">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
        <fieldset className="cms-access-fieldset" disabled={busy}>
          <div className="cms-form-grid">
            <label className="cms-field"><span>{text('ชื่อแสดง', 'Display name')}</span><input {...fieldProps('name')} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} maxLength={120} required />{fieldError('name')}</label>
            <label className="cms-field"><span>{text('ชื่อผู้ใช้', 'Username')}</span><input {...fieldProps('username')} value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]{3,80}" required /><span className="cms-field-help">{text('3–80 ตัวอักษร ใช้อักษรอังกฤษ ตัวเลข จุด ขีดล่าง และขีดกลาง', '3–80 letters, numbers, dots, underscores, or hyphens.')}</span>{fieldError('username')}</label>
            <label className="cms-field"><span>{text('อีเมล (ไม่บังคับ)', 'Email (optional)')}</span><input {...fieldProps('email')} type="email" maxLength={254} value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} />{fieldError('email')}</label>
            {self ? <div className="cms-field"><span>{text('รหัสผ่าน', 'Password')}</span><a className="cms-button-secondary" href="/cms/account">{text('เปลี่ยนที่บัญชีของฉัน', 'Change on My account')}</a></div> : <label className="cms-field"><span>{editingId ? text('ตั้งรหัสผ่านใหม่ (ไม่บังคับ)', 'Reset password (optional)') : text('รหัสผ่าน', 'Password')}</span><input {...fieldProps('password')} type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" minLength={12} maxLength={256} required={!editingId} /><span className="cms-field-help">{text('12–256 ตัวอักษร การตั้งรหัสผ่านใหม่จะออกจากระบบทุกอุปกรณ์ของผู้ใช้นี้', '12–256 characters. Resetting signs this user out on all devices.')}</span>{fieldError('password')}</label>}
            <label className="cms-field"><span>{text('บทบาท', 'Role')}</span><select {...fieldProps('role')} value={form.role} disabled={self} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as CmsRole }))}>{(['admin', 'editor', 'viewer'] as const).map((role) => <option value={role} key={role}>{cmsRoleLabel(locale, role)}</option>)}</select><span className="cms-field-help">{cmsRoleDescription(locale, form.role)}</span>{fieldError('role')}</label>
            <label className="cms-field"><span>{text('สถานะ', 'Status')}</span><select {...fieldProps('status')} value={form.status} disabled={self} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as CmsStatus }))}><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{text('ปิดใช้งาน', 'Disabled')}</option><option value="archived">{text('เก็บถาวร / ปิดใช้งาน', 'Archived / disabled')}</option></select>{self ? <span className="cms-field-help">{text('ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตัวเองได้', 'Your own administrator access must stay active.')}</span> : null}{fieldError('status')}</label>
          </div>
          <div className="cms-form-actions"><button className="cms-button-secondary" type="button" onClick={close}>{text('ยกเลิก', 'Cancel')}</button><button className="cms-button" type="submit" disabled={busy}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกผู้ใช้', 'Save user')}</button></div>
        </fieldset>
      </form>
    </section> : null}
  </>
}
