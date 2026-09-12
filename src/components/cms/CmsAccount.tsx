'use client'

import { useRef, useState, type FormEvent } from 'react'
import { LockKeyhole } from 'lucide-react'
import type { CmsSession } from '@/types/cms'
import { cmsRoleLabel } from '@/lib/cms-locale'
import { cmsLoginHref, cmsUserErrorMessage } from '@/lib/cms-access'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { useCmsLanguage } from './CmsLanguage'

export default function CmsAccount({ session }: { session: CmsSession }) {
  const { locale } = useCmsLanguage()
  const text = (th: string, en: string) => locale === 'th' ? th : en
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [changed, setChanged] = useState(false)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function fail(message: string, field: string) {
    setError(message)
    setErrorField(field)
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus())
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setErrorField('')
    if (!currentPassword) return fail(text('กรอกรหัสผ่านปัจจุบัน', 'Enter your current password.'), 'currentPassword')
    if (newPassword.length < 12 || newPassword.length > 256) return fail(cmsUserErrorMessage('password', locale), 'newPassword')
    if (newPassword !== confirmation) return fail(text('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'The new passwords do not match.'), 'confirmation')
    if (!window.confirm(text('เปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์หรือไม่?', 'Change your password and sign out all devices?'))) return
    setBusy(true)
    try {
      const response = await fetch('/api/cms/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const payload = await response.json().catch(() => ({})) as { code?: string }
      if (handleCmsUnauthorized(response)) {
        fail(text('เข้าสู่ระบบในแท็บใหม่ก่อนลองอีกครั้ง', 'Sign in in a new tab before trying again.'), 'currentPassword')
        return
      }
      if (!response.ok) {
        fail(payload.code ? cmsUserErrorMessage(payload.code, locale) : text('เปลี่ยนรหัสผ่านไม่สำเร็จ ลองอีกครั้ง', 'Could not change your password. Try again.'), payload.code === 'current_password' ? 'currentPassword' : 'newPassword')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setChanged(true)
    } catch {
      fail(text('การเชื่อมต่อขัดข้อง หากรหัสผ่านเปลี่ยนแล้ว ให้เข้าสู่ระบบด้วยรหัสผ่านใหม่', 'Connection interrupted. If the change completed, sign in with your new password.'), 'currentPassword')
    } finally { setBusy(false) }
  }

  return <section className="cms-panel cms-account-panel">
    <header className="cms-panel-header"><div><h2>{session.displayName}</h2><p>@{session.username} · {cmsRoleLabel(locale, session.role)}</p></div><LockKeyhole aria-hidden="true" /></header>
    {changed ? <div className="cms-form" role="status"><p className="cms-message">{text('เปลี่ยนรหัสผ่านแล้ว และออกจากระบบทุกอุปกรณ์ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่', 'Password changed. All devices are signed out. Sign in with your new password.')}</p><a className="cms-button" href={cmsLoginHref('/cms/account')}>{text('เข้าสู่ระบบอีกครั้ง', 'Sign in again')}</a></div> : <form className="cms-form" ref={formRef} onSubmit={submit} noValidate>
      <div><h3>{text('เปลี่ยนรหัสผ่าน', 'Change password')}</h3><p className="cms-field-help">{text('ใช้รหัสผ่านปัจจุบันเพื่อยืนยันตัวตน หลังเปลี่ยน ระบบจะออกจากระบบทุกอุปกรณ์รวมถึงอุปกรณ์นี้ บันทึกงานในแท็บอื่นก่อนดำเนินการ', 'Confirm with your current password. Changing it signs out every device, including this one. Save work in other tabs first.')}</p></div>
      <fieldset disabled={busy} className="cms-access-fieldset">
        <label className="cms-field"><span>{text('รหัสผ่านปัจจุบัน', 'Current password')}</span><input name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={256} required aria-invalid={errorField === 'currentPassword'} aria-describedby={errorField === 'currentPassword' ? 'account-error' : undefined} /></label>
        <label className="cms-field"><span>{text('รหัสผ่านใหม่', 'New password')}</span><input name="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={256} required aria-invalid={errorField === 'newPassword'} aria-describedby="account-password-help account-error" /><span id="account-password-help" className="cms-field-help">{text('12–256 ตัวอักษร ใช้รหัสผ่านที่ไม่ซ้ำกับเว็บไซต์อื่น', '12–256 characters. Use a password you do not use on other websites.')}</span></label>
        <label className="cms-field"><span>{text('ยืนยันรหัสผ่านใหม่', 'Confirm new password')}</span><input name="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} maxLength={256} required aria-invalid={errorField === 'confirmation'} aria-describedby={errorField === 'confirmation' ? 'account-error' : undefined} /></label>
        <button className="cms-button" type="submit">{busy ? text('กำลังเปลี่ยน...', 'Changing...') : text('เปลี่ยนรหัสผ่าน', 'Change password')}</button>
      </fieldset>
      <div aria-live="polite"><p id="account-error" className={error ? 'cms-error' : undefined}>{error}</p></div>
    </form>}
  </section>
}
