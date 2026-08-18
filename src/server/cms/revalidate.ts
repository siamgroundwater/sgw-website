import 'server-only'

import { revalidatePath } from 'next/cache'
import { PREFIXED_LOCALES, localePath } from '@/i18n/config'

export function revalidatePublicProject(projectId: string, legacyPublicId?: number) {
  const paths = new Set([
    '/',
    '/home',
    '/projects',
    `/projects/${projectId}`,
    '/sitemap.xml',
  ])
  if (legacyPublicId) paths.add(`/projects/${legacyPublicId}`)
  for (const locale of PREFIXED_LOCALES) {
    paths.add(localePath('/', locale))
    paths.add(localePath('/projects', locale))
    paths.add(localePath(`/projects/${projectId}`, locale))
    if (legacyPublicId) paths.add(localePath(`/projects/${legacyPublicId}`, locale))
  }
  for (const path of paths) revalidatePath(path)
}
