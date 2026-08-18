import CmsServicesManager from '@/components/cms/CmsServicesManager'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { listCmsServices } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsServicesPage() {
  const session = await requireCmsPage('services:view')
  const locale = await getCmsLocale()
  const items = await listCmsServices()
  return <CmsShell eyebrow={locale === 'th' ? 'เนื้อหา' : 'Content'} title={locale === 'th' ? 'บริการ' : 'Services'} session={session}><CmsServicesManager initialItems={items} canWrite={canCmsRole(session.role, 'services:write')} canDelete={canCmsRole(session.role, 'services:delete')} /></CmsShell>
}
