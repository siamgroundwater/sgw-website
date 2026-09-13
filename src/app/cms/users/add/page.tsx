import CmsShell from '@/components/cms/CmsShell'
import CmsUserEditor from '@/components/cms/CmsUserEditor'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function AddCmsUserPage() {
  const session = await requireCmsPage('users:manage')
  const locale = await getCmsLocale()
  return <CmsShell eyebrow={locale === 'th' ? 'การจัดการผู้ใช้' : 'User management'} title={locale === 'th' ? 'เพิ่มผู้ใช้' : 'Add user'} session={session}><CmsUserEditor currentUserId={session.userId} /></CmsShell>
}
