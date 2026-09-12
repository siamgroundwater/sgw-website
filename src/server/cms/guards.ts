import 'server-only'

import { NextResponse } from 'next/server'
import { canCmsRole, type CmsPermission } from '@/lib/cms-permissions'
import { getCmsSessionPayloadFromCookies } from './session'
import { findCmsUserSessionById } from './users'

export async function getCurrentCmsUser() {
  const payload = await getCmsSessionPayloadFromCookies()
  if (!payload) return null
  const user = await findCmsUserSessionById(payload.userId, payload.issuedAt, payload.sessionVersion)
  return user ? { ...user, expiresAt: payload.expiresAt } : null
}

export async function requireCmsApiUser() {
  const user = await getCurrentCmsUser()
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
      user: null,
    }
  }
  return { response: null, user }
}

export async function requireCmsApiPermission(permission: CmsPermission) {
  const { response, user } = await requireCmsApiUser()
  if (response || !user) return { response, user: null }
  if (!canCmsRole(user.role, permission)) {
    return {
      response: NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      ),
      user: null,
    }
  }
  return { response: null, user }
}
