const COMPANY_ID = '#organization'
const WEBSITE_ID = '#website'

export default function SiteStructuredData() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://siamgroundwater.com'

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}${COMPANY_ID}`,
        name: 'Siam Groundwater Co., Ltd.',
        alternateName: 'บริษัท สยามกราวด์วอเตอร์ จำกัด',
        url: baseUrl,
        logo: `${baseUrl}/images/logo/logo_SGW_white.svg`,
        image: `${baseUrl}/og.png`,
        telephone: ['+66-2-735-0789', '+66-89-895-4757'],
        email: 'sgw_th@outlook.com',
        taxID: '0105530015432',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '75 Ramkhamhaeng Soi 60 (Suan Son)',
          addressLocality: 'Hua Mak, Bang Kapi',
          addressRegion: 'Bangkok',
          postalCode: '10240',
          addressCountry: 'TH',
        },
        sameAs: [
          'https://www.facebook.com/siamgroundwater',
          'https://www.tiktok.com/@siamgroundwater.co',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}${WEBSITE_ID}`,
        url: baseUrl,
        name: 'Siam Groundwater',
        publisher: { '@id': `${baseUrl}${COMPANY_ID}` },
        inLanguage: ['th', 'en', 'zh-CN', 'ja'],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
