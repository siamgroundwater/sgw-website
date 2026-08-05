import type { Metadata } from 'next'
import './page.css'

import Hero from './hero'
import Services from '../services/services'
import HomeMap from './map/map'
import ProjectsSection from './projects/projects'
import SocialMediaSection from '@/components/home/SocialMediaSection'
import CustomerHistorySection from '@/components/home/CustomerHistorySection'

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
      <HomeMap />
      <ProjectsSection />
      <CustomerHistorySection />
      <SocialMediaSection />
    </main>
  )
}

