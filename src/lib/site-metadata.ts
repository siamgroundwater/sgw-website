import type { Metadata } from 'next'
import { languageAlternates } from '@/i18n/config'

const DEFAULT_SOCIAL_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'Siam Groundwater — WE KNOW GROUNDWATER',
}

type ThaiPageMetadataOptions = {
  title: string
  description: string
  pathname: string
  openGraphTitle?: string
  openGraphDescription?: string
  openGraphImage?: string
  openGraphType?: 'website' | 'article'
}

export function createThaiPageMetadata({
  title,
  description,
  pathname,
  openGraphTitle = title,
  openGraphDescription = description,
  openGraphImage,
  openGraphType = 'website',
}: ThaiPageMetadataOptions): Metadata {
  const images = openGraphImage
    ? [{ url: openGraphImage, alt: openGraphTitle }]
    : [DEFAULT_SOCIAL_IMAGE]

  const sharedOpenGraph = {
    locale: 'th_TH',
    siteName: 'Siam Groundwater',
    title: openGraphTitle,
    description: openGraphDescription,
    url: pathname,
    images,
  }

  return {
    title,
    description,
    alternates: {
      canonical: pathname,
      languages: languageAlternates(pathname),
    },
    openGraph:
      openGraphType === 'article'
        ? { ...sharedOpenGraph, type: 'article' }
        : { ...sharedOpenGraph, type: 'website' },
    twitter: {
      card: 'summary_large_image',
      title: openGraphTitle,
      description: openGraphDescription,
      images: [openGraphImage ?? DEFAULT_SOCIAL_IMAGE.url],
    },
  }
}
