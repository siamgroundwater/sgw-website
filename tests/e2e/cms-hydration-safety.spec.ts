import { expect, test, type Page } from '@playwright/test'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (
  !/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB ||
  database === process.env.CMS_E2E_SOURCE_DATABASE || !password || !origin ||
  process.env.CLOUDINARY_CLOUD_NAME !== 'isolated-test-no-provider'
) throw new Error('CMS hydration safety tests require the isolated no-provider npm run test:e2e:cms runner.')
const server = new URL(origin)
if (server.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(server.hostname) || !server.port) {
  throw new Error('CMS hydration safety tests require the isolated local HTTP server.')
}

// These are deliberately public fixture strings, never the runner credential.
const probePassword = 'PUBLIC-HYDRATION-PROBE-ONLY-123'
const sensitiveKeys = new Set(['password', 'passwordconfirmation', 'currentpassword', 'newpassword', 'confirmation'])

async function signIn(page: Page) {
  const response = await page.request.post('/api/cms/auth/login', {
    headers: { Origin: origin }, data: { username: 'qa-admin', password },
  })
  expect(response.ok(), 'The isolated account must authenticate before the nonsecret hydration probe').toBeTruthy()
}

const cases = [
  {
    name: 'login', path: '/cms/login', authenticate: false,
    form: 'form:has(input[autocomplete="current-password"])',
    fields: [
      ['input[autocomplete="username"]', 'hydration-probe'],
      ['input[autocomplete="current-password"]', probePassword],
    ],
  },
  {
    name: 'account password change', path: '/cms/account', authenticate: true,
    form: 'form:has(input[name="currentPassword"])',
    fields: [
      ['input[name="currentPassword"]', probePassword],
      ['input[name="newPassword"]', probePassword],
      ['input[name="confirmation"]', probePassword],
    ],
  },
  {
    name: 'add user', path: '/cms/users/add', authenticate: true,
    form: 'form:has(input[name="passwordConfirmation"])',
    fields: [
      ['input[name="name"]', 'Public hydration probe'],
      ['input[name="username"]', 'hydration-probe'],
      ['input[name="email"]', 'hydration-probe@example.invalid'],
      ['input[name="password"]', probePassword],
      ['input[name="passwordConfirmation"]', probePassword],
    ],
  },
] as const

for (const scenario of cases) {
  test(`${scenario.name} cannot send password fields in a native URL before client hydration`, async ({ page }) => {
    if (scenario.authenticate) await signIn(page)
    let releaseScripts!: () => void
    const scriptsReleased = new Promise<void>((resolve) => { releaseScripts = resolve })
    const releaseTimer = setTimeout(releaseScripts, 45_000)
    let blockedScripts = 0
    let probeStarted = false
    const sensitiveQueryFields: string[][] = []
    const unexpectedWrites: string[] = []

    // Abort every submission navigation during the probe before it can reach
    // the server. Report field NAMES only; even test values stay out of errors.
    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const names = [...url.searchParams.keys()].filter((name) => sensitiveKeys.has(name.toLowerCase()))
      if (names.length) {
        sensitiveQueryFields.push(names)
        await route.abort('aborted')
      } else if (probeStarted && request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        await route.abort('aborted')
      } else if (probeStarted && !['GET', 'HEAD'].includes(request.method()) && url.pathname.startsWith('/api/cms/')) {
        unexpectedWrites.push(url.pathname)
        await route.fulfill({ status: 409, json: { error: 'No writes are permitted during the hydration probe.' } })
      } else await route.continue()
    })
    await page.route('**/_next/static/**/*.js', async (route) => {
      blockedScripts += 1
      await scriptsReleased
      await route.continue().catch(() => { /* The intentionally aborted document may already be gone. */ })
    })
    try {
      await page.goto(scenario.path, { waitUntil: 'commit' })
      const form = page.locator(scenario.form)
      await expect(form).toBeVisible()
      await expect.poll(() => blockedScripts).toBeGreaterThan(0)
      const submit = form.locator('button[type="submit"]')
      probeStarted = true
      const disabledFields = await Promise.all(scenario.fields.map(([selector]) => form.locator(selector).isDisabled()))
      if (await submit.isDisabled() || disabledFields.some(Boolean)) {
        // Disabling input/submit until hydration is an acceptable safe state.
        expect(sensitiveQueryFields).toEqual([])
        return
      }
      for (const [selector, value] of scenario.fields) await form.locator(selector).fill(value)
      await submit.click({ noWaitAfter: true })
      // Native document requests are dispatched asynchronously after submit.
      // Client bundles remain held throughout this short observation window.
      await page.waitForTimeout(400)
      expect(sensitiveQueryFields, 'Password field names must never appear in a document request URL before hydration').toEqual([])
      expect(unexpectedWrites, 'A delayed-hydration safety probe must not invoke a CMS write endpoint').toEqual([])
    } finally {
      clearTimeout(releaseTimer)
      releaseScripts()
      await page.unrouteAll({ behavior: 'wait' })
    }
  })
}
