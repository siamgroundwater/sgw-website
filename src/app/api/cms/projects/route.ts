import { NextResponse } from 'next/server'
import { ObjectId, type ClientSession } from 'mongodb'
import { validateProjectForSave, validateProjectInput } from '@/lib/cms-validation'
import { cmsProjectReadPermission } from '@/lib/cms-project-access'
import { createAuditChanges, recordCmsAudit } from '@/server/cms/audit'
import {
  CmsContentError, createCmsProject, deleteCmsProject, getCmsProjectById,
  queryCmsProjects, restoreCmsProject, updateCmsProject,
} from '@/server/cms/content'
import { getCmsProjectsCollection } from '@/server/db'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import { commitStagedProjectMedia, rollbackStagedProjectMedia, verifyStagedProjectMediaTokens } from '@/server/cms/staged-project-media'
import { getSavedProjectOperation, projectOperationFingerprint, runProjectOperation, validateProjectOperationId } from '@/server/cms/project-operations'
import { recordCmsOperationalEvent } from '@/server/cms/operations'
import type { CmsStagedMediaTokenPayload } from '@/lib/cms-staged-media-token'
import type { CmsProjectInput } from '@/types/cms'
import { revalidatePublicProject } from '@/server/cms/revalidate'

export const runtime = 'nodejs'
const labels = { title: 'Title', slug: 'Slug', year: 'Year', category: 'Category', location: 'Location', summary: 'Summary', details: 'Details', galleryImages: 'Gallery images', coverImage: 'Cover image', translations: 'Translations', workTypes: 'Work types' }

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
  return cmsApiError(error, fallback)
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const { response, user } = await requireCmsApiPermission(cmsProjectReadPermission(params.get('view')))
  if (response || !user) return response
  try {
    if (params.has('operationId')) {
      const item = await getSavedProjectOperation(user.userId, params.get('operationId') || '')
      return NextResponse.json({ item, pending: !item }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (params.has('id')) {
      const item = await getCmsProjectById(params.get('id') || '')
      return NextResponse.json({ item }, { status: item ? 200 : 404, headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json(await queryCmsProjects({
      query: params.get('query') || undefined, category: params.get('category') || undefined,
      workType: params.get('workType') || undefined, sort: params.get('sort') || undefined,
      page: params.get('page') || undefined, pageSize: params.get('pageSize') || undefined,
      view: params.get('view') || undefined,
    }), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error, 'Could not load projects.')
  }
}

async function bodyFrom(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return { response: NextResponse.json({ error: 'Invalid project data.' }, { status: 400 }), value: null }
  }
  return { response: null, value: parsed.value as Record<string, unknown> }
}

async function refreshProject(projectId: string) {
  try {
    revalidatePublicProject(projectId)
    return false
  } catch (error) {
    console.error('Saved project public refresh failed', error)
    await recordCmsOperationalEvent({ kind: 'project-revalidation', ok: false, projectId, error: 'Saved project needs public cache refresh.' })
    return true
  }
}

async function assertAllowedMedia(input: CmsProjectInput, staged: CmsStagedMediaTokenPayload[], sourceId: unknown, session: ClientSession) {
  const used = new Set([input.coverImage, ...input.galleryImages].filter(Boolean))
  if (staged.some(({ asset }) => !used.has(asset.src))) throw new CmsContentError('An uploaded image is missing from this save.', 400)
  const allowed = new Set(staged.map(({ asset }) => asset.src))
  if (sourceId !== undefined && sourceId !== '') {
    if (typeof sourceId !== 'string' || !ObjectId.isValid(sourceId)) throw new CmsContentError('Invalid source project.', 400)
    const source = await (await getCmsProjectsCollection()).findOne({
      _id: new ObjectId(sourceId), deletedAt: { $exists: false }, status: 'active',
    }, { session })
    if (!source) throw new CmsContentError('The source project was removed or changed. Reload before saving.', 409)
    for (const src of [source.coverImage, ...source.galleryImages]) allowed.add(src)
  }
  if ([...used].some((src) => !allowed.has(src))) {
    throw new CmsContentError('Upload new images through the editor, or copy images from the selected source project.', 400)
  }
}

async function save(request: Request, update: boolean) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:write')
  if (response || !user) return response
  const body = await bodyFrom(request)
  if (body.response || !body.value) return body.response
  const raw = body.value
  let staged: CmsStagedMediaTokenPayload[] = []
  let operationId = ''
  let startedWrite = false
  try {
    operationId = validateProjectOperationId(raw.operationId)
    const fingerprint = projectOperationFingerprint(update ? 'PUT' : 'POST', raw)
    const prior = await getSavedProjectOperation(user.userId, operationId, fingerprint)
    if (prior) return NextResponse.json({ item: prior, replayed: true, publicRefreshPending: await refreshProject(prior.id) })
    // Keep verified ownership available for rollback when validation rejects the form.
    staged = await verifyStagedProjectMediaTokens(raw.stagedMedia, raw.submissionId, user)
    const result = validateProjectInput(raw)
    if (result.errors) throw new CmsContentError('Please correct the highlighted fields.', 400, result.errors)
    const errors = validateProjectForSave(result.data)
    if (errors) throw new CmsContentError('Complete the required project content before saving.', 400, errors)
    const id = typeof raw.id === 'string' ? raw.id : ''
    const expectedUpdatedAt = typeof raw.expectedUpdatedAt === 'string' ? raw.expectedUpdatedAt : ''
    if (update && !id) throw new CmsContentError('Missing project id.')
    if (update && !expectedUpdatedAt) throw new CmsContentError('Reload the project before saving; its saved version is required.', 428)
    const before = update ? await getCmsProjectById(id) : null
    startedWrite = true
    const saved = await runProjectOperation(user.userId, operationId, fingerprint, async (session) => {
      staged = await verifyStagedProjectMediaTokens(raw.stagedMedia, raw.submissionId, user, session)
      await assertAllowedMedia(result.data, staged, update ? id : raw.sourceProjectId, session)
      // Removing staging inside the transaction prevents cleanup from racing the content commit.
      await commitStagedProjectMedia(staged, session)
      return update
        ? updateCmsProject(id, result.data, user, expectedUpdatedAt, session)
        : createCmsProject(result.data, user, session)
    })
    if (!saved.replayed) {
      await recordCmsAudit({
        action: update ? 'content.update' : 'content.create', actor: user,
        changes: createAuditChanges(before || undefined, saved.item, labels),
        entity: { id: saved.item.id, label: saved.item.title, type: 'project' },
        summary: `${update ? 'Saved' : 'Created'} project ${saved.item.title}`,
      })
      for (const { asset } of staged) await recordCmsAudit({
        action: 'media.upload', actor: user, entity: { id: asset.publicId, type: 'media' },
        metadata: { bytes: asset.bytes, width: asset.width, height: asset.height },
        summary: 'Uploaded a project image',
      })
    }
    return NextResponse.json({ ...saved, publicRefreshPending: await refreshProject(saved.item.id) }, { status: update || saved.replayed ? 200 : 201 })
  } catch (error) {
    const invalidMedia = error instanceof Error && error.message === 'INVALID_STAGED_MEDIA'
    if (error instanceof CmsContentError || invalidMedia || !startedWrite) {
      let mediaCleanupFailed = false
      if (staged.length) {
        try { await rollbackStagedProjectMedia(staged) } catch { mediaCleanupFailed = true }
      }
      if (invalidMedia) return NextResponse.json({ error: 'The uploaded images expired or cleanup already started. Select them again before saving.', mediaCleanupFailed }, { status: 400 })
      if (error instanceof CmsContentError) return NextResponse.json({ error: error.message, fields: error.fields, mediaCleanupFailed }, { status: error.status })
      return errorResponse(error, 'Could not save project.')
    }
    console.error('Project save result could not be confirmed', error)
    return NextResponse.json({
      error: 'The save result could not be confirmed. Check this operation before retrying.',
      pending: true, operationId,
    }, { status: 503 })
  }
}

export async function POST(request: Request) { return save(request, false) }
export async function PUT(request: Request) { return save(request, true) }

async function changeTrash(request: Request, restore: boolean) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('projects:delete')
  if (response || !user) return response
  const body = await bodyFrom(request)
  if (body.response || !body.value) return body.response
  const raw = body.value
  try {
    if (restore && raw.action !== 'restore') throw new CmsContentError('Invalid project action.')
    const operationId = validateProjectOperationId(raw.operationId)
    const fingerprint = projectOperationFingerprint(restore ? 'PATCH' : 'DELETE', raw)
    const id = typeof raw.id === 'string' ? raw.id : ''
    const expectedUpdatedAt = typeof raw.expectedUpdatedAt === 'string' ? raw.expectedUpdatedAt : ''
    const saved = await runProjectOperation(user.userId, operationId, fingerprint, (session) => restore
      ? restoreCmsProject(id, expectedUpdatedAt, session)
      : deleteCmsProject(id, expectedUpdatedAt, session))
    if (!saved.replayed) await recordCmsAudit({
      action: restore ? 'content.restore' : 'content.archive', actor: user,
      entity: { id: saved.item.id, label: saved.item.title, type: 'project' },
      summary: `${restore ? 'Restored' : 'Moved to trash'} project ${saved.item.title}`,
    })
    return NextResponse.json({ ...saved, ok: true, publicRefreshPending: await refreshProject(saved.item.id) })
  } catch (error) {
    return errorResponse(error, restore ? 'Could not restore project. Check its latest state before retrying.' : 'Could not remove project. Check its latest state before retrying.')
  }
}

export async function PATCH(request: Request) { return changeTrash(request, true) }
export async function DELETE(request: Request) { return changeTrash(request, false) }
