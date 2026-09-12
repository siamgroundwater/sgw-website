import type { CmsSession } from '@/types/cms'

export const CMS_USERNAME_STORAGE_KEY = 'sgw-cms-login-username'
export const CMS_SESSION_EXPIRED_EVENT = 'sgw-cms-session-expired'

export function notifyCmsSessionExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CMS_SESSION_EXPIRED_EVENT))
}

export function handleCmsUnauthorized(response: Response) {
  if (response.status !== 401) return false
  notifyCmsSessionExpired()
  return true
}

export async function fetchCmsSession() {
  const response = await fetch('/api/cms/auth/me', { cache: 'no-store' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Could not verify the CMS session.')
  const data = (await response.json()) as { user?: CmsSession | null }
  return data.user || null
}

export async function logoutCmsSession() {
  const response = await fetch('/api/cms/auth/logout', { method: 'POST' })
  if (!response.ok) throw new Error('Could not sign out of the CMS.')
}
