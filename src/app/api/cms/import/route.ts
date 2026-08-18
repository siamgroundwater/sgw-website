import { NextResponse } from 'next/server'
import { recordCmsAudit } from '@/server/cms/audit'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import { importPublicContentSnapshot } from '@/server/cms/import-public-content'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError
  const { response, user } = await requireCmsApiPermission('imports:manage')
  if (response || !user) return response

  const parsed = await readCmsJsonBody(request)
  const body = parsed.value as { confirm?: unknown } | null
  if (parsed.error || body?.confirm !== 'IMPORT_PUBLIC_SNAPSHOT') {
    return NextResponse.json({ error: 'Import confirmation is missing.' }, { status: 400 })
  }

  try {
    const result = await importPublicContentSnapshot()
    await recordCmsAudit({
      action: 'content.import',
      actor: user,
      entity: { id: new Date().toISOString(), label: 'Public website snapshot', type: 'import' },
      metadata: {
        learningInserted: result.learning.inserted,
        projectsInserted: result.projects.inserted,
        servicesInserted: result.services.inserted,
      },
      summary: 'Imported the current public SGW content snapshot into CMS',
    })
    return NextResponse.json({ result })
  } catch (error) {
    return cmsApiError(error, 'Could not import the public content snapshot.')
  }
}
