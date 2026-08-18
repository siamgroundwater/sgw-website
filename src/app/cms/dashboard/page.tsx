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
  const data = await getCmsDashboardData()
  return (
    <CmsShell eyebrow={locale === 'th' ? 'ภาพรวมพื้นที่ทำงาน' : 'Workspace overview'} title={locale === 'th' ? 'ภาพรวม' : 'Dashboard'} session={session}>
      <p className="cms-notice">{locale === 'th' ? 'CMS นี้แยกจากเว็บไซต์ SGW สาธารณะโดยตั้งใจ การแก้ไขที่นี่จะไม่เผยแพร่หรือเปลี่ยนแปลงเว็บไซต์ปัจจุบัน' : 'This CMS is intentionally isolated from the public SGW pages. Editing here does not publish or change the current website.'}</p>
      <CmsDashboard data={data} canImport={canCmsRole(session.role, 'imports:manage')} />
    </CmsShell>
  )
}
