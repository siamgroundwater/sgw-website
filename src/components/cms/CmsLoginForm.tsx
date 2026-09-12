'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import { CMS_USERNAME_STORAGE_KEY } from '@/lib/cms-client'
import { useCmsLanguage } from './CmsLanguage'
import { retryAfterSeconds, safeCmsReturnTo } from '@/lib/cms-access'

export default function CmsLoginForm({ returnTo = '/cms/dashboard' }: { returnTo?: string }) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const copy = locale === 'th' ? {
    errorCredentials: 'กรุณากรอกชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 12 ตัวอักษร',
    errorReach: 'ไม่สามารถเชื่อมต่อ CMS ได้ กรุณาตรวจสอบเซิร์ฟเวอร์และลองใหม่',
    errorSignIn: 'ไม่สามารถเข้าสู่ระบบได้',
    hidePassword: 'ซ่อนรหัสผ่าน',
    message: 'เข้าสู่ระบบแล้ว กำลังเปิดพื้นที่ทำงาน SGW...',
    password: 'รหัสผ่าน',
    passwordPlaceholder: 'อย่างน้อย 12 ตัวอักษร',
    remember: 'จำชื่อผู้ใช้ในอุปกรณ์นี้',
    showPassword: 'แสดงรหัสผ่าน',
    signIn: 'เข้าสู่ระบบ',
    signingIn: 'กำลังเข้าสู่ระบบ...',
    username: 'ชื่อผู้ใช้',
  } : {
    errorCredentials: 'Enter your username and a password containing at least 12 characters.',
    errorReach: 'Could not reach the CMS. Check the server and try again.',
    errorSignIn: 'Could not sign in.',
    hidePassword: 'Hide password', message: 'Signed in. Opening the SGW workspace...', password: 'Password',
    passwordPlaceholder: 'At least 12 characters', remember: 'Remember username on this device', showPassword: 'Show password',
    signIn: 'Sign in', signingIn: 'Signing in...', username: 'Username',
  }
  const usernameId = useId()
  const passwordId = useId()
  const rememberId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let saved: string | null = null
      try { saved = window.localStorage.getItem(CMS_USERNAME_STORAGE_KEY) } catch { /* Storage may be blocked on shared devices. */ }
      if (saved) {
        setUsername(saved)
        setRemember(true)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || cooldown > 0) return
    setError('')
    setMessage('')
    if (username.trim().length < 3 || password.length < 12) {
      setError(copy.errorCredentials)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/cms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 429) {
          setCooldown(retryAfterSeconds(response.headers.get('Retry-After')))
          setError(locale === 'th' ? 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่' : 'Too many attempts. Wait before trying again.')
        } else {
          setError(response.status === 401 ? (locale === 'th' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'The username or password is incorrect.') : copy.errorSignIn)
          passwordRef.current?.focus()
        }
        return
      }

      try {
        if (remember) window.localStorage.setItem(CMS_USERNAME_STORAGE_KEY, username.trim())
        else window.localStorage.removeItem(CMS_USERNAME_STORAGE_KEY)
      } catch { /* Successful sign-in does not depend on local storage. */ }
      setPassword('')
      setMessage(copy.message)
      router.replace(safeCmsReturnTo(returnTo))
      router.refresh()
    } catch {
      setError(copy.errorReach)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="cms-form" onSubmit={submit}>
      <div className="cms-field">
        <label htmlFor={usernameId}>{copy.username}</label>
        <div className="cms-input-wrap">
          <UserRound aria-hidden="true" />
          <input
            id={usernameId}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={80}
            disabled={submitting}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            required
          />
        </div>
      </div>

      <div className="cms-field">
        <label htmlFor={passwordId}>{copy.password}</label>
        <div className="cms-input-wrap">
          <LockKeyhole aria-hidden="true" />
          <input
            id={passwordId}
            ref={passwordRef}
            autoComplete="current-password"
            minLength={12}
            maxLength={256}
            disabled={submitting}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            required
          />
          <button
            className="cms-icon-button"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
      </div>

      <label className="cms-field-label" htmlFor={rememberId}>
        <input
          id={rememberId}
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />{' '}
        {copy.remember}
      </label>

      <button className="cms-button" disabled={submitting || cooldown > 0} type="submit">
        <LockKeyhole aria-hidden="true" />
        {submitting ? copy.signingIn : cooldown > 0 ? (locale === 'th' ? `ลองอีกครั้งใน ${cooldown} วินาที` : `Try again in ${cooldown}s`) : copy.signIn}
      </button>

      <div aria-live="polite">
        {error ? <p className="cms-error"><AlertCircle aria-hidden="true" />{error}</p> : null}
        {message ? <p className="cms-message"><CheckCircle2 aria-hidden="true" />{message}</p> : null}
      </div>
      <p className="cms-field-help">{locale === 'th' ? 'ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ SGW เพื่อให้ตั้งรหัสผ่านใหม่' : 'Forgot your password? Contact your SGW administrator to reset it.'}</p>
    </form>
  )
}
