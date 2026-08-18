import CmsProjectEditor from '@/components/cms/CmsProjectEditor'
import CmsShell from '@/components/cms/CmsShell'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function NewCmsProjectPage() {
  const session = await requireCmsPage('projects:write')
  const locale = await getCmsLocale()
  return <CmsShell eyebrow={locale === 'th' ? 'ผลงาน' : 'Projects'} title={locale === 'th' ? 'เพิ่มผลงาน' : 'Add project'} session={session}><CmsProjectEditor canWrite /></CmsShell>
}
