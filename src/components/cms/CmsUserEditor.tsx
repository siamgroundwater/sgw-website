'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Save, Trash2 } from 'lucide-react'
import { cmsRoleDescription, cmsRoleLabel, cmsStatusLabel } from '@/lib/cms-locale'
import { cmsUserErrorMessage, validateCmsUserForm, type CmsUserField, type CmsUserErrorCode } from '@/lib/cms-access'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import type { CmsRole, CmsStatus, CmsUserRecord } from '@/types/cms'
import { useCmsLanguage } from './CmsLanguage'

type UserForm = { email: string; name: string; password: string; passwordConfirmation: string; role: CmsRole; status: CmsStatus; username: string }
const blankUser: UserForm = { email: '', name: '', password: '', passwordConfirmation: '', role: 'editor', status: 'active', username: '' }
const userForm = (user?: CmsUserRecord): UserForm => user ? { email: user.email, name: user.name, password: '', passwordConfirmation: '', role: user.role, status: user.status, username: user.username } : { ...blankUser }

export default function CmsUserEditor({ initialUser, currentUserId }: { initialUser?: CmsUserRecord; currentUserId: string }) {
  const { locale } = useCmsLanguage()
  const router = useRouter()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const editing = Boolean(initialUser)
  const self = initialUser?.id === currentUserId
  const initialForm = userForm(initialUser)
  const [form, setForm] = useState<UserForm>(initialForm)
  const [baseline] = useState(JSON.stringify(initialForm))
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Partial<Record<CmsUserField, CmsUserErrorCode>>>({})
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = JSON.stringify(form) !== baseline
  const discardMessage = text('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการทิ้งการเปลี่ยนแปลงหรือไม่?', 'Discard your unsaved changes?')

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

  function focusField(field: string) {
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${field}"]`)?.focus())
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
    const errors = validateCmsUserForm(form, editing)
    setFields(errors)
    setError('')
    const first = Object.keys(errors)[0]
    if (first) {
      setError(text('ตรวจสอบช่องที่ระบุด้านล่าง', 'Check the highlighted fields below.'))
      focusField(first)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/cms/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, id: initialUser?.id, name: form.name, password: form.password, role: form.role, status: form.status, username: form.username }),
      })
      const payload = (await response.json().catch(() => ({}))) as { code?: CmsUserErrorCode; field?: CmsUserField; user?: CmsUserRecord }
      if (handleCmsUnauthorized(response)) { setError(text('เซสชันหมดอายุ เข้าสู่ระบบในแท็บใหม่แล้วกลับมาบันทึก ข้อมูลในแบบฟอร์มยังอยู่', 'Session expired. Sign in in a new tab, then return to save. Your form is still here.')); return }
      if (!response.ok || !payload.user) {
        setError(payload.code ? cmsUserErrorMessage(payload.code, locale) : text('ไม่สามารถบันทึกผู้ใช้ CMS ได้ ลองอีกครั้ง', 'Could not save the CMS user. Try again.'))
        if (payload.field && payload.code) { setFields({ [payload.field]: payload.code }); focusField(payload.field) }
        return
      }
      router.replace(`/cms/users?${editing ? 'updated' : 'created'}=1`)
      router.refresh()
    } catch {
      setError(text('การเชื่อมต่อขัดข้อง ตรวจสอบรายการก่อนลองบันทึกอีกครั้ง เพื่อหลีกเลี่ยงการเพิ่มบัญชีซ้ำ', 'Connection interrupted. Check the user list before retrying to avoid adding the same account twice.'))
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!initialUser || self || busy || !window.confirm(th ? `ยกเลิกสิทธิ์เข้าถึง CMS ของ “${initialUser.name}” หรือไม่?` : `Remove CMS access for “${initialUser.name}”?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/cms/users?id=${encodeURIComponent(initialUser.id)}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({})) as { code?: CmsUserErrorCode }
      if (handleCmsUnauthorized(response)) { setError(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบในแท็บใหม่', 'Session expired. Sign in in a new tab.')); return }
      if (!response.ok) { setError(payload.code ? cmsUserErrorMessage(payload.code, locale) : text('ไม่สามารถลบผู้ใช้ CMS ได้', 'Could not remove the CMS user.')); return }
      router.replace('/cms/users?removed=1')
      router.refresh()
    } catch { setError(text('ไม่สามารถเชื่อมต่อบริการผู้ใช้ CMS ได้', 'Could not reach the CMS user service.')) }
    finally { setBusy(false) }
  }

  return <section className="cms-editor" aria-labelledby="user-editor-title">
    <Link className="cms-back-link" href="/cms/users"><ArrowLeft aria-hidden="true" />{text('กลับไปรายการผู้ใช้', 'Back to users')}</Link>
    <header className="cms-editor-header"><div><p className="cms-eyebrow">{text('การควบคุมสิทธิ์', 'Access control')}</p><h2 id="user-editor-title">{editing ? text('แก้ไขผู้ใช้ CMS', 'Edit CMS user') : text('เพิ่มผู้ใช้ CMS', 'Add CMS user')}</h2><p>{dirty ? text('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก', 'Unsaved changes') : text('ระบบจะไม่แสดงหรือส่งกลับรหัสผ่าน', 'Passwords are never displayed or returned.')}</p></div></header>
    <form className="cms-form" ref={formRef} onSubmit={save} noValidate>
      <div aria-live="polite">{error ? <p className="cms-access-summary">{error}</p> : null}</div>
      <fieldset className="cms-access-fieldset" disabled={busy}>
        <div className="cms-form-grid">
          <label className="cms-field"><span>{text('ชื่อแสดง', 'Display name')}</span><input {...fieldProps('name')} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} maxLength={120} autoFocus required />{fieldError('name')}</label>
          <label className="cms-field"><span>{text('ชื่อผู้ใช้', 'Username')}</span><input {...fieldProps('username')} value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]{3,80}" required /><span className="cms-field-help">{text('3–80 ตัวอักษร ใช้อักษรอังกฤษ ตัวเลข จุด ขีดล่าง และขีดกลาง', '3–80 letters, numbers, dots, underscores, or hyphens.')}</span>{fieldError('username')}</label>
          <label className="cms-field"><span>{text('อีเมล (ไม่บังคับ)', 'Email (optional)')}</span><input {...fieldProps('email')} type="email" maxLength={254} value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} />{fieldError('email')}</label>
          {self ? <div className="cms-field"><span>{text('รหัสผ่าน', 'Password')}</span><Link className="cms-button-secondary" href="/cms/account">{text('เปลี่ยนที่บัญชีของฉัน', 'Change on My account')}</Link></div> : <>
            <div className="cms-field">
              <label htmlFor="cms-user-password">{editing ? text('ตั้งรหัสผ่านใหม่ (ไม่บังคับ)', 'Reset password (optional)') : text('รหัสผ่าน', 'Password')}</label>
              <div className="cms-input-wrap cms-password-input"><LockKeyhole aria-hidden="true" /><input id="cms-user-password" {...fieldProps('password')} type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" minLength={12} maxLength={256} required={!editing || Boolean(form.passwordConfirmation)} /><button className="cms-icon-button cms-password-toggle" type="button" aria-label={showPassword ? text('ซ่อนรหัสผ่าน', 'Hide password') : text('แสดงรหัสผ่าน', 'Show password')} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>
              <span className="cms-field-help">{text('12–256 ตัวอักษร การตั้งรหัสผ่านใหม่จะออกจากระบบทุกอุปกรณ์ของผู้ใช้นี้', '12–256 characters. Resetting signs this user out on all devices.')}</span>{fieldError('password')}
            </div>
            <div className="cms-field">
              <label htmlFor="cms-user-password-confirmation">{editing ? text('ยืนยันรหัสผ่านใหม่', 'Confirm new password') : text('ยืนยันรหัสผ่าน', 'Confirm password')}</label>
              <div className="cms-input-wrap cms-password-input"><LockKeyhole aria-hidden="true" /><input id="cms-user-password-confirmation" {...fieldProps('passwordConfirmation')} type={showPasswordConfirmation ? 'text' : 'password'} value={form.passwordConfirmation} onChange={(event) => setForm((value) => ({ ...value, passwordConfirmation: event.target.value }))} autoComplete="new-password" minLength={12} maxLength={256} required={!editing || Boolean(form.password)} /><button className="cms-icon-button cms-password-toggle" type="button" aria-label={showPasswordConfirmation ? text('ซ่อนรหัสผ่านยืนยัน', 'Hide password confirmation') : text('แสดงรหัสผ่านยืนยัน', 'Show password confirmation')} aria-pressed={showPasswordConfirmation} onClick={() => setShowPasswordConfirmation((value) => !value)}>{showPasswordConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>
              {fieldError('passwordConfirmation')}
            </div>
          </>}
          <label className="cms-field"><span>{text('บทบาท', 'Role')}</span><select {...fieldProps('role')} value={form.role} disabled={self} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as CmsRole }))}>{(['admin', 'editor', 'viewer'] as const).map((role) => <option value={role} key={role}>{cmsRoleLabel(locale, role)}</option>)}</select><span className="cms-field-help">{cmsRoleDescription(locale, form.role)}</span>{fieldError('role')}</label>
          <label className="cms-field"><span>{text('สถานะ', 'Status')}</span><select {...fieldProps('status')} value={form.status} disabled={self} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as CmsStatus }))}><option value="active">{cmsStatusLabel(locale, 'active')}</option><option value="draft">{text('ปิดใช้งาน', 'Disabled')}</option><option value="archived">{text('เก็บถาวร / ปิดใช้งาน', 'Archived / disabled')}</option></select>{self ? <span className="cms-field-help">{text('ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตัวเองได้', 'Your own administrator access must stay active.')}</span> : null}{fieldError('status')}</label>
        </div>
        <div className="cms-form-actions cms-user-form-actions">
          {editing && !self ? <button className="cms-button-danger" type="button" onClick={remove}><Trash2 aria-hidden="true" />{text('ลบผู้ใช้', 'Delete user')}</button> : <span />}
          <div className="cms-row-actions"><Link className="cms-button-secondary" href="/cms/users">{text('ยกเลิก', 'Cancel')}</Link><button className="cms-button" type="submit"><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกผู้ใช้', 'Save user')}</button></div>
        </div>
      </fieldset>
    </form>
  </section>
}
