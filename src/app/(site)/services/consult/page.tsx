import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'
import { createThaiPageMetadata } from '@/lib/site-metadata'

const content = getLocalizedContent('th')

export const metadata = createThaiPageMetadata({
  title: 'แก้ไขโครงการที่เจาะน้ำบาดาลขึ้นมาใช้แล้วมีปัญหาและเสียหาย | Siam Groundwater',
  description:
    'วิเคราะห์และฟื้นฟูบ่อที่มีทราย น้ำขุ่น บ่ออุดตัน น้ำเค็ม น้ำปนเปื้อน เครื่องสูบเสียบ่อย หรือบ่อขนาดใหญ่ 8–12 นิ้วชำรุด เพื่อเลือกวิธีซ่อมที่คุ้มค่าก่อนตัดสินใจเจาะใหม่',
  pathname: '/services/consult',
  openGraphTitle: 'แก้ไขโครงการที่เจาะน้ำบาดาลขึ้นมาใช้แล้วมีปัญหาและเสียหาย',
  openGraphDescription:
    'แยกสาเหตุจากชั้นน้ำ โครงสร้างบ่อ เครื่องสูบ คุณภาพน้ำ และรูปแบบการใช้งาน เพื่อให้ลงทุนแก้ไขได้ตรงจุด',
  openGraphImage: '/images/services/consult/legacy-03.jpg',
  openGraphType: 'article',
})

export default function ConsultServicePage() {
  return (
    <ServiceDetailPage locale="th" content={content} serviceKey="consult" />
  )
}
