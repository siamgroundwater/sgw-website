import Image from 'next/image'
import { Download } from 'lucide-react'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import './page.css'

export const metadata = createThaiPageMetadata({
  title: 'โครงการรักษ์น้ำบาดาล | Siam Groundwater',
  description:
    'แนวทางบริหารจัดการและอนุรักษ์ทรัพยากรน้ำบาดาลอย่างยั่งยืน โดยผู้เจาะ ผู้ใช้น้ำ และหน่วยงานภาครัฐมีส่วนร่วม',
  pathname: '/governance',
})

export default function GovernancePage() {
  return (
    <main className="governance-page">
      <section className="governance-header">
        <p className="governance-eyebrow">โครงการรักษ์น้ำบาดาล</p>
        <p className="governance-title-th">
          แนวทางบริหารจัดการทรัพยากรน้ำบาดาลอย่างยั่งยืน
        </p>
        <p className="governance-description">
          แผ่นสรุปแนวคิดโครงการ “รักษ์น้ำบาดาล” แสดงบทบาทของภาครัฐ ผู้ใช้น้ำ
          และผู้เจาะน้ำบาดาล
        </p>
      </section>

      <section className="governance-poster-section">
        <div className="governance-poster-frame">
          <div className="governance-poster-inner">
            <Image
              src="/images/governance/Poster_โครงการรักษ์น้ำบาดาล.png"
              alt="Poster โครงการรักษ์น้ำบาดาล แสดงโครงสร้าง Governance น้ำบาดาล"
              width={1200}
              height={1700}
              className="governance-poster-image"
              priority
            />
          </div>
        </div>
        <a
          className="governance-download-button"
          href="/images/governance/Poster_โครงการรักษ์น้ำบาดาล.png"
          download="Poster_โครงการรักษ์น้ำบาดาล.png"
        >
          <Download aria-hidden="true" />
          ดาวน์โหลดโปสเตอร์
        </a>
      </section>
    </main>
  )
}
