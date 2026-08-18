import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import '@/styles/globals.css'
import Navbar from '@/components/Navbar/Navbar'
import NavbarMobile from '@/components/Navbar/mobile/Navbar-mobile'
import Footer from '@/components/Footer/Footer'
import SiteStructuredData from '@/components/SiteStructuredData/SiteStructuredData'
import {
  PREFIXED_LOCALES,
  isLocalizedLocale,
  languageAlternates,
  localeInfo,
} from '@/i18n/config'
import { getLocalizedContent } from '@/i18n/localized-content'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params
  if (!isLocalizedLocale(locale)) notFound()

  const content = getLocalizedContent(locale)

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://siamgroundwater.com'
    ),
    title: {
      default: content.siteTitle,
      template: '%s',
    },
    description: content.metaDescription,
    applicationName: 'Siam Groundwater',
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates('/'),
    },
    openGraph: {
      type: 'website',
      locale: localeInfo[locale].htmlLang,
      siteName: 'Siam Groundwater',
      title: content.siteTitle,
      description: content.metaDescription,
      url: `/${locale}`,
      images: [{ url: '/og.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.siteTitle,
      description: content.metaDescription,
      images: ['/og.png'],
    },
  }
}

export default async function LocalizedLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  if (!isLocalizedLocale(locale)) notFound()

  return (
    <html lang={localeInfo[locale].htmlLang}>
      <body className="antialiased min-h-screen">
        <SiteStructuredData />
        <Navbar />
        <NavbarMobile />
        {children}
        <Footer />
      </body>
    </html>
  )
}
