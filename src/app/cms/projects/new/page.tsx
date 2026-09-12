import CmsProjectEditor from '@/components/cms/CmsProjectEditor'
import CmsShell from '@/components/cms/CmsShell'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'
import { getCmsProjectById } from '@/server/cms/content'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewCmsProjectPage({ searchParams }: { searchParams: Promise<{ sourceProjectId?: string }> }) {
  const session = await requireCmsPage('projects:write')
  const locale = await getCmsLocale()
  const { sourceProjectId } = await searchParams
  const sourceItem = sourceProjectId ? await getCmsProjectById(sourceProjectId).catch(() => null) : undefined
  if (sourceProjectId && !sourceItem) notFound()
  return <CmsShell eyebrow={locale === 'th' ? 'ผลงาน' : 'Projects'} title={locale === 'th' ? 'เพิ่มผลงาน' : 'Add project'} session={session}><CmsProjectEditor canWrite userId={session.userId} sourceItem={sourceItem || undefined} /></CmsShell>
}
