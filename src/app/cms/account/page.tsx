import CmsShell from '@/components/cms/CmsShell'
import CmsAccount from '@/components/cms/CmsAccount'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsAccountPage() {
  const session = await requireCmsPage('dashboard:view')
  const locale = await getCmsLocale()
  return <CmsShell session={session} eyebrow={locale === 'th' ? 'การตั้งค่าบัญชี' : 'Account settings'} title={locale === 'th' ? 'บัญชีของฉัน' : 'My account'}><CmsAccount session={session} /></CmsShell>
}
