'use client'

import { useCmsLanguage } from '@/components/cms/CmsLanguage'

export default function CmsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  return <main className="cms-main"><section className="cms-panel" role="alert">
    <h1>{th ? 'โหลด CMS ไม่สำเร็จ' : 'Could not load the CMS'}</h1>
    <p>{th ? 'อาจมีปัญหาการเชื่อมต่อ กรุณาลองอีกครั้ง หากกำลังบันทึกผลงาน ให้ตรวจสอบรายการเดิมก่อนเพิ่มใหม่' : 'There may be a connection problem. Try again. If you were saving a project, check that record before creating another one.'}</p>
    <div className="cms-form-actions"><button className="cms-button" type="button" onClick={reset}>{th ? 'ลองอีกครั้ง' : 'Try again'}</button><a className="cms-button-secondary" href="/cms/projects">{th ? 'ไปที่ผลงาน' : 'Open project library'}</a></div>
  </section></main>
}
