import GovernancePageView from '@/components/GovernancePage/GovernancePageView'
import { getPublicSiteMediaImages } from '@/server/cms/site-media'
import { createThaiPageMetadata } from '@/lib/site-metadata'
import './page.css'

export const metadata = createThaiPageMetadata({
  title: 'โครงการรักษ์น้ำบาดาล | Siam Groundwater',
  description:
    'แนวทางบริหารจัดการและอนุรักษ์ทรัพยากรน้ำบาดาลอย่างยั่งยืน โดยผู้เจาะ ผู้ใช้น้ำ และหน่วยงานภาครัฐมีส่วนร่วม',
  pathname: '/governance',
})

export default async function GovernancePage() {
  const [imageSrc = ''] = await getPublicSiteMediaImages('governance')

  return (
    <GovernancePageView
      eyebrow="โครงการรักษ์น้ำบาดาล"
      title="แนวทางบริหารจัดการทรัพยากรน้ำบาดาลอย่างยั่งยืน"
      description="แผ่นสรุปแนวคิดโครงการ “รักษ์น้ำบาดาล” แสดงบทบาทของภาครัฐ ผู้ใช้น้ำ และผู้เจาะน้ำบาดาล"
      imageAlt="Poster โครงการรักษ์น้ำบาดาล แสดงโครงสร้าง Governance น้ำบาดาล"
      imageSrc={imageSrc}
      downloadLabel="ดาวน์โหลดโปสเตอร์"
    />
  )
}
