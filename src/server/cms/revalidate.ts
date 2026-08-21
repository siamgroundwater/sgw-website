import 'server-only'

import { revalidatePath } from 'next/cache'
import { PREFIXED_LOCALES, localePath } from '@/i18n/config'

export function revalidatePublicProject(projectId: string) {
  const paths = new Set([
    '/',
    '/home',
    '/projects',
    `/projects/${projectId}`,
    '/sitemap.xml',
  ])
  for (const locale of PREFIXED_LOCALES) {
    paths.add(localePath('/', locale))
    paths.add(localePath('/projects', locale))
    paths.add(localePath(`/projects/${projectId}`, locale))
  }
  for (const path of paths) revalidatePath(path)
}
