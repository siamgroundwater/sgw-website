import { NextResponse } from 'next/server'
import { validateLearningInput } from '@/lib/cms-validation'
import { createAuditChanges, recordCmsAudit } from '@/server/cms/audit'
import {
  CmsContentError,
  createCmsLearning,
  deleteCmsLearning,
  getCmsLearningById,
  listCmsLearning,
  updateCmsLearning,
} from '@/server/cms/content'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'

export const runtime = 'nodejs'
const labels = { title: 'Title', slug: 'Slug', eyebrow: 'Eyebrow', heroImage: 'Hero image', status: 'Status', audience: 'Audience', sections: 'Sections', sources: 'Sources' }

async function parseBody(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  return parsed.error
    ? { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
    : { response: null, value: parsed.value }
}

export async function GET() {
  const { response } = await requireCmsApiPermission('learning:view')
  if (response) return response
  try {
    return NextResponse.json({ items: await listCmsLearning() })
  } catch (error) {
    return cmsApiError(error, 'Could not load learning articles.')
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('learning:write')
  if (response || !user) return response
  const body = await parseBody(request)
  if (body.response) return body.response
  const result = validateLearningInput(body.value)
  if (result.errors) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: result.errors }, { status: 400 })
  try {
    const item = await createCmsLearning(result.data)
    await recordCmsAudit({ action: 'content.create', actor: user, changes: createAuditChanges(undefined, item, labels), entity: { id: item.id, label: item.title, type: 'learning' }, summary: `Created learning article ${item.title}` })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
    return cmsApiError(error, 'Could not create learning article.')
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('learning:write')
  if (response || !user) return response
  const body = await parseBody(request)
  if (body.response) return body.response
  const raw = body.value as Record<string, unknown> | null
  const id = typeof raw?.id === 'string' ? raw.id : ''
  const result = validateLearningInput(raw)
  if (!id) return NextResponse.json({ error: 'Missing article id.' }, { status: 400 })
  if (result.errors) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: result.errors }, { status: 400 })
  try {
    const before = await getCmsLearningById(id)
    const item = await updateCmsLearning(id, result.data)
    await recordCmsAudit({ action: 'content.update', actor: user, changes: createAuditChanges(before || undefined, item, labels), entity: { id: item.id, label: item.title, type: 'learning' }, summary: `Updated learning article ${item.title}` })
    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
    return cmsApiError(error, 'Could not update learning article.')
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('learning:delete')
  if (response || !user) return response
  const id = new URL(request.url).searchParams.get('id') || ''
  try {
    const before = await getCmsLearningById(id)
    await deleteCmsLearning(id)
    await recordCmsAudit({ action: 'content.archive', actor: user, entity: { id, label: before?.title, type: 'learning' }, summary: `Removed learning article ${before?.title || id}` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not remove learning article.')
  }
}
