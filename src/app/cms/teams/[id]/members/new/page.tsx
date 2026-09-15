import { notFound } from 'next/navigation'
import CmsShell from '@/components/cms/CmsShell'
import CmsTeamMemberEditor from '@/components/cms/CmsTeamMemberEditor'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsTeamDirectorySnapshot } from '@/server/cms/teams'

export const dynamic = 'force-dynamic'

export default async function NewCmsTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCmsPage('teams:write')
  const { id } = await params
  const [locale, snapshot] = await Promise.all([getCmsLocale(), getCmsTeamDirectorySnapshot()])
  const team = snapshot.teams.find((item) => item.id === id)
  if (!team) notFound()
  return <CmsShell eyebrow={team.name} title={locale === 'th' ? 'เพิ่มบุคลากร' : 'Add team member'} session={session}>
    <CmsTeamMemberEditor
      allMembers={snapshot.members}
      canDelete={false}
      canWrite
      initialRevision={snapshot.revision}
      initialTeamId={team.id}
      teams={snapshot.teams}
      userId={session.userId}
    />
  </CmsShell>
}
