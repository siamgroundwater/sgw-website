// src/app/(site)/services/page.tsx
import Services from './services'
import { createThaiPageMetadata } from '@/lib/site-metadata'

export const metadata = createThaiPageMetadata({
  title: 'บริการของเรา | Siam Groundwater',
  description:
    'บริการเจาะบ่อน้ำบาดาล ออกแบบ ติดตั้ง และดูแลระบบน้ำบาดาลแบบครบวงจร สำหรับโรงงาน โรงแรม รีสอร์ท และโครงการขนาดใหญ่ทั่วประเทศ',
  pathname: '/services',
})

export default function ServicesPage() {
  return (
    <main className="services-page">
      {/* Reuse the Home services section */}
      <Services headingLevel="h1" />
    </main>
  )
}
