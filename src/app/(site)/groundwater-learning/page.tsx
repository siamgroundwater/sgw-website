import LearningCenterPage from '@/components/LearningCenterPage/LearningCenterPage'
import { getLocalizedContent } from '@/i18n/localized-content'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import './page.css'

export const metadata = createThaiPageMetadata({
  title: 'ศูนย์การเรียนรู้เรื่องน้ำบาดาล | Siam Groundwater',
  description:
    'บทความ เครื่องมือคำนวณ กรณีศึกษา กฎหมาย และคำถามที่พบบ่อย สำหรับผู้วางแผนใช้ระบบน้ำบาดาลในประเทศไทย',
  pathname: '/groundwater-learning',
})

export default function GroundwaterLearningPage() {
  return <LearningCenterPage content={getLocalizedContent('th')} />
}
