import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import './page.css'

export const metadata: Metadata = {
  title: 'นโยบายข้อมูลส่วนบุคคล | Siam Groundwater',
  description: 'แนวทางใช้และดูแลข้อมูลที่ส่งผ่านแบบฟอร์มติดต่อของ Siam Groundwater',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <p className="privacy-eyebrow">PRIVACY NOTICE</p>
      <h1>การใช้ข้อมูลจากแบบฟอร์มติดต่อ</h1>
      <p className="privacy-lead">
        บริษัท สยามกราวด์วอเตอร์ จำกัด ใช้ข้อมูลที่คุณส่งผ่านเว็บไซต์
        เพื่อประเมินคำขอ ติดต่อกลับ และจัดทำข้อเสนอที่เกี่ยวข้องเท่านั้น
      </p>

      <section>
        <h2>ข้อมูลที่รับ</h2>
        <p>
          ชื่อ บริษัทหรือโครงการ หมายเลขโทรศัพท์ อีเมล หัวข้อ
          และรายละเอียดที่คุณเลือกส่งให้ทีมงาน
        </p>
      </section>
      <section>
        <h2>วัตถุประสงค์และการเปิดเผย</h2>
        <p>
          ข้อมูลใช้เพื่อสื่อสารและประเมินงาน ไม่จำหน่ายข้อมูล
          และไม่เผยแพร่ต่อสาธารณะ อาจส่งผ่านผู้ให้บริการอีเมลที่บริษัทใช้
          เพื่อให้ข้อความถึงผู้รับอย่างปลอดภัย
        </p>
      </section>
      <section>
        <h2>ระยะเวลาและสิทธิของคุณ</h2>
        <p>
          บริษัทเก็บข้อมูลเท่าที่จำเป็นต่อการติดตามคำขอและข้อผูกพันทางธุรกิจ
          หากต้องการสอบถาม แก้ไข หรือลบข้อมูล กรุณาติดต่อ
          <a href="mailto:sgw_th@outlook.com"> sgw_th@outlook.com</a>
        </p>
      </section>

      <Link href="/contact" className="privacy-back-link">
        <ArrowLeft aria-hidden="true" />
        กลับหน้าติดต่อเรา
      </Link>
    </main>
  )
}
