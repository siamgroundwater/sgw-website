import type { Metadata } from 'next'
import './page.css'

import Hero from './hero'
import Services from '../services/services'
import HomeMap from './map/map'
import ProjectsSection from './projects/projects'
import SocialMediaSection from '@/components/home/SocialMediaSection'
import CustomerHistorySection from '@/components/home/CustomerHistorySection'
import CompanyVideoSection from '@/components/home/CompanyVideoSection'

export const metadata: Metadata = {
  title: 'สยามกราวด์วอเตอร์ | ผู้เชี่ยวชาญด้านน้ำบาดาล',
  description:
    'บริการสำรวจ เจาะ ซ่อมบำรุง และแก้ไขปัญหาระบบน้ำบาดาล สำหรับโรงงาน โรงแรม รีสอร์ท และโครงการทั่วประเทศไทย',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <main className="page-content">
      <Hero />
      <Services />
      <CompanyVideoSection locale="th" />
      <HomeMap />
      <ProjectsSection initialItemsPerPage={6} />
      <SocialMediaSection />
      <CustomerHistorySection />
    </main>
  )
}

