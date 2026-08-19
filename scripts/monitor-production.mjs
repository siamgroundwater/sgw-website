process.env.E2E_BASE_URL = process.env.MONITOR_BASE_URL || 'https://siamgroundwater.vercel.app'
await import('./e2e-smoke.mjs')
