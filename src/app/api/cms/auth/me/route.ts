import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/server/cms/guards'
import { cmsApiError } from '@/server/cms/http'

export async function GET() {
  try {
    const user = await getCurrentCmsUser()
    if (!user) return NextResponse.json({ user: null }, { status: 401 })
    return NextResponse.json({ user })
  } catch (error) {
    return cmsApiError(error, 'Could not verify the CMS session.')
  }
}
