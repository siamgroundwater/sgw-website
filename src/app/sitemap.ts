import type { MetadataRoute } from 'next'
import { learningArticles } from '@/data/learning'
import { listPublicProjects } from '@/server/public-projects'
import {
  SITE_LOCALES,
  languageAlternates,
  localePath,
  type SiteLocale,
} from '@/i18n/config'

export const revalidate = 300

function absoluteUrl(baseUrl: string, pathname: string) {
  return `${baseUrl}${pathname === '/' ? '' : pathname}`
}

function absoluteAlternates(baseUrl: string, pathname: string) {
  return Object.fromEntries(
    Object.entries(languageAlternates(pathname)).map(([language, path]) => [
      language,
      absoluteUrl(baseUrl, path),
    ])
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await listPublicProjects()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siamgroundwater.com'
  const staticRoutes = [
    '',
    '/about',
    '/services',
    '/services/survey',
    '/services/drilling',
    '/services/maintenance',
    '/services/consult',
    '/projects',
    '/governance',
    '/groundwater-learning',
    '/contact',
    '/privacy',
  ]

  const contentRoutes = [
    ...staticRoutes.map((route) => ({
      pathname: route || '/',
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : 0.8,
    })),
    ...learningArticles.map((article) => ({
      pathname: `/learn/${article.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...projects.map((project) => ({
      pathname: `/projects/${project._id}`,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ]

  return contentRoutes.flatMap((route) =>
    SITE_LOCALES.map((locale: SiteLocale) => ({
      url: absoluteUrl(baseUrl, localePath(route.pathname, locale)),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: absoluteAlternates(baseUrl, route.pathname),
      },
    }))
  )
}
