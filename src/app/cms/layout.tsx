import type { Metadata } from 'next'
import '@/styles/globals.css'
import './cms.css'
import { CmsLanguageProvider } from '@/components/cms/CmsLanguage'
import { getCmsLocale } from '@/server/cms/locale'

export const metadata: Metadata = {
  title: 'SGW CMS',
  description: 'Private content workspace for Siam Groundwater.',
  robots: { index: false, follow: false },
}

export default async function CmsRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCmsLocale()

  return (
    <html lang={locale}>
      <body className="cms-body">
        <CmsLanguageProvider initialLocale={locale}>{children}</CmsLanguageProvider>
      </body>
    </html>
  )
}
