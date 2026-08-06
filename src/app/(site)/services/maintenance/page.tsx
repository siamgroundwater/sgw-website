import type { Metadata } from 'next'
import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'

const content = getLocalizedContent('th')

export const metadata: Metadata = {
  title: 'ซ่อมบำรุงรักษาบ่อน้ำบาดาล และเครื่องสูบน้ำ | Siam Groundwater',
  description:
    'เป่าล้างพัฒนาบ่อ ถอนตรวจและซ่อมเครื่องสูบ ปรับอัตราสูบ และวางแผนบำรุงรักษา เพื่อฟื้นประสิทธิภาพ ลดพลังงาน และยืดอายุระบบน้ำบาดาล',
  alternates: { canonical: '/services/maintenance' },
  openGraph: {
    title: 'ซ่อมบำรุงรักษาบ่อน้ำบาดาล และเครื่องสูบน้ำ',
    description:
      'ตรวจหาสาเหตุของน้ำลด ตะกอน สนิม ตะกรัน และเครื่องสูบทำงานผิดปกติ ก่อนเลือกวิธีซ่อมที่เหมาะกับสภาพจริง',
    url: '/services/maintenance',
    type: 'article',
    images: ['/images/services/maintenance/legacy-01.jpg'],
  },
}

export default function MaintenanceServicePage() {
  return (
    <ServiceDetailPage
      locale="th"
      content={content}
      serviceKey="maintenance"
    />
  )
}
