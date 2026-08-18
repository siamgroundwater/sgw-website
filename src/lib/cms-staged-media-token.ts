import { createHmac, timingSafeEqual } from 'node:crypto'
import type { CmsMediaAsset } from '@/types/cms-media'

export type CmsStagedMediaTokenPayload = {
  asset: CmsMediaAsset
  expiresAt: number
  issuedAt: number
  submissionId: string
  userId: string
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`sgw-project-media:${value}`)
    .digest('base64url')
}

function validAsset(value: unknown): value is CmsMediaAsset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Partial<CmsMediaAsset>
  if (
    typeof asset.publicId !== 'string' ||
    !asset.publicId ||
    asset.publicId.length > 500 ||
    typeof asset.src !== 'string' ||
    asset.src.length > 1200 ||
    typeof asset.createdAt !== 'string' ||
    typeof asset.format !== 'string' ||
    typeof asset.bytes !== 'number' ||
    typeof asset.width !== 'number' ||
    typeof asset.height !== 'number'
  ) {
    return false
  }
  try {
    return new URL(asset.src).protocol === 'https:'
  } catch {
    return false
  }
}

function validIdentifier(value: unknown, limit: number) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && value.length <= limit
}

export function createCmsStagedMediaTokenValue(
  input: Omit<CmsStagedMediaTokenPayload, 'expiresAt' | 'issuedAt'>,
  secret: string,
  issuedAt: number,
  maxAgeSeconds: number
) {
  const payload: CmsStagedMediaTokenPayload = {
    ...input,
    expiresAt: issuedAt + maxAgeSeconds * 1000,
    issuedAt,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifyCmsStagedMediaTokenValue(
  token: string | undefined,
  secret: string,
  now = Date.now()
) {
  if (!token || token.length > 6000) return null
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return null

  const expected = Buffer.from(sign(encoded, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<CmsStagedMediaTokenPayload>
    if (
      !validAsset(payload.asset) ||
      !validIdentifier(payload.userId, 100) ||
      !validIdentifier(payload.submissionId, 100) ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60_000 ||
      payload.expiresAt <= now
    ) {
      return null
    }
    return payload as CmsStagedMediaTokenPayload
  } catch {
    return null
  }
}
