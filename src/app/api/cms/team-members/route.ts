import { NextResponse } from 'next/server'
import { TeamValidationError } from '@/lib/team-directory'
import type { CmsStagedMediaTokenPayload } from '@/lib/cms-staged-media-token'
import { recordCmsAudit } from '@/server/cms/audit'
import type { CmsAuditActor } from '@/server/cms/audit'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import { revalidatePublicTeams } from '@/server/cms/revalidate'
import {
  commitStagedProjectMedia,
  rollbackStagedProjectMedia,
  verifyStagedProjectMediaTokens,
} from '@/server/cms/staged-project-media'
import {
  CmsTeamError,
  cmsTeamDefaultPortrait,
  createCmsTeamMember,
  deleteCmsTeamMember,
  getCmsTeamMemberById,
  getCmsTeamMemberByIdAny,
  getSavedTeamOperation,
  reorderCmsTeamMembers,
  teamOperationFingerprint,
  updateCmsTeamMember,
} from '@/server/cms/teams'
import type { CmsSiteMediaItem } from '@/server/db'

export const runtime = 'nodejs'

const mediaTarget = 'team-member'

function errorResponse(
  error: unknown,
  mediaCleanup: { completed: boolean; failed: boolean } = { completed: false, failed: false },
  operationCommitted = false
) {
  const details = {
    mediaCleanupCompleted: mediaCleanup.completed,
    mediaCleanupFailed: mediaCleanup.failed,
    operationCommitted,
  }
  if (error instanceof TeamValidationError) {
    return NextResponse.json({ error: error.message, fields: error.fields, ...details }, { status: 400 })
  }
  if (error instanceof CmsTeamError) {
    return NextResponse.json({ error: error.message, fields: error.fields, ...details }, { status: error.status })
  }
  if (error instanceof Error && error.message === 'INVALID_STAGED_MEDIA') {
    return NextResponse.json({ error: 'The portrait upload expired or cleanup already started. Select it again before saving.', ...details }, { status: 400 })
  }
  return cmsApiError(error, 'Could not save the team member.', details)
}

async function body(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return { response: NextResponse.json({ error: 'Invalid team-member data.' }, { status: 400 }), value: null }
  }
  return { response: null, value: parsed.value as Record<string, unknown> }
}

function mutationContext(raw: Record<string, unknown>, userId: string, action: string, input: unknown) {
  return {
    expectedRevision: raw.expectedRevision,
    fingerprint: teamOperationFingerprint(action, input),
    operationId: raw.operationId,
    userId,
  }
}

function inputRecord(raw: Record<string, unknown>) {
  return raw.input && typeof raw.input === 'object' && !Array.isArray(raw.input)
    ? raw.input as Record<string, unknown>
    : {}
}

function imageForSave(
  imageSrc: unknown,
  staged: CmsStagedMediaTokenPayload[],
  current?: { imageAsset?: CmsSiteMediaItem['asset']; imageSrc: string } | null
): CmsSiteMediaItem {
  if (typeof imageSrc !== 'string') throw new CmsTeamError('Choose a team-member portrait.', 400, { imageSrc: 'Choose a portrait.' })
  if (staged.length > 1) throw new CmsTeamError('Only one portrait can be uploaded for each team member.', 400)
  if (staged.length) {
    if (staged[0].asset.src !== imageSrc) throw new CmsTeamError('The uploaded portrait is missing from this save.', 400)
    return { asset: staged[0].asset, src: imageSrc }
  }
  if (imageSrc === cmsTeamDefaultPortrait) return { src: imageSrc }
  if (current && imageSrc === current.imageSrc) return current.imageAsset ? { asset: current.imageAsset, src: imageSrc } : { src: imageSrc }
  throw new CmsTeamError('Select portraits through this editor before saving.', 400, { imageSrc: 'Select this portrait again.' })
}

async function rollback(staged: CmsStagedMediaTokenPayload[]) {
  if (!staged.length) return { completed: true, failed: false }
  try {
    const result = await rollbackStagedProjectMedia(staged)
    const removed = new Set(result.removed)
    return {
      completed: staged.every(({ asset }) => removed.has(asset.publicId)),
      failed: false,
    }
  } catch (error) {
    console.error('Could not clean up a rejected team-member portrait', error)
    return { completed: false, failed: true }
  }
}

