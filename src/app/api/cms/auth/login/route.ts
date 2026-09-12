import { NextResponse } from 'next/server'
import { authenticateCmsUser } from '@/server/cms/users'
import { createCmsSessionToken, setCmsSessionCookie } from '@/server/cms/session'
import { cmsApiError, readCmsJsonBody, requireJsonRequest, requireSameOrigin } from '@/server/cms/http'

export const runtime = 'nodejs'

const attemptWindowMs = 15 * 60 * 1000
const lockMs = 15 * 60 * 1000
const maxFailures = 8
const attempts = new Map<string, { count: number; lockedUntil: number; startedAt: number }>()

function attemptKey(request: Request, username: string) {
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  return `${address}:${username.trim().toLowerCase()}`
}

function blockedSeconds(key: string) {
  const attempt = attempts.get(key)
  const now = Date.now()
  if (!attempt) return 0
  if (attempt.lockedUntil > now) return Math.ceil((attempt.lockedUntil - now) / 1000)
  if (now - attempt.startedAt > attemptWindowMs) attempts.delete(key)
  return 0
}

function recordFailure(key: string) {
  const now = Date.now()
  const previous = attempts.get(key)
  const next =
    !previous || now - previous.startedAt > attemptWindowMs
      ? { count: 1, lockedUntil: 0, startedAt: now }
      : { ...previous, count: previous.count + 1 }
  if (next.count >= maxFailures) next.lockedUntil = now + lockMs
  attempts.set(key, next)
  if (attempts.size > 5000) {
    const oldestKey = attempts.keys().next().value
    if (oldestKey) attempts.delete(oldestKey)
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const typeError = requireJsonRequest(request)
  if (typeError) return typeError

  try {
    const parsed = await readCmsJsonBody(request)
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const body = parsed.value as { password?: unknown; username?: unknown } | null
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
    }
    if (username.length > 80 || password.length > 256) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    const key = attemptKey(request, username)
    const remaining = blockedSeconds(key)
    if (remaining) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(remaining) } }
      )
    }

    // Issue time precedes credential verification so a simultaneous password reset
    // also revokes a login that was already in flight with the old password.
    const issuedAt = Date.now()
    const user = await authenticateCmsUser(username, password)
    if (!user) {
      recordFailure(key)
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    attempts.delete(key)
    const response = NextResponse.json({ user })
    setCmsSessionCookie(response, createCmsSessionToken(user, issuedAt))
    return response
  } catch (error) {
    return cmsApiError(error, 'Could not sign in to the CMS.')
  }
}
