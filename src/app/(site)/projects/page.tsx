import Projects from '../home/projects/projects'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import { toProjectSummary } from '@/lib/project-summaries'
import { listPublicProjects } from '@/server/public-projects'

export const revalidate = 60

export const metadata = createThaiPageMetadata({
  title: 'ผลงานของเรา | Siam Groundwater',
  description:
    'ค้นหาตัวอย่างโครงการสำรวจ เจาะ และพัฒนาน้ำบาดาลของ Siam Groundwater ในพื้นที่ทั่วประเทศ',
  pathname: '/projects',
})

export default async function ProjectsPage() {
  const projects = (await listPublicProjects()).map((project) => toProjectSummary(project))
  return (
    <main className="projects-page" style={{ padding: '1rem' }}>
      {/* Reuse the Home projects section */}
      <Projects projects={projects} showHistoryMap headingLevel="h1" />
    </main>
  )
}
