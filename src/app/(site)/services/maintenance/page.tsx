import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'
import { createThaiPageMetadata } from '@/lib/site-metadata'

const content = getLocalizedContent('th')

export const metadata = createThaiPageMetadata({
  title: 'ซ่อมบำรุงรักษาบ่อน้ำบาดาล และเครื่องสูบน้ำ | Siam Groundwater',
  description:
    'เป่าล้างพัฒนาบ่อ ถอนตรวจและซ่อมเครื่องสูบ ปรับอัตราสูบ และวางแผนบำรุงรักษา เพื่อฟื้นประสิทธิภาพ ลดพลังงาน และยืดอายุระบบน้ำบาดาล',
  pathname: '/services/maintenance',
  openGraphTitle: 'ซ่อมบำรุงรักษาบ่อน้ำบาดาล และเครื่องสูบน้ำ',
  openGraphDescription:
    'ตรวจหาสาเหตุของน้ำลด ตะกอน สนิม ตะกรัน และเครื่องสูบทำงานผิดปกติ ก่อนเลือกวิธีซ่อมที่เหมาะกับสภาพจริง',
  openGraphImage: '/images/services/maintenance/legacy-01.jpg',
  openGraphType: 'article',
})

export default function MaintenanceServicePage() {
  return (
    <ServiceDetailPage
      locale="th"
      content={content}
      serviceKey="maintenance"
    />
  )
}
