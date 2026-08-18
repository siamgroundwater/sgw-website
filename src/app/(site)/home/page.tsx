import './page.css'

import Hero from './hero'
import Services from '../services/services'
import HomeMap from './map/map'
import ProjectsSection from './projects/projects'
import SocialMediaSection from '@/components/home/SocialMediaSection'
import CustomerHistorySection from '@/components/home/CustomerHistorySection'
import CompanyVideoSection from '@/components/home/CompanyVideoSection'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import { toProjectSummary } from '@/lib/project-summaries'
import { listPublicProjects } from '@/server/public-projects'

export const revalidate = 60

export const metadata = createThaiPageMetadata({
  title: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
  description:
    'บริการสำรวจ เจาะ ซ่อมบำรุง และแก้ไขปัญหาระบบน้ำบาดาล สำหรับโรงงาน โรงแรม รีสอร์ท และโครงการทั่วประเทศไทย',
  pathname: '/',
})

export default async function HomePage() {
  const projects = (await listPublicProjects()).map((project) => toProjectSummary(project))
  return (
    <main className="page-content">
      <Hero />
      <Services />
      <CompanyVideoSection locale="th" />
      <HomeMap projects={projects} />
      <ProjectsSection projects={projects} initialItemsPerPage={6} />
      <SocialMediaSection />
      <CustomerHistorySection />
    </main>
  )
}

