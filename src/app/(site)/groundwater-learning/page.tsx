import type { Metadata } from 'next'
import LearningCenterPage from '@/components/LearningCenterPage/LearningCenterPage'
import { getLocalizedContent } from '@/i18n/localized-content'
import './page.css'

export const metadata: Metadata = {
  title: 'ศูนย์การเรียนรู้เรื่องน้ำบาดาล | Siam Groundwater',
  description:
    'บทความ เครื่องมือคำนวณ กรณีศึกษา กฎหมาย และคำถามที่พบบ่อย สำหรับผู้วางแผนใช้ระบบน้ำบาดาลในประเทศไทย',
  alternates: { canonical: '/groundwater-learning' },
}

export default function GroundwaterLearningPage() {
  return <LearningCenterPage content={getLocalizedContent('th')} />
}
