import { NextResponse } from 'next/server'
import { validateProjectForPublishing, validateProjectInput } from '@/lib/cms-validation'
import { createAuditChanges, recordCmsAudit } from '@/server/cms/audit'
import {
  CmsContentError,
  createCmsProject,
  deleteCmsProject,
  getCmsProjectById,
  listCmsProjectRevisions,
  listCmsProjects,
  publishCmsProject,
  restoreCmsProjectRevision,
  unpublishCmsProject,
  updateCmsProject,
} from '@/server/cms/content'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import {
  commitStagedProjectMedia,
  rollbackStagedProjectMedia,
  verifyStagedProjectMediaTokens,
} from '@/server/cms/staged-project-media'
import type { CmsStagedMediaTokenPayload } from '@/lib/cms-staged-media-token'
import { revalidatePublicProject } from '@/server/cms/revalidate'

export const runtime = 'nodejs'
const labels = { title: 'Title', slug: 'Slug', year: 'Year', category: 'Category', status: 'Status', location: 'Location' }

export async function GET(request: Request) {
  const { response } = await requireCmsApiPermission('projects:view')
  if (response) return response
  try {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    if (url.searchParams.get('revisions') === '1' && projectId) {
      return NextResponse.json({ items: await listCmsProjectRevisions(projectId) })
    }
    return NextResponse.json({ items: await listCmsProjects() })
  } catch (error) {
    return cmsApiError(error, 'Could not load projects.')
  }
}

async function bodyFrom(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
  return { response: null, value: parsed.value }
}

function stagedMediaIsUsed(
  staged: CmsStagedMediaTokenPayload[],
  coverImage: string,
  galleryImages: string[]
) {
  const used = new Set([coverImage, ...galleryImages])
  return staged.every(({ asset }) => used.has(asset.src))
}

async function rollbackQuietly(staged: CmsStagedMediaTokenPayload[]) {
  if (!staged.length) return true
  try {
    await rollbackStagedProjectMedia(staged)
    return true
  } catch (error) {
    console.error('Automatic project media rollback failed', error)
    return false
  }
}

async function commitQuietly(staged: CmsStagedMediaTokenPayload[]) {
  if (!staged.length) return
  try {
    await commitStagedProjectMedia(staged)
  } catch (error) {
    console.error('Could not clear committed staged project media records', error)
  }
}

