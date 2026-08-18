import type { Metadata } from 'next'
import '@/styles/globals.css'
import Navbar from '@/components/Navbar/Navbar'
import NavbarMobile from '@/components/Navbar/mobile/Navbar-mobile'
import Footer from '@/components/Footer/Footer'
import SiteStructuredData from '@/components/SiteStructuredData/SiteStructuredData'
import { languageAlternates } from '@/i18n/config'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://siamgroundwater.com'
  ),
  title: {
    default: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
    template: '%s',
  },
  description:
    'เชี่ยวชาญสำรวจ เจาะบ่อ ซ่อมบำรุง และแก้ไขปัญหาระบบน้ำบาดาล น้ำแร่ และน้ำพุร้อน สำหรับโครงการภาครัฐและเอกชนทั่วประเทศไทย',
  applicationName: 'Siam Groundwater',
  alternates: {
    canonical: '/',
    languages: languageAlternates('/'),
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    siteName: 'Siam Groundwater',
    title: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
    description:
      'สำรวจ เจาะ ซ่อมบำรุง และแก้ไขปัญหาระบบน้ำบาดาลทั่วประเทศไทย',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'สยามกราวด์วอเตอร์ — WE KNOW GROUNDWATER',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
    description: 'บริการน้ำบาดาลครบวงจรสำหรับโครงการทั่วประเทศไทย',
    images: ['/og.png'],
  },
}

export default function ThaiLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
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
