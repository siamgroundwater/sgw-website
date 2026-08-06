import type { Metadata } from 'next'
import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'

const content = getLocalizedContent('th')

export const metadata: Metadata = {
  title: 'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน EIA | Siam Groundwater',
  description:
    'บริการสำรวจน้ำบาดาล น้ำแร่ น้ำพุร้อน และงานประกอบรายงาน EIA ด้วย Resistivity Survey, Electric Log และทีมผู้เชี่ยวชาญ เพื่อกำหนดจุดเจาะและออกแบบบ่ออย่างถูกหลักวิชาการ',
  alternates: { canonical: '/services/survey' },
  openGraph: {
    title: 'สำรวจศึกษาน้ำบาดาล น้ำแร่ น้ำพุร้อน EIA',
    description:
      'ลดความเสี่ยงก่อนเจาะด้วยข้อมูลธรณีวิทยาน้ำบาดาล การสำรวจธรณีฟิสิกส์ และการแปลผลโดยทีมที่มีประสบการณ์',
    url: '/services/survey',
    type: 'article',
    images: ['/images/services/survey/legacy-01.jpg'],
  },
}

export default function SurveyServicePage() {
  return (
    <ServiceDetailPage locale="th" content={content} serviceKey="survey" />
  )
}
