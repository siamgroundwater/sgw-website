import CmsShell from '@/components/cms/CmsShell'
import CmsTeamEditor from '@/components/cms/CmsTeamEditor'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsTeamDirectorySnapshot } from '@/server/cms/teams'

export const dynamic = 'force-dynamic'

export default async function NewCmsTeamPage() {
  const session = await requireCmsPage('teams:write')
  const [locale, snapshot] = await Promise.all([getCmsLocale(), getCmsTeamDirectorySnapshot()])
  return <CmsShell eyebrow={locale === 'th' ? 'ทีมงาน' : 'Teams'} title={locale === 'th' ? 'เพิ่มทีม' : 'Add team'} session={session}>
    <CmsTeamEditor allTeams={snapshot.teams} canDelete={false} canWrite initialRevision={snapshot.revision} userId={session.userId} />
  </CmsShell>
}
