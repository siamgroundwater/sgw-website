import { notFound } from 'next/navigation'
import CmsShell from '@/components/cms/CmsShell'
import CmsSiteMediaEditor from '@/components/cms/CmsSiteMediaEditor'
import { canCmsRole } from '@/lib/cms-permissions'
import { isSiteMediaSectionKey } from '@/lib/site-media'
import { siteMediaLabels } from '@/lib/site-media-labels'
import { getCmsLocale } from '@/server/cms/locale'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsSiteMediaSection } from '@/server/cms/site-media'

export const dynamic = 'force-dynamic'

export default async function CmsMediaEditorPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const session = await requireCmsPage('media:view')
  const locale = await getCmsLocale()
  const { section } = await params
  if (!isSiteMediaSectionKey(section)) notFound()
  const item = await getCmsSiteMediaSection(section)
  const settings = siteMediaLabels[section]

  return (
    <CmsShell
      eyebrow={locale === 'th' ? 'รูปภาพเว็บไซต์' : 'Website images'}
      title={settings.title[locale]}
      session={session}
    >
      <CmsSiteMediaEditor
        canWrite={canCmsRole(session.role, 'media:write')}
        initialItem={item}
      />
    </CmsShell>
  )
}
