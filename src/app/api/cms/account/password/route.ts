import { NextResponse } from 'next/server'
import { requireCmsApiUser } from '@/server/cms/guards'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'
import { changeOwnCmsPassword, CmsUserError } from '@/server/cms/users'
import { clearCmsSessionCookie } from '@/server/cms/session'
import { recordCmsAudit } from '@/server/cms/audit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestError = requireSameOrigin(request) || requireJsonRequest(request)
  if (requestError) return requestError
  const { response, user } = await requireCmsApiUser()
  if (response || !user) return response
  const parsed = await readCmsJsonBody(request)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.value as { currentPassword?: unknown; newPassword?: unknown } | null
  try {
    await changeOwnCmsPassword(user.userId, typeof body?.currentPassword === 'string' ? body.currentPassword : '', typeof body?.newPassword === 'string' ? body.newPassword : '')
    await recordCmsAudit({ action: 'user.update', actor: user, changes: [{ field: 'Password', before: null, after: 'Changed; all sessions signed out' }], entity: { id: user.userId, type: 'user', label: user.displayName }, summary: 'Changed own CMS password and signed out all sessions', metadata: { passwordChanged: true } })
    const result = NextResponse.json({ ok: true })
    clearCmsSessionCookie(result)
    return result
  } catch (error) {
    if (error instanceof CmsUserError) return NextResponse.json({ code: error.code, field: error.field }, { status: error.status })
    return cmsApiError(error, 'Could not change the password.')
  }
}
