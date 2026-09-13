'use client'

import { useCmsLanguage } from '@/components/cms/CmsLanguage'
import RouteLoading from '@/components/RouteLoading/RouteLoading'

export default function CmsLoading() {
  const { locale } = useCmsLanguage()
  return <RouteLoading locale={locale} variant="cms" />
}
