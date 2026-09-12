import 'server-only'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { CmsUserRole } from '@/server/db/types'
import { createCmsSessionTokenValue, verifyCmsSessionTokenValue } from '@/lib/cms-session-token'

export const CMS_SESSION_COOKIE_NAME = 'sgw_cms_session'
export const CMS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

export type CmsSessionPayload = {
  sessionVersion?: number
  displayName: string
  expiresAt: number
  issuedAt: number
  role: CmsUserRole
  userId: string
  username: string
}

function getSessionSecret() {
  const secret = process.env.CMS_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32 || secret.toLowerCase().startsWith('replace-with')) {
    throw new Error('CMS_SESSION_SECRET must contain at least 32 characters.')
  }
  return secret
}

function shouldUseSecureCookie() {
  const setting = process.env.CMS_COOKIE_SECURE?.replace(/^['"]|['"]$/g, '').toLowerCase()
  if (setting === 'false') return false
  if (setting === 'true') return true
  return process.env.NODE_ENV === 'production'
}

export function createCmsSessionToken(
  payload: Omit<CmsSessionPayload, 'expiresAt' | 'issuedAt'>,
  issuedAt = Date.now(),
) {
  return createCmsSessionTokenValue(
    payload,
    getSessionSecret(),
    issuedAt,
    CMS_SESSION_MAX_AGE_SECONDS
  )
}

export function verifyCmsSessionToken(token: string | undefined) {
  return verifyCmsSessionTokenValue(token, getSessionSecret()) as CmsSessionPayload | null
}

export async function getCmsSessionPayloadFromCookies() {
  const cookieStore = await cookies()
  return verifyCmsSessionToken(cookieStore.get(CMS_SESSION_COOKIE_NAME)?.value)
}

export function setCmsSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(CMS_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: CMS_SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: shouldUseSecureCookie(),
  })
}

export function clearCmsSessionCookie(response: NextResponse) {
  response.cookies.set(CMS_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: shouldUseSecureCookie(),
  })
}
