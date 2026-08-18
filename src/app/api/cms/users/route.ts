import { NextResponse } from 'next/server'
import { isCmsRole } from '@/lib/cms-permissions'
import { createAuditChanges, recordCmsAudit } from '@/server/cms/audit'
import { requireCmsApiPermission } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import {
  CmsUserError,
  createCmsUser,
  deleteCmsUser,
  listCmsUsers,
  updateCmsUser,
} from '@/server/cms/users'
import type { CmsStatus } from '@/types/cms'

export const runtime = 'nodejs'
const statuses: CmsStatus[] = ['draft', 'active', 'archived']
const labels = { name: 'Display name', username: 'Username', email: 'Email', role: 'Role', status: 'Status' }

type UserBody = {
  email?: unknown
  id?: unknown
  name?: unknown
  password?: unknown
  role?: unknown
  status?: unknown
  username?: unknown
}

async function parseBody(request: Request) {
  const typeError = requireJsonRequest(request)
  if (typeError) return { response: typeError, value: null }
  const parsed = await readCmsJsonBody(request)
  return parsed.error
    ? { response: NextResponse.json({ error: parsed.error }, { status: 400 }), value: null }
    : { response: null, value: parsed.value as UserBody }
}

function clean(body: UserBody) {
  const role = body.role
  const status = body.status
  if (!isCmsRole(role) || !statuses.includes(status as CmsStatus)) return null
  return {
    email: typeof body.email === 'string' ? body.email : undefined,
    name: typeof body.name === 'string' ? body.name : '',
    password: typeof body.password === 'string' ? body.password : '',
    role,
    status: status as CmsStatus,
    username: typeof body.username === 'string' ? body.username : '',
  }
}

export async function GET() {
  const { response } = await requireCmsApiPermission('users:manage')
  if (response) return response
  try {
    return NextResponse.json({ users: await listCmsUsers() })
  } catch (error) {
    return cmsApiError(error, 'Could not load CMS users.')
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user: actor } = await requireCmsApiPermission('users:manage')
  if (response || !actor) return response
  const parsed = await parseBody(request)
  if (parsed.response) return parsed.response
  const input = parsed.value ? clean(parsed.value) : null
  if (!input) return NextResponse.json({ error: 'Invalid user role or status.' }, { status: 400 })
  try {
    const user = await createCmsUser(input)
    await recordCmsAudit({ action: 'user.create', actor, changes: createAuditChanges(undefined, user, labels), entity: { id: user.id, label: user.name, type: 'user' }, summary: `Created CMS user ${user.username}` })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof CmsUserError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not create CMS user.')
  }
}

export async function PUT(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user: actor } = await requireCmsApiPermission('users:manage')
  if (response || !actor) return response
  const parsed = await parseBody(request)
  if (parsed.response) return parsed.response
  const id = typeof parsed.value?.id === 'string' ? parsed.value.id : ''
  const input = parsed.value ? clean(parsed.value) : null
  if (!id || !input) return NextResponse.json({ error: 'Invalid user data.' }, { status: 400 })
  try {
    const before = (await listCmsUsers()).find((user) => user.id === id)
    const user = await updateCmsUser({ ...input, id, password: input.password || undefined }, actor.userId)
    await recordCmsAudit({ action: 'user.update', actor, changes: createAuditChanges(before, user, labels), entity: { id: user.id, label: user.name, type: 'user' }, summary: `Updated CMS user ${user.username}` })
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof CmsUserError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not update CMS user.')
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const { response, user: actor } = await requireCmsApiPermission('users:manage')
  if (response || !actor) return response
  const id = new URL(request.url).searchParams.get('id') || ''
  try {
    const before = (await listCmsUsers()).find((user) => user.id === id)
    await deleteCmsUser(id, actor.userId)
    await recordCmsAudit({ action: 'user.delete', actor, entity: { id, label: before?.name, type: 'user' }, summary: `Removed CMS user ${before?.username || id}` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CmsUserError) return NextResponse.json({ error: error.message }, { status: error.status })
    return cmsApiError(error, 'Could not remove CMS user.')
  }
}
