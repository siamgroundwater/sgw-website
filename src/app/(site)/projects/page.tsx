import type { Metadata } from 'next'
import Projects from '../home/projects/projects'

export const metadata: Metadata = {
  title: 'ผลงานของเรา | Siam Groundwater',
  description:
    'ค้นหาตัวอย่างโครงการสำรวจ เจาะ และพัฒนาน้ำบาดาลของ Siam Groundwater ในพื้นที่ทั่วประเทศ',
  alternates: { canonical: '/projects' },
}

export default function ProjectsPage() {
  return (
    <main className="projects-page" style={{ padding: '1rem' }}>
      {/* Reuse the Home projects section */}
      <Projects showHistoryMap />
    </main>
  )
}
