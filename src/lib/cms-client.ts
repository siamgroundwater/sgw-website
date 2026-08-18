import type { CmsSession } from '@/types/cms'

export const CMS_USERNAME_STORAGE_KEY = 'sgw-cms-login-username'

export async function fetchCmsSession() {
  const response = await fetch('/api/cms/auth/me', { cache: 'no-store' })
  if (!response.ok) return null
  const data = (await response.json()) as { user?: CmsSession | null }
  return data.user || null
}

export async function logoutCmsSession() {
  await fetch('/api/cms/auth/logout', { method: 'POST' })
}
