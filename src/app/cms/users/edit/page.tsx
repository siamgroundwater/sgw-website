import { notFound } from 'next/navigation'
import CmsShell from '@/components/cms/CmsShell'
import CmsUserEditor from '@/components/cms/CmsUserEditor'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'
import { getCmsUserById } from '@/server/cms/users'

export const dynamic = 'force-dynamic'

export default async function EditCmsUserPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const session = await requireCmsPage('users:manage')
  const locale = await getCmsLocale()
  const requestedId = (await searchParams).id
  const user = typeof requestedId === 'string' ? await getCmsUserById(requestedId) : null
  if (!user) notFound()
  return <CmsShell eyebrow={locale === 'th' ? 'การจัดการผู้ใช้' : 'User management'} title={locale === 'th' ? 'แก้ไขผู้ใช้' : 'Edit user'} session={session}><CmsUserEditor initialUser={user} currentUserId={session.userId} /></CmsShell>
}
