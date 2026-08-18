import ContactDetails from '@/components/ContactDetails/ContactDetails'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import './page.css'

export const metadata = createThaiPageMetadata({
  title: 'ติดต่อเรา | Siam Groundwater',
  description:
    'ติดต่อบริษัท สยามกราวด์วอเตอร์ จำกัด เพื่อขอคำปรึกษา สำรวจ เจาะ ซ่อมบำรุง และแก้ไขปัญหาระบบน้ำบาดาล',
  pathname: '/contact',
})

export default function ContactPage() {
  const officeAddress =
    '75 ซอยรามคำแหง 60 (สวนสน) แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240'

  return (
    <main className="contact-page">
      <section className="contact-header">
        <p className="contact-eyebrow">CONTACT SIAM GROUNDWATER</p>
        <h1 className="contact-title-main">ติดต่อเรา</h1>
        <h2 className="contact-title-sub">บริษัท สยามกราวด์วอเตอร์ จำกัด</h2>
        <p className="contact-address">{officeAddress}</p>
      </section>

      <ContactDetails
        officeAddress={officeAddress}
        phoneTitle="ติดต่อสำนักงาน"
        emailTitle="อีเมล"
        contactTitle="ติดต่อคุณวศิน"
        locationTitle="สำนักงานบริษัท สยามกราวด์วอเตอร์"
        locationAction="เปิดเส้นทางใน Google Maps"
      />
    </main>
  )
}
