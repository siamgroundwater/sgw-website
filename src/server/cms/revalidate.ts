import 'server-only'

import { revalidatePath } from 'next/cache'
import { PREFIXED_LOCALES, localePath } from '@/i18n/config'
import { SERVICE_KEYS } from '@/i18n/localized-content'

export function revalidatePublicProject(projectId: string) {
  const paths = new Set([
    '/',
    '/home',
    '/projects',
    `/projects/${projectId}`,
    '/sitemap.xml',
  ])
  for (const serviceKey of SERVICE_KEYS) {
    paths.add(`/services/${serviceKey}`)
  }
  for (const locale of PREFIXED_LOCALES) {
    paths.add(localePath('/', locale))
    paths.add(localePath('/projects', locale))
    paths.add(localePath(`/projects/${projectId}`, locale))
    for (const serviceKey of SERVICE_KEYS) {
      paths.add(localePath(`/services/${serviceKey}`, locale))
    }
  }
  for (const path of paths) revalidatePath(path)
}
