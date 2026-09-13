import CmsShell from '@/components/cms/CmsShell'
import CmsUsersManager from '@/components/cms/CmsUsersManager'
import { requireCmsPage } from '@/server/cms/page-guard'
import { listCmsUsers } from '@/server/cms/users'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsUsersPage({ searchParams }: { searchParams: Promise<{ created?: string; removed?: string; updated?: string }> }) {
  const session = await requireCmsPage('users:manage')
  const locale = await getCmsLocale()
  const users = await listCmsUsers()
  const state = await searchParams
  const message = state.created === '1'
    ? (locale === 'th' ? 'เพิ่มผู้ใช้ CMS แล้ว' : 'CMS user added.')
    : state.updated === '1'
      ? (locale === 'th' ? 'บันทึกผู้ใช้ CMS แล้ว' : 'CMS user saved.')
      : state.removed === '1'
        ? (locale === 'th' ? 'ลบผู้ใช้ CMS แล้ว' : 'CMS user deleted.')
        : ''
  return <CmsShell eyebrow={locale === 'th' ? 'การจัดการระบบ' : 'Administration'} title={locale === 'th' ? 'ผู้ใช้' : 'Users'} session={session}><CmsUsersManager initialUsers={users} currentUserId={session.userId} initialMessage={message} /></CmsShell>
}
