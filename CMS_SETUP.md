# SGW CMS setup

The CMS at /cms manages the live project library, users, accounts, and activity history.

## Project workflow

There is one **Save** action. A successful save updates the website immediately.
There are no draft, publish, unpublish, or version-publication controls.

1. Open New project or an existing project in its own tab.
2. Enter Thai content, category/work-type selections, location and optional coordinates.
3. Optionally add English, Simplified Chinese, and Japanese content.
4. Select images. They are compressed locally and are not uploaded yet.
5. Save. Images upload sequentially, then a MongoDB transaction commits the project and its operation receipt.
6. If validation or a confirmed save fails, only this attempt's owned, unreferenced uploads can be rolled back. If the outcome is uncertain, check or retry the same operation instead of creating another save.
7. View saved version uses the same detail component as the public website.

Public detail URLs use MongoDB ObjectIds. Optional fields display the selected language, then English, then Thai. Translation-review indicators help identify content that should be checked again after Thai changes; translations are not automatically rewritten.

Image controls support gallery ordering, use-as-cover, enlarged preview, alt text, and captions. Existing galleries may contain up to 120 images; each save can stage one new cover plus up to 12 new gallery images. Never enter raw image URLs in the editor.

Removing a project moves it to **Trash** immediately. Administrators type its exact Thai title to confirm; restoring makes it live immediately. Trash has no automatic permanent deletion. Images referenced by Trash or historical recovery records remain protected.

Unsaved text recovery is browser-local, user-specific and tab-specific, not a server draft. It helps after refresh in the same tab. Files must be selected again after a refresh; closing the tab or clearing browser storage can remove recovery data. Templates are also browser-local and contain only categories, work types, and Thai detail sections.

## Configure local and hosted environments

Copy .env.example to .env.local for local development. Set:
- MONGODB_URI and MONGODB_DB
- CMS_SESSION_SECRET: at least 32 random characters
- CMS_COOKIE_SECURE=false for local HTTP; true for production HTTPS
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- CLOUDINARY_ROOT_FOLDER: a separate root per environment is recommended
- CLOUDINARY_MAX_FILE_SIZE_MB=4
- CRON_SECRET: at least 24 random characters for the scheduled cleanup endpoint

MongoDB must be a replica set or Atlas deployment: single-Save operations use transactions.
Use separate databases for development, previews, and production. Do not point local work at the production database.

On Vercel, set actual values in the project's environment settings. Do not upload .env.local or .env.example as a substitute for those settings. Keep credentials out of Git. .env.example contains placeholders only.

## First administrator

Set CMS_SEED_USERNAME and CMS_SEED_DISPLAY_NAME, then supply CMS_SEED_PASSWORD securely for the seed script. Passwords must be 12–256 characters.

~~~powershell
$seedPassword = Read-Host 'CMS administrator password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seedPassword)
try {
  $env:CMS_SEED_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run seed:cms-admin
} finally {
  Remove-Item Env:CMS_SEED_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
~~~

The seed command updates the matching account if it already exists. Never leave a real seed password in a committed file.

## Access

| Role | Access |
| --- | --- |
| Administrator | Projects, Trash/restore, users, own account, audit history and operational status |
| Editor | View/create/edit projects, own account and dashboard |
| Viewer | Read-only projects/dashboard and own account |

My account requires the current password before changing it. Password changes, admin password resets, deactivation, and removal invalidate old sessions. The final active administrator and your own administrative access are protected.

Sessions last eight hours. The CMS warns before expiry and can open sign-in in another tab so editor text remains mounted. An account switch requires reloading the original editor before continuing.

## Database migration

Before switching an existing deployment to this release:
1. Create and verify the encrypted backup below.
2. Run npm run migrate:cms-single-save for a read-only check.
3. If old drafts exist, stop and choose which content should become live. The migration deliberately refuses to discard them.
4. Apply only to the exact intended database:

~~~powershell
npm run migrate:cms-single-save -- --apply --backup=.cms-backups/<archive>.sgwbackup --confirm-database=<exact-database-name>
~~~

The backup must match current project content. Apply removes obsolete publication fields without changing Thai content or project IDs. Historical revision records remain recovery-only and protect their media; they are not a CMS publication system.

The retired service/learning/import/manual-media CMS APIs and their unused managers have been removed. Their stored MongoDB data and public website modules have not been deleted.

## Cleanup, monitoring and recovery

Vercel Cron runs staged-image cleanup daily at 02:23 UTC (09:23 Bangkok). Set CRON_SECRET in Vercel Production; GitHub does not need it. Failed/partial cleanup returns an error status and records operational information. The admin dashboard shows the last successful run, overdue status, pending images and recent recorded failures.

GET /api/health checks MongoDB connectivity and required media configuration; it does not prove Cloudinary is reachable. Existing production HTTP monitoring remains available through npm run monitor:production. The monitoring workflow still needs a reachable deployment URL.

npm run media:review -- --report performs a read-only Cloudinary inventory and writes an ignored report. An unused committed asset becomes a *manual review candidate* only after 30 days of observed non-use. The tool does not delete anything; verify references in every database sharing the Cloudinary account before a separate deletion decision.

Use [CMS recovery runbook](docs/CMS_RECOVERY.md) for encrypted backups and isolated restore drills.

## Repeatable checks

~~~powershell
npm run check
npm run test:e2e:cms
npm run test:e2e:cms:media
~~~

The CMS runner starts its own server and allocates an exact, fresh sgw_test_* database. It creates random temporary accounts and removes that database afterward. It never uses the configured database as the test target. The default suite makes no Cloudinary writes. The opt-in media suite creates small images in a unique test namespace and removes those exact test assets after removing their test references.

GitHub quality checks use a local disposable MongoDB replica set and no production secrets. They cover login, permissions, account/session handling, full-library search, live saving, conflict/retry recovery, Trash, language fallback, saved previews, local compression, mobile resizing, dialogs, and audit filters. The real-media suite is deliberately not run in pull requests with provider credentials.

### Verification completed — 2026-09-12

- 128 unit/source tests; ESLint; TypeScript; hover-capability checks; optimized Next.js build (406 generated pages).
- 17 isolated CMS browser tests, including interrupted saves, conflicts, image-description recovery, browser history guards and strict Trash dialogs.
- 50 existing desktop/touch learning-page regression tests.
- Real Cloudinary upload/commit/replay/rollback/cleanup tests: four temporary assets and two temporary projects cleaned up.
- 79 development projects migrated; follow-up migration dry run found zero remaining changes.
- Read-only media inventory: 675 assets, all referenced; zero deletion candidates.
- Encrypted backup and isolated restore verified; original content and media preserved.

This validation did not deploy the site, migrate a production database, configure paid provider backups, or copy the backup/key off this machine. Those are separate rollout/recovery decisions. Browser-local text recovery is available on older browsers, but same-document Back/Forward confirmation requires Navigation API support.
