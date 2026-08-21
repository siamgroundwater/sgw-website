'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Edit3, Plus, Save, Search, Trash2, UserRound, X } from 'lucide-react'
import { cmsDateLocale, cmsRoleDescription, cmsRoleLabel, cmsStatusLabel } from '@/lib/cms-locale'
import type { CmsRole, CmsStatus, CmsUserRecord } from '@/types/cms'
import { useCmsLanguage } from './CmsLanguage'

type UserForm = {
  email: string
  name: string
  password: string
  role: CmsRole
  status: CmsStatus
  username: string
}

const blankUser: UserForm = { email: '', name: '', password: '', role: 'editor', status: 'active', username: '' }

export default function CmsUsersManager({ initialUsers, currentUserId }: { initialUsers: CmsUserRecord[]; currentUserId: string }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const editorRef = useRef<HTMLElement>(null)
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<UserForm>(blankUser)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return users.filter((user) => !clean || `${user.name} ${user.username} ${user.email} ${user.role}`.toLowerCase().includes(clean))
  }, [query, users])

  function show(user?: CmsUserRecord) {
    setEditingId(user?.id || null)
    setForm(user ? { email: user.email, name: user.name, password: '', role: user.role, status: user.status, username: user.username } : blankUser)
    setError('')
    setMessage('')
    setOpen(true)
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  function close() {
    setOpen(false)
    setEditingId(null)
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/cms/users', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId || undefined }) })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; user?: CmsUserRecord }
      if (!response.ok || !payload.user) { setError(text('ไม่สามารถบันทึกผู้ใช้ CMS ได้', 'Could not save the CMS user.')); return }
      setUsers((previous) => previous.some((user) => user.id === payload.user?.id) ? previous.map((user) => user.id === payload.user?.id ? payload.user! : user) : [payload.user!, ...previous])
      setEditingId(payload.user.id)
      setForm({ email: payload.user.email, name: payload.user.name, password: '', role: payload.user.role, status: payload.user.status, username: payload.user.username })
      setMessage(text('บันทึกผู้ใช้ CMS แล้ว', 'CMS user saved.'))
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อบริการผู้ใช้ CMS ได้', 'Could not reach the CMS user service.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(user: CmsUserRecord) {
    if (!window.confirm(th ? `ยกเลิกสิทธิ์เข้าถึง CMS ของ “${user.name}” หรือไม่?` : `Remove CMS access for “${user.name}”?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/cms/users?id=${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      await response.json().catch(() => ({}))
      if (!response.ok) { setError(text('ไม่สามารถลบผู้ใช้ CMS ได้', 'Could not remove the CMS user.')); return }
      setUsers((previous) => previous.filter((row) => row.id !== user.id))
      if (editingId === user.id) close()
    } catch {
      setError(text('ไม่สามารถเชื่อมต่อบริการผู้ใช้ CMS ได้', 'Could not reach the CMS user service.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="cms-panel">
        <header className="cms-panel-header cms-panel-header-single"><div><h2>{text('สิทธิ์เข้าถึง CMS', 'CMS access')}</h2><p>{text('กำหนดสิทธิ์เฉพาะเท่าที่แต่ละคนจำเป็น ระบบต้องมีผู้ดูแลที่เปิดใช้งานอย่างน้อยหนึ่งคนเสมอ', 'Assign the least access each person needs. At least one active administrator is always required.')}</p></div><button className="cms-button" type="button" onClick={() => show()}><Plus aria-hidden="true" />{text('เพิ่มผู้ใช้', 'Add user')}</button></header>
        <label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('ค้นหาชื่อ ชื่อผู้ใช้ อีเมล หรือบทบาท', 'Search name, username, email, or role')} aria-label={text('ค้นหาผู้ใช้ CMS', 'Search CMS users')} /></label>
        {filtered.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>{text('ผู้ใช้', 'User')}</th><th>{text('บทบาท', 'Role')}</th><th>{text('สถานะ', 'Status')}</th><th>{text('เข้าสู่ระบบล่าสุด', 'Last login')}</th><th>{text('การจัดการ', 'Actions')}</th></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><div className="cms-title-cell"><strong>{user.name}{user.id === currentUserId ? text(' (คุณ)', ' (you)') : ''}</strong><span>@{user.username}{user.email ? ` · ${user.email}` : ''}</span></div></td><td><div className="cms-title-cell"><strong>{cmsRoleLabel(locale, user.role)}</strong><span>{cmsRoleDescription(locale, user.role)}</span></div></td><td><span className="cms-status" data-status={user.status}>{cmsStatusLabel(locale, user.status)}</span></td><td>{user.lastLoginAt ? new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.lastLoginAt)) : text('ไม่เคย', 'Never')}</td><td><div className="cms-row-actions"><button className="cms-icon-button" type="button" onClick={() => show(user)} aria-label={`${text('แก้ไข', 'Edit')} ${user.name}`}><Edit3 aria-hidden="true" /></button>{user.id !== currentUserId ? <button className="cms-icon-button" type="button" onClick={() => remove(user)} aria-label={`${text('ลบ', 'Remove')} ${user.name}`}><Trash2 aria-hidden="true" /></button> : null}</div></td></tr>)}</tbody></table></div> : <div className="cms-empty"><UserRound aria-hidden="true" /><p>{text('ไม่พบผู้ใช้ CMS ที่ตรงกับการค้นหา', 'No CMS users match your search.')}</p></div>}
        {error && !open ? <p className="cms-error">{error}</p> : null}
      </section>

      {open ? <section className="cms-editor" ref={editorRef} aria-labelledby="user-editor-title">
        <header className="cms-editor-header"><div><p className="cms-eyebrow">{text('การควบคุมสิทธิ์', 'Access control')}</p><h2 id="user-editor-title">{editingId ? text('แก้ไขผู้ใช้ CMS', 'Edit CMS user') : text('เพิ่มผู้ใช้ CMS', 'Add CMS user')}</h2><p>{text('ระบบจะไม่แสดงหรือส่งกลับรหัสผ่านผ่าน API', 'Passwords are never displayed or returned by the API.')}</p></div><button className="cms-icon-button" type="button" onClick={close} aria-label={text('ปิดตัวแก้ไขผู้ใช้', 'Close user editor')}><X aria-hidden="true" /></button></header>
        <form className="cms-form" onSubmit={save}>
          <div className="cms-form-grid">
            <label className="cms-field"><span>{text('ชื่อแสดง', 'Display name')}</span><input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required /></label>
            <label className="cms-field"><span>{text('ชื่อผู้ใช้', 'Username')}</span><input value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} autoComplete="off" required /><span className="cms-field-help">{text('ใช้ตัวอักษร ตัวเลข จุด ขีดล่าง และขีดกลาง', 'Letters, numbers, dots, underscores, and hyphens.')}</span></label>
            <label className="cms-field"><span>{text('อีเมล', 'Email')}</span><input type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} /></label>
            <label className="cms-field"><span>{editingId ? text('รหัสผ่านใหม่ (ไม่บังคับ)', 'New password (optional)') : text('รหัสผ่าน', 'Password')}</span><input type="password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" required={!editingId} /><span className="cms-field-help">{text('อย่างน้อย 12 ตัวอักษร', 'At least 12 characters.')}</span></label>
            <label className="cms-field"><span>{text('บทบาท', 'Role')}</span><select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as CmsRole }))}><option value="admin">{cmsRoleLabel(locale, 'admin')}</option><option value="editor">{cmsRoleLabel(locale, 'editor')}</option><option value="viewer">{cmsRoleLabel(locale, 'viewer')}</option></select><span className="cms-field-help">{cmsRoleDescription(locale, form.role)}</span></label>
            <label className="cms-field"><span>{text('สถานะ', 'Status')}</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as CmsStatus }))}><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{th ? 'ฉบับร่าง / ปิดใช้งาน' : 'Draft / disabled'}</option><option value="archived">{th ? 'เก็บถาวร / ปิดใช้งาน' : 'Archived / disabled'}</option></select></label>
          </div>
          <div aria-live="polite">{error ? <p className="cms-error">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
          <div className="cms-form-actions"><button className="cms-button-secondary" type="button" onClick={close}>{text('ยกเลิก', 'Cancel')}</button><button className="cms-button" type="submit" disabled={busy}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกผู้ใช้', 'Save user')}</button></div>
        </form>
      </section> : null}
    </>
  )
}
