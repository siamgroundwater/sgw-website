import { Images } from 'lucide-react'
import CmsShell from '@/components/cms/CmsShell'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsSiteMediaSection } from '@/server/cms/site-media'
import { siteMediaSectionKeys } from '@/lib/site-media'
import { siteMediaLabels } from '@/lib/site-media-labels'

export const dynamic = 'force-dynamic'

export default async function CmsMediaPage() {
  const session = await requireCmsPage('media:view')
  const locale = await getCmsLocale()
  const items = await Promise.all(
    siteMediaSectionKeys.map((section) => getCmsSiteMediaSection(section))
  )

  return (
    <CmsShell
      eyebrow={locale === 'th' ? 'เนื้อหาเว็บไซต์' : 'Website content'}
      title={locale === 'th' ? 'รูปภาพเว็บไซต์' : 'Website images'}
      session={session}
    >
      <section className="cms-panel cms-site-media-overview">
        <div className="cms-panel-header">
          <div>
            <p className="cms-eyebrow">{locale === 'th' ? 'จัดการจากจุดเดียว' : 'One media workspace'}</p>
            <h2>{locale === 'th' ? 'เลือกหน้าที่ต้องการแก้ไข' : 'Choose a page to edit'}</h2>
            <p>{locale === 'th' ? 'ภาพที่เลือกจะถูกบีบอัดบนอุปกรณ์ก่อน และอัปโหลดเมื่อกดบันทึกเท่านั้น' : 'Images are prepared on your device and uploaded only when you save.'}</p>
          </div>
        </div>

        <div className="cms-site-media-grid">
          {items.map((item) => {
            const settings = siteMediaLabels[item.section]
            return (
              <a aria-labelledby={`cms-site-media-title-${item.section}`} className="cms-site-media-card" href={`/cms/media/${item.section}`} target="_blank" rel="noopener noreferrer" key={item.section}>
                <div className="cms-site-media-card-image">
                  <img src={item.images[0]} alt="" />
                  <span>{item.images.length} {locale === 'th' ? 'ภาพ' : item.images.length === 1 ? 'image' : 'images'}</span>
                </div>
                <div className="cms-site-media-card-copy">
                  <div className="cms-site-media-card-heading">
                    <Images aria-hidden="true" />
                    <h3 id={`cms-site-media-title-${item.section}`}>{settings.title[locale]}</h3>
                  </div>
                  <p>{settings.description[locale]}</p>
                  <span className={item.fallback ? 'cms-status cms-status-warning' : 'cms-status cms-status-active'}>
                    {item.fallback
                      ? (locale === 'th' ? 'ใช้ภาพสำรอง' : 'Using public fallback')
                      : (locale === 'th' ? 'บันทึกใน Cloudinary แล้ว' : 'Managed in Cloudinary')}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      </section>
    </CmsShell>
  )
}
