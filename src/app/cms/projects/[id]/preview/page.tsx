import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProjectDetailView from '@/components/ProjectDetailView/ProjectDetailView'
import CmsShell from '@/components/cms/CmsShell'
import { getCmsProjectById } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'
import { isLocalizedLocale, localeInfo, SITE_LOCALES, type LocalizedLocale } from '@/i18n/config'
import { getLocalizedContent } from '@/i18n/localized-content'
import { getProjectCategoryLabel } from '@/lib/project-categories'
import type { Project } from '@/lib/projects'
import '@/app/(site)/projects/[id]/page.css'
import './preview.css'

export const dynamic = 'force-dynamic'

const previewLocaleLabels: Record<LocalizedLocale, string> = { th: 'ไทย', en: 'EN', zh: '中文', ja: '日本語' }

export default async function CmsProjectPreviewPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ locale?: string | string[] }>
}) {
  const session = await requireCmsPage('projects:view')
  const cmsLocale = await getCmsLocale()
  const { id } = await params
  const requestedLocale = (await searchParams).locale
  const previewLocale = typeof requestedLocale === 'string' && isLocalizedLocale(requestedLocale) ? requestedLocale : cmsLocale
  const item = await getCmsProjectById(id).catch(() => null)
  if (!item) notFound()
  const englishCms = cmsLocale === 'en'
  const project: Project = {
    _id: item.id,
    category: item.category.map(getProjectCategoryLabel),
    coverImage: item.coverImage,
    details: item.details,
    galleryImages: item.galleryImages,
    mediaMetadata: item.mediaMetadata,
    lat: item.lat,
    lng: item.lng,
    location: item.location,
    slug: item.slug,
    summary: item.summary,
    title: item.title,
    translations: item.translations,
    workTypes: item.workTypes,
    year: item.year,
  }

  return <CmsShell eyebrow={englishCms ? 'Saved project' : 'ผลงานที่บันทึกแล้ว'} title={item.title} session={session}>
    <section className="cms-preview-banner">
      <strong>{englishCms ? 'Saved version · public page layout' : 'ฉบับที่บันทึกแล้ว · รูปแบบเดียวกับหน้าเว็บไซต์'}</strong>
      <span>{englishCms ? 'Unsaved edits are not shown here.' : 'การแก้ไขที่ยังไม่บันทึกจะไม่แสดงในหน้านี้'}</span>
      <time dateTime={item.updatedAt}>{englishCms ? 'Last saved: ' : 'บันทึกล่าสุด: '}{new Intl.DateTimeFormat(englishCms ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.updatedAt))}</time>
      <nav className="cms-preview-locales" aria-label={englishCms ? 'Preview language' : 'ภาษาสำหรับดูตัวอย่าง'}>
        {SITE_LOCALES.map((locale) => <Link aria-current={locale === previewLocale ? 'page' : undefined} href={'/cms/projects/' + id + '/preview?locale=' + locale} key={locale} lang={localeInfo[locale].htmlLang}>{previewLocaleLabels[locale]}</Link>)}
      </nav>
      <Link href={'/cms/projects/' + id}>{englishCms ? 'Back to editor' : 'กลับไปหน้าแก้ไข'}</Link>
    </section>
    <div className="cms-project-public-preview" lang={localeInfo[previewLocale].htmlLang}>
      <ProjectDetailView embedded locale={previewLocale} content={getLocalizedContent(previewLocale)} project={project} />
    </div>
  </CmsShell>
}
