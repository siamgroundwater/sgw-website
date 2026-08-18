import CmsShell from '@/components/cms/CmsShell'
import CmsUsersManager from '@/components/cms/CmsUsersManager'
import { requireCmsPage } from '@/server/cms/page-guard'
import { listCmsUsers } from '@/server/cms/users'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsUsersPage() {
  const session = await requireCmsPage('users:manage')
  const locale = await getCmsLocale()
  const users = await listCmsUsers()
  return <CmsShell eyebrow={locale === 'th' ? 'การจัดการระบบ' : 'Administration'} title={locale === 'th' ? 'ผู้ใช้' : 'Users'} session={session}><CmsUsersManager initialUsers={users} currentUserId={session.userId} /></CmsShell>
}
