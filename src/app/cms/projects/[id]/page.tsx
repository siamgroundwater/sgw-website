import { notFound } from 'next/navigation'
import CmsProjectEditor from '@/components/cms/CmsProjectEditor'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { CmsContentError, getCmsProjectById, listCmsProjectRevisions } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

type CmsProjectEditorPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}

export default async function CmsProjectEditorPage({ params, searchParams }: CmsProjectEditorPageProps) {
  const session = await requireCmsPage('projects:view')
  const locale = await getCmsLocale()
  const { id } = await params
  let item
  let revisions
  try {
    ;[item, revisions] = await Promise.all([
      getCmsProjectById(id),
      listCmsProjectRevisions(id),
    ])
  } catch (error) {
    if (error instanceof CmsContentError && error.message === 'Invalid content id.') notFound()
    throw error
  }
  if (!item) notFound()
  const canWrite = canCmsRole(session.role, 'projects:write')
  const { created } = await searchParams
  return (
    <CmsShell eyebrow={locale === 'th' ? 'ผลงาน' : 'Projects'} title={locale === 'th' ? (canWrite ? 'แก้ไขผลงาน' : 'ดูผลงาน') : (canWrite ? 'Edit project' : 'View project')} session={session}>
      <CmsProjectEditor
        canWrite={canWrite}
        initialItem={item}
        initialRevisions={revisions}
        initialMessage={created === 'published'
          ? (locale === 'th' ? 'สร้างและเผยแพร่ผลงานแล้ว' : 'Project created and published.')
          : created === 'draft'
            ? (locale === 'th' ? 'สร้างฉบับร่างแล้ว เว็บไซต์สาธารณะยังไม่แสดงผลงานนี้' : 'Draft created. This project is not visible on the public website yet.')
            : ''}
      />
    </CmsShell>
  )
}
