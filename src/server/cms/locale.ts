import 'server-only'

import { cookies } from 'next/headers'
import { CMS_LOCALE_COOKIE, normalizeCmsLocale } from '@/lib/cms-locale'

export async function getCmsLocale() {
  const cookieStore = await cookies()
  return normalizeCmsLocale(cookieStore.get(CMS_LOCALE_COOKIE)?.value)
}
