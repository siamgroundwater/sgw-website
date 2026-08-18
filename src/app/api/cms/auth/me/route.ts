import { NextResponse } from 'next/server'
import { getCmsSessionPayloadFromCookies } from '@/server/cms/session'
import { findCmsUserSessionById } from '@/server/cms/users'
import { cmsApiError } from '@/server/cms/http'

export async function GET() {
  try {
    const payload = await getCmsSessionPayloadFromCookies()
    if (!payload) return NextResponse.json({ user: null }, { status: 401 })
    const user = await findCmsUserSessionById(payload.userId)
    if (!user) return NextResponse.json({ user: null }, { status: 401 })
    return NextResponse.json({ user })
  } catch (error) {
    return cmsApiError(error, 'Could not verify the CMS session.')
  }
}
