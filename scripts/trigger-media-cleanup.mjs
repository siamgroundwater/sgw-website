const baseUrl = (process.env.MONITOR_BASE_URL || 'https://siamgroundwater.vercel.app').replace(/\/$/, '')
const secret = process.env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET is required.')

const response = await fetch(`${baseUrl}/api/cron/cleanup-project-media`, {
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(30_000),
})
const payload = await response.json().catch(() => ({}))
if (!response.ok || payload.ok !== true) {
  throw new Error(`Project media cleanup failed with HTTP ${response.status}.`)
}
console.log(`Project media cleanup completed: checked=${payload.checked}, removed=${payload.removed}, preserved=${payload.preserved}.`)
