import CmsProjectsManager from '@/components/cms/CmsProjectsManager'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { listCmsProjects } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsProjectsPage() {
  const session = await requireCmsPage('projects:view')
  const locale = await getCmsLocale()
  const items = await listCmsProjects()
  return (
    <CmsShell eyebrow={locale === 'th' ? 'เนื้อหา' : 'Content'} title={locale === 'th' ? 'ผลงาน' : 'Projects'} session={session}>
      <CmsProjectsManager
        initialItems={items}
        canWrite={canCmsRole(session.role, 'projects:write')}
        canDelete={canCmsRole(session.role, 'projects:delete')}
      />
    </CmsShell>
  )
}
