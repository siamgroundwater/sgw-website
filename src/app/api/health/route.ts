import { NextResponse } from 'next/server'
import { pingMongo } from '@/server/db'
import { configureCloudinary } from '@/server/cloudinary/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startedAt = Date.now()
  let database = false
  let mediaConfiguration = false
  try {
    await Promise.race([
      pingMongo(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB health check timed out.')), 8000)),
    ])
    database = true
  } catch (error) {
    console.error('Health check could not reach MongoDB', error)
  }
  try {
    configureCloudinary()
    mediaConfiguration = true
  } catch (error) {
    console.error('Health check found invalid Cloudinary configuration', error)
  }
  const ok = database && mediaConfiguration
  return NextResponse.json(
    {
      checks: { database, mediaConfiguration },
      durationMs: Date.now() - startedAt,
      ok,
      service: 'siamgroundwater',
    },
    {
      headers: { 'Cache-Control': 'no-store' },
      status: ok ? 200 : 503,
    }
  )
}
