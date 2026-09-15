import { NextResponse } from 'next/server'
import { TEAM_DEPARTMENTS, TeamValidationError, type TeamDepartment } from '@/lib/team-directory'
import { recordCmsAudit } from '@/server/cms/audit'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import { revalidatePublicTeams } from '@/server/cms/revalidate'
import {
  CmsTeamError,
  createCmsTeam,
  deleteCmsTeam,
  getCmsTeamById,
  getCmsTeamDirectorySnapshot,
  getSavedTeamOperation,
  reorderCmsTeams,
  teamOperationFingerprint,
  updateCmsTeam,
} from '@/server/cms/teams'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof TeamValidationError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
  }
  if (error instanceof CmsTeamError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status })
  }
  return cmsApiError(error, 'Could not save the team directory.')
}

async function body(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return { response: NextResponse.json({ error: 'Invalid team data.' }, { status: 400 }), value: null }
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

export async function GET(request: Request) {
  const { response, user } = await requireCmsApiPermission('teams:view')
  if (response || !user) return response
  const params = new URL(request.url).searchParams
  try {
    if (params.has('operationId')) {
      const result = await getSavedTeamOperation(user.userId, params.get('operationId'))
      return NextResponse.json({ pending: !result, result }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (params.has('id')) {
      const result = await getCmsTeamById(params.get('id') || '')
      return NextResponse.json(result, { status: result.item ? 200 : 404, headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json(await getCmsTeamDirectorySnapshot(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const parsed = await body(request)
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team data.' }, { status: 400 })
  const raw = parsed.value
  try {
    const saved = await createCmsTeam(raw.input, mutationContext(raw, user.userId, 'team.create', raw.input))
    const current = await getCmsTeamById(saved.result.teamId || '')
    if (!saved.recovered) {
      await recordCmsAudit({
        action: 'content.create',
        actor: user,
        entity: { id: saved.result.teamId || '', label: current.item?.name, type: 'team' },
        metadata: { department: current.item?.department || '' },
        summary: `Created team ${current.item?.name || saved.result.teamId}`,
      })
    }
    revalidatePublicTeams()
    return NextResponse.json({ ...saved, item: current.item }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user } = await requireCmsApiPermission('teams:write')
  if (response || !user) return response
  const parsed = await body(request)
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team data.' }, { status: 400 })
  const raw = parsed.value
  try {
    if (raw.action === 'reorder') {
      const orders = raw.orders ?? (() => {
        if (!TEAM_DEPARTMENTS.includes(raw.department as TeamDepartment)) throw new CmsTeamError('Choose a valid department.', 400)
        return { [raw.department as TeamDepartment]: raw.ids }
      })()
      const input = { orders }
      const saved = await reorderCmsTeams(
        orders,
        mutationContext(raw, user.userId, 'team.reorder', input)
      )
      if (!saved.recovered) await recordCmsAudit({
        action: 'content.update', actor: user,
        entity: { id: 'team-directory', label: 'Team directory', type: 'team' },
        metadata: {
          count: orders && typeof orders === 'object' && !Array.isArray(orders)
            ? Object.values(orders).reduce((total, ids) => total + (Array.isArray(ids) ? ids.length : 0), 0)
            : 0,
        },
        summary: 'Reordered team directory',
      })
      revalidatePublicTeams()
      return NextResponse.json(saved)
    }
    const id = typeof raw.id === 'string' ? raw.id : ''
    const input = { id, input: raw.input }
    const saved = await updateCmsTeam(id, raw.input, mutationContext(raw, user.userId, 'team.update', input))
    const current = await getCmsTeamById(id)
    if (!saved.recovered) await recordCmsAudit({
      action: 'content.update', actor: user,
      entity: { id, label: current.item?.name, type: 'team' },
      summary: `Updated team ${current.item?.name || id}`,
    })
    revalidatePublicTeams()
    return NextResponse.json({ ...saved, item: current.item })
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
  if (parsed.response || !parsed.value) return parsed.response ?? NextResponse.json({ error: 'Invalid team data.' }, { status: 400 })
  const raw = parsed.value
  const id = typeof raw.id === 'string' ? raw.id : ''
  const input = { confirmation: raw.confirmation, id }
  try {
    const saved = await deleteCmsTeam(id, raw.confirmation, mutationContext(raw, user.userId, 'team.delete', input))
    if (!saved.recovered) await recordCmsAudit({
      action: 'content.archive', actor: user,
      entity: { id, label: typeof raw.confirmation === 'string' ? raw.confirmation : undefined, type: 'team' },
      summary: `Deleted team ${typeof raw.confirmation === 'string' ? raw.confirmation : id}`,
    })
    revalidatePublicTeams()
    return NextResponse.json(saved)
  } catch (error) {
    return errorResponse(error)
  }
}
