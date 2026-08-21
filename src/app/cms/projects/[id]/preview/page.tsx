import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projectWorkTypeLabel } from '@/lib/project-work-types'
import ProjectMediaSlider from '@/components/ProjectMediaSlider/ProjectMediaSlider'
import CmsShell from '@/components/cms/CmsShell'
import { getCmsProjectById } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsProjectPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCmsPage('projects:view')
  const locale = await getCmsLocale()
  const { id } = await params
  const item = await getCmsProjectById(id).catch(() => null)
  if (!item) notFound()
  const english = locale === 'en'
  const translated = item.translations.en
  const title = english ? translated.title || item.title : item.title
  const location = english ? translated.location || item.location : item.location
  const summary = english ? translated.summary || item.summary : item.summary
  const details = english && translated.details.length ? translated.details : item.details
  const workTypes = item.workTypes.map((workType) => projectWorkTypeLabel(english ? 'en' : 'th', workType))
  const images = Array.from(new Set([item.coverImage, ...item.galleryImages].filter(Boolean)))

  return (
    <CmsShell eyebrow={english ? 'Draft preview' : 'ตัวอย่างฉบับร่าง'} title={title} session={session}>
      <section className="cms-preview-banner">
        <strong>{english ? 'Private preview' : 'ตัวอย่างส่วนตัว'}</strong>
        <span>{english ? 'Only signed-in CMS users can view this page.' : 'เฉพาะผู้ใช้ CMS ที่เข้าสู่ระบบแล้วเท่านั้นที่ดูหน้านี้ได้'}</span>
        <Link href={`/cms/projects/${id}`}>{english ? 'Back to editor' : 'กลับไปหน้าแก้ไข'}</Link>
      </section>
      <article className="cms-project-preview">
        {images.length ? <ProjectMediaSlider images={images} locale={english ? 'en' : 'th'} projectNumber={id} title={title} /> : null}
        <header><p>{item.year || '—'} · {location}</p><h2>{title}</h2></header>
        <dl>
          <div><dt>{english ? 'Work types' : 'ประเภทงาน'}</dt><dd>{workTypes.join(' · ') || '—'}</dd></div>
        </dl>
        <p>{summary}</p>
        {details.map((detail, index) => <p key={`${index}-${detail.slice(0, 20)}`}>{detail}</p>)}
      </article>
    </CmsShell>
  )
}
