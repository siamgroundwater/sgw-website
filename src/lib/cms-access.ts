export function safeCmsReturnTo(value: unknown) {
  const fallback = '/cms/dashboard'
  if (typeof value !== 'string' || !value.startsWith('/cms') || /[\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://cms.local')
    if (url.origin !== 'https://cms.local' || !/^\/cms(?:\/|$)/.test(url.pathname) || /^\/cms\/login(?:\/|$)/.test(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function cmsLoginHref(returnTo: string) {
  return `/cms/login?returnTo=${encodeURIComponent(safeCmsReturnTo(returnTo))}`
}

export function retryAfterSeconds(value: string | null, now = Date.now()) {
  if (!value) return 60
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000)
  return Number.isFinite(seconds) ? Math.max(1, Math.min(900, seconds)) : 60
}

export function isCmsSessionRevoked(issuedAt: number, revokedAt?: Date) {
  return Boolean(revokedAt && issuedAt <= revokedAt.getTime())
}

export type CmsUserField = 'name' | 'username' | 'email' | 'password' | 'passwordConfirmation' | 'role' | 'status'
export type CmsUserErrorCode = 'name' | 'username' | 'username_taken' | 'email' | 'password' | 'password_mismatch' | 'self_access' | 'last_admin' | 'account_password' | 'current_password' | 'password_reused' | 'not_found' | 'conflict' | 'invalid'

const userMessages: Record<CmsUserErrorCode, { th: string; en: string }> = {
  name: { th: 'กรอกชื่อแสดงไม่เกิน 120 ตัวอักษร', en: 'Enter a display name of up to 120 characters.' },
  username: { th: 'ชื่อผู้ใช้ต้องมี 3–80 ตัวอักษร ใช้อักษรอังกฤษ ตัวเลข จุด ขีดล่าง หรือขีดกลาง', en: 'Use 3–80 letters, numbers, dots, underscores, or hyphens.' },
  username_taken: { th: 'ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกชื่ออื่น', en: 'That username is already in use. Choose another.' },
  email: { th: 'กรอกอีเมลให้ถูกต้อง', en: 'Enter a valid email address.' },
  password: { th: 'รหัสผ่านต้องมี 12–256 ตัวอักษร', en: 'Use a password containing 12–256 characters.' },
  password_mismatch: { th: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', en: 'The passwords do not match.' },
  self_access: { th: 'คุณไม่สามารถปิดใช้งานหรือลดสิทธิ์ผู้ดูแลของตัวเองได้', en: 'You cannot disable or remove your own administrator access.' },
  last_admin: { th: 'ต้องมีผู้ดูแลระบบที่เปิดใช้งานอย่างน้อยหนึ่งคน', en: 'Keep at least one active administrator.' },
  account_password: { th: 'เปลี่ยนรหัสผ่านของคุณได้ที่หน้าบัญชีของฉัน', en: 'Change your own password on My account.' },
  current_password: { th: 'รหัสผ่านปัจจุบันไม่ถูกต้อง', en: 'Your current password is incorrect.' },
  password_reused: { th: 'เลือกรหัสผ่านใหม่ที่ไม่ซ้ำกับรหัสผ่านปัจจุบัน', en: 'Choose a password different from your current password.' },
  not_found: { th: 'ไม่พบผู้ใช้ กรุณาโหลดรายการใหม่', en: 'This user is no longer available. Reload the list.' },
  conflict: { th: 'ข้อมูลบัญชีเปลี่ยนไปแล้ว กรุณาเข้าสู่ระบบอีกครั้ง', en: 'The account changed. Sign in again before retrying.' },
  invalid: { th: 'ตรวจสอบข้อมูลแล้วลองอีกครั้ง', en: 'Check the details and try again.' },
}

export function cmsUserErrorMessage(code: unknown, locale: 'th' | 'en') {
  return userMessages[typeof code === 'string' && code in userMessages ? code as CmsUserErrorCode : 'invalid'][locale]
}

export function validateCmsUserForm(input: { name: string; username: string; email: string; password: string; passwordConfirmation?: string }, editing: boolean): Partial<Record<CmsUserField, CmsUserErrorCode>> {
  const errors: Partial<Record<CmsUserField, CmsUserErrorCode>> = {}
  if (!input.name.trim() || input.name.trim().length > 120) errors.name = 'name'
  if (!/^[a-z0-9._-]{3,80}$/i.test(input.username.trim())) errors.username = 'username'
  if (input.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) || input.email.trim().length > 254)) errors.email = 'email'
  const passwordChanged = !editing || Boolean(input.password) || Boolean(input.passwordConfirmation)
  if (passwordChanged && (input.password.length < 12 || input.password.length > 256)) errors.password = 'password'
  if (input.passwordConfirmation !== undefined && passwordChanged && input.password !== input.passwordConfirmation) errors.passwordConfirmation = 'password_mismatch'
  return errors
}
