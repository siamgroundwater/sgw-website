import CmsShell from '@/components/cms/CmsShell'
import CmsTeamsManager from '@/components/cms/CmsTeamsManager'
import { canCmsRole } from '@/lib/cms-permissions'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsTeamDirectorySnapshot } from '@/server/cms/teams'

export const dynamic = 'force-dynamic'

export default async function CmsTeamsPage({ searchParams }: { searchParams: Promise<{ created?: string; removed?: string; updated?: string }> }) {
  const session = await requireCmsPage('teams:view')
  const [locale, snapshot, params] = await Promise.all([
    getCmsLocale(),
    getCmsTeamDirectorySnapshot(),
    searchParams,
  ])
  const message = params.removed === '1'
    ? (locale === 'th' ? 'ลบทีมแล้ว เว็บไซต์อัปเดตทันที' : 'Team deleted. The website was updated immediately.')
    : params.created === '1'
      ? (locale === 'th' ? 'สร้างทีมแล้ว เว็บไซต์แสดงข้อมูลทันที' : 'Team created and visible on the website.')
      : params.updated === '1'
        ? (locale === 'th' ? 'บันทึกทีมแล้ว' : 'Team saved.')
        : ''
  return <CmsShell eyebrow={locale === 'th' ? 'เกี่ยวกับเรา' : 'About'} title={locale === 'th' ? 'ทีมงาน' : 'Teams'} session={session}>
    <CmsTeamsManager canWrite={canCmsRole(session.role, 'teams:write')} initialMessage={message} initialSnapshot={snapshot} />
  </CmsShell>
}
