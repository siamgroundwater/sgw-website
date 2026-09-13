'use client'

import { useParams } from 'next/navigation'
import RouteLoading, { type RouteLoadingLocale } from '@/components/RouteLoading/RouteLoading'

const supportedLocales = new Set<RouteLoadingLocale>(['th', 'en', 'zh', 'ja'])

export default function LocalizedLoading() {
  const params = useParams<{ locale?: string }>()
  const locale = supportedLocales.has(params.locale as RouteLoadingLocale)
    ? params.locale as RouteLoadingLocale
    : 'en'

  return <RouteLoading locale={locale} />
}
