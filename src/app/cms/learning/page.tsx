import CmsLearningManager from '@/components/cms/CmsLearningManager'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { listCmsLearning } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsLearningPage() {
  const session = await requireCmsPage('learning:view')
  const locale = await getCmsLocale()
  const items = await listCmsLearning()
  return <CmsShell eyebrow={locale === 'th' ? 'เนื้อหา' : 'Content'} title={locale === 'th' ? 'ศูนย์ความรู้' : 'Learning center'} session={session}><CmsLearningManager initialItems={items} canWrite={canCmsRole(session.role, 'learning:write')} canDelete={canCmsRole(session.role, 'learning:delete')} /></CmsShell>
}
