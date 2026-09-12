'use client'

import { useCmsLanguage } from '@/components/cms/CmsLanguage'

export default function CmsLoading() {
  const { locale } = useCmsLanguage()
  return <main className="cms-main"><section className="cms-panel" role="status" aria-live="polite"><p>{locale === 'th' ? 'กำลังโหลด CMS...' : 'Loading the CMS...'}</p></section></main>
}
