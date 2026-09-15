# Local regression testing

These commands are manual. They do not create GitHub workflows, scheduled jobs,
or notifications. A passing run reduces risk; it cannot guarantee that a future
deployment, browser, provider outage, or content edit will never cause a problem.

## Before releasing changes

1. Run `npm run check` for hover rules, lint, TypeScript, unit/integrity tests and
   a production build. If a regression fails, investigate it; do not weaken the
   assertion or add retries just to get a green result.
2. In a separate terminal, run `npm run start -- --hostname 127.0.0.1 --port 3115`.
   Run the public checks below against that build, not a stale server.
3. Run the isolated CMS suites **one at a time**. They share a test build folder
   even when different ports are selected.
4. For upload-related changes, run the isolated real-provider media suite.
5. After deploying, run the existing read-only production smoke check and check
   the affected feature on a real phone and desktop browser.

## Public browser checks

Install the test browser engines once, and again after changing Playwright:

```powershell
npx playwright install chromium firefox webkit
```

With the production build running on port 3115:

```powershell
$env:COMPATIBILITY_E2E_BASE_URL = 'http://127.0.0.1:3115'
npm run test:e2e:compatibility

$env:E2E_BASE_URL = 'http://127.0.0.1:3115'
npm run test:e2e
npm run test:e2e:learning:routes

$env:LEARNING_E2E_BASE_URL = 'http://127.0.0.1:3115'
npm run test:e2e:learning

$env:CONTACT_E2E_BASE_URL = 'http://127.0.0.1:3115'
npm run test:e2e:contact
npm run test:e2e:loading
```

The compatibility suite covers Chromium, Firefox and WebKit at desktop and
narrow widths. Chromium/WebKit also emulate touch/mobile. Firefox narrow mode
is a resized desktop window, not mobile emulation. WebKit on Windows is not a
substitute for a real iPhone/Safari check.

Important scenarios include navigation and locale changes, history/deep links,
calculator invalid input and draft preservation, checklist cross-tab storage,
map keyboard focus/scroll restoration, galleries after resizing, and denied or
unavailable clipboard APIs. Clipboard tests do not write the system clipboard.

Reports and failure traces are in `test-results/compatibility` and
`playwright-report/compatibility`. Open the latter with:

```powershell
npx playwright show-report playwright-report/compatibility
```

## Isolated CMS checks

These require the MongoDB connection in `.env.local` to permit creating and
dropping temporary databases on a replica set. Each run creates an unpredictable
`sgw_test_*` database and temporary users, then removes only its own database.
It does not change the configured content database. Do not point the Playwright
CMS configuration directly at an existing website/account.

```powershell
npm run test:e2e:cms
npm run test:e2e:cms:firefox
npm run test:e2e:cms:webkit
```

Coverage includes account/session changes, project/user/team workflows,
simultaneous saves and duplicate requests, leader/order consistency, viewer
write restrictions, upload failure/network interruption/session expiry, and
backup verification/restore refusal checks. Mocked media failures never contact
Cloudinary. Backup tests use generated keys, archives and isolated restore
targets; existing `.cms-backups` archives and `recovery.key` are not replaced.

Browser-specific artifacts are in `test-results/cms-workflows-chromium`,
`test-results/cms-workflows-firefox`, and `test-results/cms-workflows-webkit`.

### Real media integration

```powershell
npm run test:e2e:cms:media
```

This additionally needs configured Cloudinary credentials. It uploads generated
test images only to a fresh run-specific `/e2e/sgw_test_*` namespace. The suite
checks actual compression, deferred upload, database commit, public readback,
rejected-save rollback and image cleanup. The runner removes its temporary
database and verifies cleanup of that exact Cloudinary namespace. It consumes
some provider usage; do not run it repeatedly for text/CSS-only edits.

If a runner is forcibly killed or the provider becomes unreachable during
cleanup, retain its output identifying the generated namespace/database and
verify cleanup before running again. Never clean a broad provider root or an
existing database. Do not use `test:e2e:orphan-media` as a substitute: that older
command can act on the configured development database, not a fresh fixture.

## Deployed read-only smoke check

```powershell
npm run monitor:production
```

This runs once against the configured default public Vercel URL; it is not an
automation. `MONITOR_BASE_URL` can explicitly select another deployment. It
checks health, ObjectId project routes, missing project handling, signed-out CMS
protection, sitemap and localized learning routes. It does not establish that
every environment variable, real email delivery or production write works.

## Recovery and remaining boundaries

Backup integrity tests reject wrong keys, truncated or modified ciphertext, and
incorrect media checksums. Restore guards reject source/configured/nonempty
databases. A restore interrupted after writes begin can still leave a partial
**new** restore database; treat it as failed, never switch the website to it,
and retry into another verified-empty isolated target. Successful database
restore does not automatically restore a lost Cloudinary account.

Still check real iOS/Android hardware, actual email delivery with an authorized
recipient, deployment configuration and real-world accessibility. These are not
proved by emulation or mocked provider responses. See the dated audit report in
`test-results` for actual pass/fail results; the existence of a test is not proof
that it currently passes.
