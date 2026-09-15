import { notFound } from 'next/navigation'
import CmsShell from '@/components/cms/CmsShell'
import CmsTeamMemberEditor from '@/components/cms/CmsTeamMemberEditor'
import { canCmsRole } from '@/lib/cms-permissions'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsTeamDirectorySnapshot } from '@/server/cms/teams'

export const dynamic = 'force-dynamic'

type MemberPageProps = {
  params: Promise<{ id: string; memberId: string }>
  searchParams: Promise<{ created?: string; moved?: string }>
}

export default async function CmsTeamMemberPage({ params, searchParams }: MemberPageProps) {
  const session = await requireCmsPage('teams:view')
  const { id, memberId } = await params
  const [locale, snapshot, query] = await Promise.all([getCmsLocale(), getCmsTeamDirectorySnapshot(), searchParams])
  const team = snapshot.teams.find((item) => item.id === id)
  const member = snapshot.members.find((item) => item.teamId === id && item.id === memberId)
  if (!team || !member) notFound()
  const canWrite = canCmsRole(session.role, 'teams:write')
  const message = query.created === '1'
    ? (locale === 'th' ? 'เพิ่มบุคลากรแล้ว เว็บไซต์แสดงข้อมูลทันที' : 'Member added and visible on the website.')
    : query.moved === '1'
      ? (locale === 'th' ? 'บันทึกและย้ายบุคลากรไปทีมนี้แล้ว' : 'Member saved and moved to this team.')
      : ''
  return <CmsShell eyebrow={team.name} title={locale === 'th' ? (canWrite ? 'แก้ไขบุคลากร' : 'ดูบุคลากร') : (canWrite ? 'Edit team member' : 'View team member')} session={session}>
    <CmsTeamMemberEditor
      allMembers={snapshot.members}
      canDelete={canCmsRole(session.role, 'teams:delete')}
      canWrite={canWrite}
      initialItem={member}
      initialMessage={message}
      initialRevision={snapshot.revision}
      initialTeamId={team.id}
      teams={snapshot.teams}
      userId={session.userId}
    />
  </CmsShell>
}
