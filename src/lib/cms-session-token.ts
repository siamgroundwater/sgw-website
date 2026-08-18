import { createHmac, timingSafeEqual } from 'node:crypto'
import { isCmsRole } from './cms-permissions.ts'
import type { CmsSession } from '@/types/cms'

export type CmsSessionTokenPayload = CmsSession & {
  expiresAt: number
  issuedAt: number
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createCmsSessionTokenValue(
  payload: CmsSession,
  secret: string,
  issuedAt: number,
  maxAgeSeconds: number
) {
  const value: CmsSessionTokenPayload = {
    ...payload,
    issuedAt,
    expiresAt: issuedAt + maxAgeSeconds * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifyCmsSessionTokenValue(
  token: string | undefined,
  secret: string,
  now = Date.now()
) {
  if (!token) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null

  const expected = Buffer.from(sign(encoded, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<CmsSessionTokenPayload>
    if (
      !payload.userId ||
      !payload.username ||
      !payload.displayName ||
      !isCmsRole(payload.role) ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now
    ) {
      return null
    }
    return payload as CmsSessionTokenPayload
  } catch {
    return null
  }
}
