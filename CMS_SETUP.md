# SGW CMS setup

The SGW CMS is a MongoDB-backed workspace at `/cms`. Published projects are live on the public frontend. Saving a draft is private; selecting **Publish** updates public project pages and listings immediately.

## Included areas

- Projects, including location, coordinates, category, work types, cover media, and gallery media
- Thai-first and English project content, private draft preview, explicit publishing, unpublishing, and published-version restore
- The four SGW service records with repeatable technical detail blocks
- Learning-center article records with repeatable sections and official sources
- Role-based CMS users: administrator, content editor, and read-only viewer
- Same-origin protected mutation APIs, signed HTTP-only sessions, login throttling, and 365-day audit history
- A guarded import that copies the current public SGW snapshot into MongoDB without overwriting records already edited in CMS

## 1. Configure MongoDB and session security

Copy `.env.example` to `.env.local`, then set:

```dotenv
MONGODB_URI=mongodb+srv://...
MONGODB_DB=siamgroundwater
CMS_SESSION_SECRET=...
CMS_COOKIE_SECURE=false
CRON_SECRET=replace-with-a-random-secret-at-least-24-characters
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_ROOT_FOLDER=siamgroundwater/cms
CLOUDINARY_MAX_FILE_SIZE_MB=4
```

Use `CMS_COOKIE_SECURE=false` only for local HTTP development. Use `true` in production.

Cloudinary credentials are server-only. CMS project, service, and learning editors can upload JPG, PNG, WebP, GIF, or AVIF files into isolated folders below `siamgroundwater/cms`. The API checks the authenticated role, request origin, declared MIME type, file signature, and configured file-size limit. Project images are compressed on the client, uploaded during Save or Publish, and registered as staged assets. Failed saves roll them back; the guarded cleanup job removes expired, unreferenced staged assets.

Keep server-routed uploads at 4 MB or below when deploying to a serverless host with a request-body limit. Larger original-media workflows should use short-lived signed direct uploads rather than raising only the application setting.

Generate a session secret in PowerShell without placing it in command history:

```powershell
$secretBytes = New-Object byte[] 48
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
$generator.GetBytes($secretBytes)
[Convert]::ToBase64String($secretBytes)
$generator.Dispose()
```

Store the generated result only in `.env.local` and the deployment environment settings.

Use a dedicated database for each environment, for example `siamgroundwater_dev`, `siamgroundwater_preview`, and `siamgroundwater`. Do not point local development at the production database.

## 2. Seed the first administrator

Set `CMS_SEED_USERNAME` and `CMS_SEED_DISPLAY_NAME` in `.env.local`. Then seed the password temporarily from PowerShell:

```powershell
$seedPassword = Read-Host 'CMS administrator password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seedPassword)
try {
  $env:CMS_SEED_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run seed:cms-admin
} finally {
  Remove-Item Env:CMS_SEED_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
```

Passwords must contain 12 to 256 characters. The seed script is idempotent: running it again updates the matching administrator account.

## 3. Start and import the current website snapshot

```powershell
npm run dev
```

Open `http://localhost:3000/cms`, sign in, and use **Import public snapshot** on the dashboard. The import:

- keeps the existing MongoDB project library and adds service and learning records;
- refreshes records that still have the `public-snapshot` source;
- skips any record already edited in CMS;
- never writes to the current static frontend data files.

## Roles

| Role | Access |
| --- | --- |
| Administrator | Full content, user, import, removal, and audit access |
| Content editor | View, create, and update projects, services, and learning records |
| Viewer | Read-only dashboard and content access |

The API prevents a user from removing their own administrator access and prevents removal or deactivation of the final active administrator.

## Production checklist

1. Use a production MongoDB project with network restrictions and a least-privilege application user.
2. Set a unique production `CMS_SESSION_SECRET` and `CMS_COOKIE_SECURE=true`.
3. Configure MongoDB Atlas backups or point-in-time recovery. Audit logs and published revisions are not backups.
4. Enable Cloudinary backup/versioning appropriate for the account and keep CMS deletion permissions separate from backup administration.
5. Keep `.env.local` and `atlas-credentials.env` uncommitted. Only `.env.example` belongs in source control.
6. Run `npm run check` before deployment.
7. Verify `/cms/login`, role restrictions, an image upload, a content edit, and their audit entries in the production environment.

## Credential rotation

If a MongoDB password or Cloudinary API secret has been pasted into chat, logs, or another shared channel, treat it as exposed. After verifying this setup, rotate it in MongoDB Atlas or Cloudinary, update `.env.local` and the deployment environment, restart the application, and re-run the connection checks. Never commit either credential file.

## Project publishing workflow

1. **Save draft** stores edits separately from the currently published project.
2. **Preview draft** opens a private, authenticated preview.
3. **Publish** requires Thai content plus English title, location, and summary. It preserves the previous published version and updates public pages immediately.
4. **Unpublish** removes the project from the public site but retains it as a CMS draft.
5. **Restore and publish** republishes a prior preserved version and records the action.

Project pages use MongoDB ObjectIds. Older numeric project URLs redirect to the corresponding ObjectId URL while the legacy mapping remains in MongoDB. Services and learning records remain separate from the public content modules for now.

## Scheduled cleanup and monitoring

- Set `CRON_SECRET` only in Vercel Production environment variables. Vercel Cron automatically sends it as a bearer token when invoking the guarded cleanup endpoint. `vercel.json` runs cleanup daily at 02:23 UTC (09:23 Asia/Bangkok), which is compatible with both Hobby and paid Vercel plans. GitHub does not need this secret.
- Until the main domain points to Vercel with a trusted certificate, monitoring defaults to `https://siamgroundwater.vercel.app`; set the optional GitHub Actions repository variable `MONITOR_BASE_URL` when the production origin changes.
- Monitor `GET /api/health` externally.
- Run `npm run monitor:production` for a production HTTP smoke check.

The quality workflow intentionally sets `SGW_CI_SKIP_DATABASE=true` so pull-request builds can validate the complete Next.js application without receiving production MongoDB credentials. This bypass is accepted only when GitHub Actions also provides `CI=true`; regular local and Vercel builds still require MongoDB.

## End-to-end checks

After `npm run build` and `npm run start -- --port 3003`, run `npm run test:e2e`.

`npm run test:e2e:cms` must run only against an isolated database whose name includes `dev`, `test`, `preview`, or `staging`. The runner creates a temporary administrator and project, verifies draft isolation, bilingual publishing, legacy redirects, unpublishing, revision restore, exercises API archival, and then removes all temporary users, projects, revisions, and related test audit entries. Set `E2E_BASE_URL` when the test server is not running on port 3003.

`npm run test:e2e:orphan-media` creates one isolated Cloudinary test image and expired staging record, runs the authenticated cleanup endpoint, verifies both are removed, and repeats cleanup in `finally`. It also refuses production-named databases.