async function auditStagedUploads(
  staged: CmsStagedMediaTokenPayload[],
  user: Parameters<typeof recordCmsAudit>[0]['actor']
) {
  for (const { asset } of staged) {
    await recordCmsAudit({
      action: 'media.upload',
      actor: user,
      entity: { id: asset.publicId, label: asset.publicId.split('/').at(-1), type: 'media' },
      metadata: {
        bytes: asset.bytes,
        format: asset.format,
        height: asset.height,
        width: asset.width,
      },
      summary: `Uploaded project image ${asset.publicId}`,
    })
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response
  const body = await bodyFrom(request)
  if (body.response) return body.response
  const raw = body.value as Record<string, unknown> | null
  let staged: CmsStagedMediaTokenPayload[] = []
  let committed = false
  try {
    staged = await verifyStagedProjectMediaTokens(raw?.stagedMedia, raw?.submissionId, user)
    const result = validateProjectInput(raw)
    if (result.errors) {
      const cleaned = await rollbackQuietly(staged)
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: result.errors, mediaCleanupFailed: !cleaned }, { status: 400 })
    }
    if (!stagedMediaIsUsed(staged, result.data.coverImage, result.data.galleryImages)) {
      throw new Error('INVALID_STAGED_MEDIA')
    }
    const intent = raw?.intent === 'publish' ? 'publish' : 'save-draft'
    if (intent === 'publish') {
      const publishingErrors = validateProjectForPublishing(result.data)
      if (publishingErrors) {
        const cleaned = await rollbackQuietly(staged)
        return NextResponse.json({ error: 'Complete the Thai and English content before publishing.', fields: publishingErrors, mediaCleanupFailed: !cleaned }, { status: 400 })
      }
    }
    const item = await createCmsProject(result.data, user, intent === 'publish')
    committed = true
    await recordCmsAudit({ action: intent === 'publish' ? 'content.publish' : 'content.create', actor: user, changes: createAuditChanges(undefined, item, labels), entity: { id: item.id, label: item.title, type: 'project' }, summary: intent === 'publish' ? `Created and published project ${item.title}` : `Created draft project ${item.title}` })
    await auditStagedUploads(staged, user)
    await commitQuietly(staged)
    if (intent === 'publish') revalidatePublicProject(item.id, item.publicId)
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (!committed) await rollbackQuietly(staged)
    if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
      return NextResponse.json({ error: 'Invalid or expired staged project media.' }, { status: 400 })
    }
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
    return cmsApiError(error, 'Could not create project.')
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response
  const body = await bodyFrom(request)
  if (body.response) return body.response
  const raw = body.value as Record<string, unknown> | null
  const id = typeof raw?.id === 'string' ? raw.id : ''
  if (!id) return NextResponse.json({ error: 'Missing project id.' }, { status: 400 })
  let staged: CmsStagedMediaTokenPayload[] = []
  let committed = false
  try {
    staged = await verifyStagedProjectMediaTokens(raw?.stagedMedia, raw?.submissionId, user)
    const result = validateProjectInput(raw)
    if (result.errors) {
      const cleaned = await rollbackQuietly(staged)
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: result.errors, mediaCleanupFailed: !cleaned }, { status: 400 })
    }
    if (!stagedMediaIsUsed(staged, result.data.coverImage, result.data.galleryImages)) {
      throw new Error('INVALID_STAGED_MEDIA')
    }
    const intent = raw?.intent === 'publish' ? 'publish' : 'save-draft'
    const expectedUpdatedAt = typeof raw?.expectedUpdatedAt === 'string' ? raw.expectedUpdatedAt : undefined
    if (intent === 'publish') {
      const publishingErrors = validateProjectForPublishing(result.data)
      if (publishingErrors) {
        const cleaned = await rollbackQuietly(staged)
        return NextResponse.json({ error: 'Complete the Thai and English content before publishing.', fields: publishingErrors, mediaCleanupFailed: !cleaned }, { status: 400 })
      }
    }
    const before = await getCmsProjectById(id)
    const item = intent === 'publish'
      ? await publishCmsProject(id, result.data, user, expectedUpdatedAt)
      : await updateCmsProject(id, result.data, user, expectedUpdatedAt)
    committed = true
    await recordCmsAudit({ action: intent === 'publish' ? 'content.publish' : 'content.update', actor: user, changes: createAuditChanges(before || undefined, item, labels), entity: { id: item.id, label: item.title, type: 'project' }, summary: intent === 'publish' ? `Published project ${item.title}` : `Saved draft changes for ${item.title}` })
    await auditStagedUploads(staged, user)
    await commitQuietly(staged)
    if (intent === 'publish') revalidatePublicProject(item.id, item.publicId)
    return NextResponse.json({ item })
  } catch (error) {
    if (!committed) await rollbackQuietly(staged)
    if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
      return NextResponse.json({ error: 'Invalid or expired staged project media.' }, { status: 400 })
    }
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
    return cmsApiError(error, 'Could not update project.')
  }
}

export async function PATCH(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response
  const body = await bodyFrom(request)
  if (body.response) return body.response
  const raw = body.value as Record<string, unknown> | null
  const id = typeof raw?.id === 'string' ? raw.id : ''
  const action = typeof raw?.action === 'string' ? raw.action : ''
  const expectedUpdatedAt = typeof raw?.expectedUpdatedAt === 'string' ? raw.expectedUpdatedAt : undefined
  if (!id) return NextResponse.json({ error: 'Missing project id.' }, { status: 400 })
  try {
    const before = await getCmsProjectById(id)
    if (!before) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    if (action === 'unpublish') {
      const item = await unpublishCmsProject(id, user, expectedUpdatedAt)
      await recordCmsAudit({ action: 'content.unpublish', actor: user, entity: { id, label: item.title, type: 'project' }, summary: `Unpublished project ${item.title}` })
      revalidatePublicProject(id, item.publicId)
      return NextResponse.json({ item })
    }
    if (action === 'restore' && typeof raw?.revisionId === 'string') {
      const item = await restoreCmsProjectRevision(id, raw.revisionId, user, expectedUpdatedAt)
      await recordCmsAudit({ action: 'content.restore', actor: user, entity: { id, label: item.title, type: 'project' }, summary: `Restored and published a previous version of ${item.title}` })
      revalidatePublicProject(id, item.publicId)
      return NextResponse.json({ item })
    }
    return NextResponse.json({ error: 'Invalid project action.' }, { status: 400 })
  } catch (error) {
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not update project publishing state.')
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:delete')
  if (response || !user) return response
  const id = new URL(request.url).searchParams.get('id') || ''
  try {
    const before = await getCmsProjectById(id)
    await deleteCmsProject(id)
    await recordCmsAudit({ action: 'content.archive', actor: user, entity: { id, label: before?.title, type: 'project' }, summary: `Removed project ${before?.title || id}` })
    revalidatePublicProject(id, before?.publicId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CmsContentError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not remove project.')
  }
}
