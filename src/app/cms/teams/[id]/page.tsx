import { notFound } from 'next/navigation'
import CmsShell from '@/components/cms/CmsShell'
import CmsTeamEditor from '@/components/cms/CmsTeamEditor'
import { canCmsRole } from '@/lib/cms-permissions'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsTeamById, getCmsTeamDirectorySnapshot } from '@/server/cms/teams'

export const dynamic = 'force-dynamic'

type TeamPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; memberRemoved?: string }>
}

export default async function CmsTeamPage({ params, searchParams }: TeamPageProps) {
  const session = await requireCmsPage('teams:view')
  const { id } = await params
  const [locale, result, snapshot, query] = await Promise.all([
    getCmsLocale(),
    getCmsTeamById(id),
    getCmsTeamDirectorySnapshot(),
    searchParams,
  ])
  if (!result.item) notFound()
  const canWrite = canCmsRole(session.role, 'teams:write')
  const message = query.created === '1'
    ? (locale === 'th' ? 'สร้างทีมแล้ว เว็บไซต์แสดงข้อมูลนี้ทันที' : 'Team created and visible on the website.')
    : query.memberRemoved === '1'
      ? (locale === 'th' ? 'ลบบุคลากรแล้ว เว็บไซต์อัปเดตทันที' : 'Member deleted. The website was updated immediately.')
      : ''
  return <CmsShell eyebrow={locale === 'th' ? 'ทีมงาน' : 'Teams'} title={locale === 'th' ? (canWrite ? 'แก้ไขทีม' : 'ดูทีม') : (canWrite ? 'Edit team' : 'View team')} session={session}>
    <CmsTeamEditor
      allTeams={snapshot.teams}
      canDelete={canCmsRole(session.role, 'teams:delete')}
      canWrite={canWrite}
      initialItem={result.item}
      initialMembers={result.members}
      initialMessage={message}
      initialRevision={result.revision}
      userId={session.userId}
    />
  </CmsShell>
}
