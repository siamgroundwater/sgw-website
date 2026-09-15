import 'server-only'

import { revalidatePath } from 'next/cache'
import { PREFIXED_LOCALES, localePath } from '@/i18n/config'
import { SERVICE_KEYS } from '@/i18n/localized-content'
import type { SiteMediaSectionKey } from '@/lib/site-media'

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

export function revalidatePublicSiteMedia(section: SiteMediaSectionKey) {
  const paths = new Set<string>()
  const addLocalized = (pathname: string) => {
    paths.add(pathname)
    for (const locale of PREFIXED_LOCALES) paths.add(localePath(pathname, locale))
  }

  if (section.startsWith('service-')) {
    addLocalized(`/services/${section.replace('service-', '')}`)
  } else if (section === 'project-map') {
    addLocalized('/projects')
  } else if (section === 'governance') {
    addLocalized('/governance')
  } else if (section === 'about-hero') {
    addLocalized('/about')
  }

  for (const path of paths) revalidatePath(path)
}

export function revalidatePublicTeams() {
  revalidatePath('/about')
  for (const locale of PREFIXED_LOCALES) revalidatePath(localePath('/about', locale))
}
