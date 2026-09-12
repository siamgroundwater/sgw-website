import { NextResponse } from 'next/server'
import { cleanupExpiredStagedProjectMedia } from '@/server/cms/staged-project-media'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && secret.length >= 24 && request.headers.get('authorization') === `Bearer ${secret}`)
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  try {
    const result = await cleanupExpiredStagedProjectMedia()
    const ok = result.failed === 0
    return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 503 })
  } catch (error) {
    console.error('Expired project media cleanup failed', error)
    return NextResponse.json({ error: 'Project media cleanup failed.', ok: false }, { status: 500 })
  }
}
