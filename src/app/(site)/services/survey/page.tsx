import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'
import { createThaiPageMetadata } from '@/lib/site-metadata'

const content = getLocalizedContent('th')

export const metadata = createThaiPageMetadata({
  title: 'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน EIA | Siam Groundwater',
  description:
    'บริการสำรวจน้ำบาดาล น้ำแร่ น้ำพุร้อน และงานประกอบรายงาน EIA ด้วย Resistivity Survey, Electric Log และทีมผู้เชี่ยวชาญ เพื่อกำหนดจุดเจาะและออกแบบบ่ออย่างถูกหลักวิชาการ',
  pathname: '/services/survey',
  openGraphTitle: 'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน EIA',
  openGraphDescription:
    'ลดความเสี่ยงก่อนเจาะด้วยข้อมูลธรณีวิทยาน้ำบาดาล การสำรวจธรณีฟิสิกส์ และการแปลผลโดยทีมที่มีประสบการณ์',
  openGraphImage: '/images/services/survey/legacy-01.jpg',
  openGraphType: 'article',
})

export default function SurveyServicePage() {
  return (
    <ServiceDetailPage locale="th" content={content} serviceKey="survey" />
  )
}
