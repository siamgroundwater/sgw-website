import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { localePath, type SiteLocale } from '@/i18n/config'
import './hero.css'

type HeroProps = {
  locale?: SiteLocale
  copy?: {
    title: string
    tagline: string
    motto: string
    body: string[]
    company: string
  }
}

export default function Hero({ locale = 'th', copy }: HeroProps = {}) {
  return (
    <section className="home-hero">
      <div className="home-hero-inner headerText homeHead">
        <h1 className="home-hero-heading">
          <Link
            href={localePath('/governance', locale)}
            className="home-hero-governance-link"
          >
            <ShieldCheck aria-hidden="true" />
            {copy?.title ?? 'รักษ์น้ำบาดาล'}
          </Link>
        </h1>

        <p className="home-hero-tagline">
          {copy?.tagline ??
            'เจาะบ่อคุณภาพดี ติดเครื่องสูบคุณภาพดี สูบน้ำขึ้นมาใช้ถูกวิธี'}
        </p>

        <p className="home-hero-motto">
          •{copy?.motto ?? 'ทำความดีตอบแทนแผ่นดิน'}•
        </p>

        <div className="home-hero-body-group">
          {(copy?.body ?? [
            'เราจะเป็นผู้นำด้านการเจาะบ่อน้ำบาดาลคุณภาพดี และสูบพัฒนาน้ำบาดาลขึ้นมาใช้ อย่างถูกหลักวิชาการ',
            'ป้องกัน ไม่ทำให้ชั้นน้ำเสียหาย ไม่ทำลายสิ่งแวดล้อม ดูแลรักษา ทุกโครงการให้มีน้ำคุณภาพดี ใช้ได้อย่างยั่งยืน คุ้มค่าการลงทุน',
          ]).map((paragraph) => (
            <p className="home-hero-body" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>

        <p className="home-hero-company">
          {copy?.company ?? 'บริษัท สยามกราวด์วอเตอร์ จำกัด'}
        </p>
      </div>
    </section>
  )
}
