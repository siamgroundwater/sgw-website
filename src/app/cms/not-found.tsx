'use client'

import { useCmsLanguage } from '@/components/cms/CmsLanguage'

export default function CmsNotFound() {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  return <main className="cms-main"><section className="cms-panel"><h1>{th ? 'ไม่พบรายการนี้' : 'This record is unavailable'}</h1><p>{th ? 'รายการอาจถูกนำออกหรือเปลี่ยนไปแล้ว กลับไปที่คลังผลงานเพื่อดูข้อมูลล่าสุด' : 'It may have been removed or changed. Return to the library to see the latest records.'}</p><a className="cms-button" href="/cms/projects">{th ? 'กลับไปที่ผลงาน' : 'Back to projects'}</a></section></main>
}