export async function GET(request: Request) {
  const { response, user } = await requireCmsApiPermission('teams:view')
  if (response || !user) return response
  const params = new URL(request.url).searchParams
  try {
    if (params.has('operationId')) {
      const result = await getSavedTeamOperation(user.userId, params.get('operationId'))
      return NextResponse.json({ pending: !result, result }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const teamId = params.get('teamId') || ''
    const memberId = params.get('id') || ''
    const result = teamId
      ? await getCmsTeamMemberById(teamId, memberId)
      : await getCmsTeamMemberByIdAny(memberId)
    return NextResponse.json(result, { status: result.item ? 200 : 404, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

async function saveMember(raw: Record<string, unknown>, editing: boolean, user: CmsAuditActor) {
  const input = inputRecord(raw)
  const memberId = editing && typeof raw.id === 'string' ? raw.id : ''
  const action = editing ? 'team-member.update' : 'team-member.create'
  const fingerprintInput = { id: memberId, input }
  const context = mutationContext(raw, user.userId, action, fingerprintInput)
  let staged: CmsStagedMediaTokenPayload[] = []
  try {
    const replay = await getSavedTeamOperation(user.userId, raw.operationId, context.fingerprint)
    if (replay) {
      const currentSaved = await getCmsTeamMemberByIdAny(replay.memberId || '')
      revalidatePublicTeams()
      return NextResponse.json({ recovered: true, result: replay, item: currentSaved.item }, { status: editing ? 200 : 201 })
    }
    staged = await verifyStagedProjectMediaTokens(raw.stagedMedia, raw.submissionId, user, undefined, mediaTarget)
    const current = editing ? (await getCmsTeamMemberByIdAny(memberId)).item : null
    if (editing && !current) throw new CmsTeamError('Team member not found.', 404)
    const image = imageForSave(input.imageSrc, staged, current)
    const commitMedia = async (session: Parameters<typeof commitStagedProjectMedia>[1]) => {
      const verified = await verifyStagedProjectMediaTokens(raw.stagedMedia, raw.submissionId, user, session, mediaTarget)
      if (verified.length !== staged.length || verified.some((item, index) => item.asset.src !== staged[index]?.asset.src)) throw new Error('INVALID_STAGED_MEDIA')
      await commitStagedProjectMedia(verified, session)
    }
    const saved = editing
      ? await updateCmsTeamMember(memberId, input, image, context, commitMedia)
      : await createCmsTeamMember(input, image, context, commitMedia)
    const currentSaved = await getCmsTeamMemberByIdAny(saved.result.memberId || '')
    if (!saved.recovered) {
      await recordCmsAudit({
        action: editing ? 'content.update' : 'content.create',
        actor: user,
        entity: { id: saved.result.memberId || '', label: currentSaved.item?.name, type: 'team-member' },
        metadata: { teamId: saved.result.teamId || '', portraitUploaded: staged.length > 0 },
        summary: `${editing ? 'Updated' : 'Created'} team member ${currentSaved.item?.name || saved.result.memberId}`,
      })
      for (const { asset } of staged) await recordCmsAudit({
        action: 'media.upload', actor: user,
        entity: { id: asset.publicId, label: currentSaved.item?.name, type: 'media' },
        metadata: { bytes: asset.bytes, height: asset.height, width: asset.width },
        summary: `Uploaded a team-member portrait for ${currentSaved.item?.name || saved.result.memberId}`,
      })
    }
    revalidatePublicTeams()
    return NextResponse.json({ ...saved, item: currentSaved.item }, { status: editing ? 200 : 201 })
  } catch (error) {
    const committed = await getSavedTeamOperation(user.userId, raw.operationId, context.fingerprint).catch(() => null)
    if (committed?.memberId) {
      const currentSaved = await getCmsTeamMemberByIdAny(committed.memberId).catch(() => null)
      if (currentSaved?.item) {
        revalidatePublicTeams()
        return NextResponse.json(
          { recovered: true, result: committed, item: currentSaved.item },
          { status: editing ? 200 : 201 }
        )
      }
    }
    const mediaCleanup = staged.length ? await rollback(staged) : { completed: false, failed: false }
    return errorResponse(error, mediaCleanup, Boolean(committed))
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const parsed = await body(request)
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team-member data.' }, { status: 400 })
  return saveMember(parsed.value, false, user)
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const parsed = await body(request)
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team-member data.' }, { status: 400 })
  const raw = parsed.value
  if (raw.action !== 'reorder') return saveMember(raw, true, user)
  const teamId = typeof raw.teamId === 'string' ? raw.teamId : ''
  const input = { ids: raw.ids, teamId }
  try {
    const saved = await reorderCmsTeamMembers(teamId, raw.ids, mutationContext(raw, user.userId, 'team-member.reorder', input))
    if (!saved.recovered) await recordCmsAudit({
      action: 'content.update', actor: user,
      entity: { id: teamId, type: 'team' },
      metadata: { count: Array.isArray(raw.ids) ? raw.ids.length : 0 },
      summary: 'Reordered team members',
    })
    revalidatePublicTeams()
    return NextResponse.json(saved)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:delete')
  if (response || !user) return response
  const parsed = await body(request)
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team-member data.' }, { status: 400 })
  const raw = parsed.value
  const teamId = typeof raw.teamId === 'string' ? raw.teamId : ''
  const memberId = typeof raw.id === 'string' ? raw.id : ''
  const input = { confirmation: raw.confirmation, memberId, teamId }
  try {
    const saved = await deleteCmsTeamMember(teamId, memberId, raw.confirmation, mutationContext(raw, user.userId, 'team-member.delete', input))
    if (!saved.recovered) await recordCmsAudit({
      action: 'content.archive', actor: user,
      entity: { id: memberId, label: typeof raw.confirmation === 'string' ? raw.confirmation : undefined, type: 'team-member' },
      metadata: { teamId },
      summary: `Deleted team member ${typeof raw.confirmation === 'string' ? raw.confirmation : memberId}`,
    })
    revalidatePublicTeams()
    return NextResponse.json(saved)
  } catch (error) {
    return errorResponse(error)
  }
}
