import { NextResponse } from 'next/server'
import { clearCmsSessionCookie } from '@/server/cms/session'
import { requireSameOrigin } from '@/server/cms/http'

export async function POST(request: Request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const response = NextResponse.json({ ok: true })
  clearCmsSessionCookie(response)
  return response
}
