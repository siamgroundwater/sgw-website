import type { Metadata } from 'next'
import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import { getLocalizedContent } from '@/i18n/localized-content'

const content = getLocalizedContent('th')

export const metadata: Metadata = {
  title:
    'เจาะบ่อน้ำบาดาล บ่อน้ำแร่ บ่อน้ำพุร้อน บ่อสูบลดระดับน้ำ | Siam Groundwater',
  description:
    'ก่อสร้างบ่อน้ำบาดาลในชั้นกรวดทรายและหินแข็ง บ่อสูบลดระดับน้ำ บ่อสังเกตการณ์ พร้อมพัฒนาบ่อ สูบทดสอบ ติดตั้งเครื่องสูบ และอุดกลบบ่อที่เลิกใช้งาน',
  alternates: { canonical: '/services/drilling' },
  openGraph: {
    title: 'เจาะบ่อน้ำบาดาล บ่อน้ำแร่ บ่อน้ำพุร้อน บ่อสูบลดระดับน้ำ',
    description:
      'ออกแบบและก่อสร้างบ่อให้เหมาะกับชั้นน้ำ การใช้งาน และเกณฑ์ตรวจรับ พร้อมข้อมูลสูบทดสอบสำหรับเลือกเครื่องสูบ',
    url: '/services/drilling',
    type: 'article',
    images: ['/images/services/drilling/legacy-01.jpg'],
  },
}

export default function DrillingServicePage() {
  return (
    <ServiceDetailPage locale="th" content={content} serviceKey="drilling" />
  )
}
