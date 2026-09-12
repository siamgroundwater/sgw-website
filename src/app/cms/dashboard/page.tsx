import CmsDashboard from '@/components/cms/CmsDashboard'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { getCmsDashboardData } from '@/server/cms/dashboard'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsDashboardPage() {
  const session = await requireCmsPage('dashboard:view')
  const locale = await getCmsLocale()
  const canManage = canCmsRole(session.role, 'users:manage')
  const data = await getCmsDashboardData(canManage)
  return (
    <CmsShell eyebrow={locale === 'th' ? 'ภาพรวมพื้นที่ทำงาน' : 'Workspace overview'} title={locale === 'th' ? 'ภาพรวม' : 'Dashboard'} session={session}>
      <CmsDashboard data={data} canManage={canManage} canWrite={canCmsRole(session.role, 'projects:write')} />
    </CmsShell>
  )
}
