// src/app/(site)/services/page.tsx
import type { Metadata } from 'next'
import Services from './services'

export const metadata: Metadata = {
  title: 'บริการของเรา | Siam Groundwater',
  description:
    'บริการเจาะบ่อน้ำบาดาล ออกแบบ ติดตั้ง และดูแลระบบน้ำบาดาลแบบครบวงจร สำหรับโรงงาน โรงแรม รีสอร์ท และโครงการขนาดใหญ่ทั่วประเทศ',
}

export default function ServicesPage() {
  return (
    <main className="services-page">
      {/* Reuse the Home services section */}
      <Services />
    </main>
  )
}
