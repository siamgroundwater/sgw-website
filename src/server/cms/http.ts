import 'server-only'

import { NextResponse } from 'next/server'

const maxJsonBytes = 1024 * 1024

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin

  if (!origin || origin !== requestOrigin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  return null
}

export function requireJsonRequest(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  if (!contentType.startsWith('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json.' },
      { status: 415 }
    )
  }
  return null
}

export async function readCmsJsonBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > maxJsonBytes) {
    return { error: 'Request body is too large.', value: null } as const
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > maxJsonBytes) {
    return { error: 'Request body is too large.', value: null } as const
  }

  try {
    return { error: null, value: JSON.parse(text) as unknown } as const
  } catch {
    return { error: 'Invalid JSON request body.', value: null } as const
  }
}

export function cmsApiError(error: unknown, fallback: string, details: Record<string, unknown> = {}) {
  const configurationMessage =
    error instanceof Error && error.message.includes('MONGODB_URI')
      ? 'CMS database is not configured.'
      : error instanceof Error && error.message.includes('CMS_SESSION_SECRET')
        ? 'CMS authentication is not configured.'
        : null
  if (configurationMessage) {
    return NextResponse.json({ error: configurationMessage, ...details }, { status: 500 })
  }

  console.error(fallback, error)
  const message = fallback
  return NextResponse.json({ error: message, ...details }, { status: 500 })
}
