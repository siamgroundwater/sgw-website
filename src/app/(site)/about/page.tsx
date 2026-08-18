// src/app/(site)/about/page.tsx

import Image from 'next/image'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import './page.css'

export const metadata = createThaiPageMetadata({
  title: 'เกี่ยวกับเรา | Siam Groundwater',
  description:
    'รู้จักบริษัท สยามกราวด์วอเตอร์ จำกัด ประสบการณ์ ทีมงาน และแนวทางพัฒนาน้ำบาดาลอย่างถูกหลักวิชาการและยั่งยืน',
  pathname: '/about',
})
import Teams from './teams/teams'
import HeroSlide from './hero-slide/HeroSlide'

const AWARDS = [
  {
    id: 'award-1',
    src: '/images/about/award/award-1.png',
    width: 138,
    height: 328,
    label: 'รางวัลคุณภาพยอดเยี่ยม',
  },
  {
    id: 'award-2',
    src: '/images/about/award/award-2.png',
    width: 358,
    height: 326,
    label: 'รางวัลสถานประกอบการดีเด่น',
  },
  {
    id: 'award-3',
    src: '/images/about/award/award-3.png',
    width: 244,
    height: 344,
    label: 'รางวัลคุณภาพยอดเยี่ยม',
  },
]

export default function AboutPage() {
  return (
    <main className="about-container">
      <section className="about-hero">
        <h1 className="about-title">เกี่ยวกับเรา</h1>
      </section>

      {/* 🔹 Hero image slider (moved) */}
      <HeroSlide />

      <section className="about-content">
        <div className="about-content-Introduction">
          <h2>ความเป็นมา</h2>
          <p className="text-indent">
            บริษัท สยามกราวด์วอเตอร์ จำกัด ก่อตั้งเมื่อปี พ.ศ.2530
            โดยผู้เชี่ยวชาญ ด้านบริหารจัดการน้ำบาดาล
            เพื่อดำเนินธุรกิจด้านการเจาะพัฒนาน้ำบาดาล
            ขึ้นมาใช้อย่างถูกหลักวิชาการ ส่งเสริมให้ทุกโครงการ
            เจาะบ่อน้ำบาดาลคุณภาพดี ใช้น้ำบาดาลอย่างอนุรักษ์
            เพื่อให้เกิดประโยชน์สูงสุดกับ ผู้ใช้น้ำบาดาล ประชาชน และประเทศชาติ
            อย่างยั่งยืน
          </p>
          <p className="text-indent">
            จากประสบการณ์ และผลงานที่ผ่านมา ได้พัฒนาด้านคุณภาพ และประสิทธิภาพ
            การทำงานอย่างต่อเนื่อง โดยการนำเทคโนโลยี และวิทยาการสมัยใหม่
            มาประยุกต์ ใช้กับการทำงาน จนสามารถให้บริการ เจาะบ่อน้ำบาดาลคุณภาพดี
            ครอบคลุมทุกภูมิภาค ทั่วประเทศ
          </p>
        </div>

        {/* Awards (public/images/about/award) */}
        <section className="about-awards">
          <div className="about-awards-grid">
            {AWARDS.map((award) => (
              <article key={award.id} className="about-award-card">
                <div className="about-award-image-wrapper">
                  <Image
                    src={award.src}
                    alt={award.label}
                    width={award.width}
                    height={award.height}
                    className="about-award-image"
                  />
                </div>
                <p className="about-award-caption">{award.label}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="about-founder">
          <div className="about-founder-image-wrapper">
            <Image
              src="/images/personnel/MD.jpg"
              alt="ผู้ก่อตั้ง บริษัท สยามกราวด์วอเตอร์ จำกัด"
              width={320}
              height={400}
              className="about-founder-image"
            />
          </div>
          <div className="about-founder-text">
            <h2 className="about-founder-header">ผู้ก่อตั้ง</h2>
            <p className="text-indent">
              บริษัท สยามกราวด์วอเตอร์ จำกัด ก่อตั้งเมื่อปี พ.ศ. 2530
              จากการรวมตัวของคณะผู้เชี่ยวชาญ
              ที่เคยปฏิบัติงานในหน่วยงานด้านน้ำบาดาลของภาครัฐหลายหน่วยงาน
              ทั้งผู้เชี่ยวชาญด้านการเจาะ การสำรวจ การซ่อมบำรุงรักษา
              และการควบคุมการใช้น้ำบาดาล
              พวกเรามีเจตนารมณ์ร่วมในการก่อตั้งบริษัทฯ
              เพื่อยกระดับมาตรฐานงานเจาะบ่อน้ำบาดาลให้มีคุณภาพ
              สามารถรองรับความต้องการใช้น้ำของโครงการขนาดใหญ่ได้อย่างมั่นคง
            </p>
          </div>
        </div>

        <Teams />
      </section>
    </main>
  )
}
