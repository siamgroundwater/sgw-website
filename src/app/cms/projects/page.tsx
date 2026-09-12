import CmsProjectsManager from '@/components/cms/CmsProjectsManager'
import CmsShell from '@/components/cms/CmsShell'
import { canCmsRole } from '@/lib/cms-permissions'
import { queryCmsProjects } from '@/server/cms/content'
import { requireCmsPage } from '@/server/cms/page-guard'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

export default async function CmsProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireCmsPage('projects:view')
  const locale = await getCmsLocale()
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : ''
  const canDelete = canCmsRole(session.role, 'projects:delete')
  const query = { query: value('query'), category: value('category'), workType: value('workType'), sort: value('sort') || 'updated', page: Math.max(1, Number(value('page')) || 1), pageSize: [12,24,48].includes(Number(value('pageSize'))) ? Number(value('pageSize')) : 24, view: canDelete && value('view') === 'trash' ? 'trash' : 'active' }
  const result = await queryCmsProjects(query)
  return (
    <CmsShell eyebrow={locale === 'th' ? 'เนื้อหา' : 'Content'} title={locale === 'th' ? 'ผลงาน' : 'Projects'} session={session}>
      <CmsProjectsManager
        initialResult={result}
        initialQuery={query}
        canWrite={canCmsRole(session.role, 'projects:write')}
        canDelete={canDelete}
      />
    </CmsShell>
  )
}
