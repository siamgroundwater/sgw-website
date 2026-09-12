# CMS recovery runbook

## What is protected

`npm run backup:cms` reads the configured database and snapshots every non-system collection in a MongoDB transaction. It includes user password hashes, audit history, current projects, Trash and historical recovery records. It also downloads the bytes of referenced images from the configured Cloudinary cloud. It does not modify the source database or delete provider assets.

The archive is compressed and authenticated with AES-256-GCM. Backup creation immediately decrypts and verifies the result, including image SHA-256 checksums. Files go into ignored `.cms-backups/`.

If `CMS_BACKUP_KEY` is absent, the command creates `.cms-backups/recovery.key` once. Keep a secure offline copy **separate from the archive**. Losing the key means the archive cannot be recovered. Do not email or commit the key, archive, credentials or database exports. The local key and archive together are convenient for a drill, but do not provide protection against loss of this machine.

## Backup and verify

Pause content changes during the backup/migration window, then run:

```powershell
npm run backup:cms
npm run backup:cms:verify -- --file=.cms-backups/<archive>.sgwbackup
```

Large archives use memory while encrypting. The tool stops above 25 MB per image or 512 MB of referenced image bytes. Use provider-native exports/backups for larger datasets; never treat a failed command as a complete backup.

## Isolated restore drill

```powershell
npm run restore:cms -- --file=.cms-backups/<archive>.sgwbackup --database=sgw_restore_<unique-name>
```

The tool refuses the configured/source database and any target that already has collections. It restores into a **new** `sgw_restore_*` database, recreates indexes, compares every restored document with the archive, and checks all archived image bytes. TTL deletion is deliberately not activated in a drill so older audit evidence does not expire during verification. Original TTL definitions remain in the encrypted archive.

This does not switch the website, overwrite production, re-upload images, or remove the source data. A failed drill can leave a partial isolated database; use another new target on retry and remove only the exact drill databases after inspecting the result.

## Real incident recovery

1. Stop editor writes and disable scheduled cleanup temporarily.
2. Preserve the damaged state for diagnosis and select a verified archive.
3. Restore into a new isolated database. Never restore over production by default.
4. Validate records, users, image availability, Thai/optional-language display and public URLs in a private preview.
5. If Cloudinary assets are missing, recover/re-upload from provider backup or the encrypted archive's image bytes into a new recovery namespace. Remap URLs only in the isolated database and validate every reference before switching. The drill tool does not automate this provider cutover.
6. Explicitly approve the new database/media environment settings, rotate session credentials, and deploy/cut over.
7. Restore the intended TTL indexes, run health and smoke checks, then re-enable writes and cleanup.

## Independent boundaries

The CMS archive is not a backup of source code, local public assets, deployment settings, environment secrets, DNS, unreferenced Cloudinary files, or the Cloudinary account itself. Keep source/configuration under your normal private repository/backup process; store environment secrets in a password manager. Configure Atlas and Cloudinary provider backup policies separately, according to the account plan. Those hosted settings and an off-device backup destination have not been changed by this implementation.

Recommended operation: take a backup before migrations, keep regular encrypted off-device copies, and repeat an isolated restore drill after significant model/storage changes. A schedule is not proof of recovery: record the last verified restore outcome.

## Verified development drill — 2026-09-12

- Source: `siamgroundwater_dev`, not production.
- Archive: `.cms-backups/cms-2026-09-12T04-05-41-147Z.sgwbackup`.
- Seven collections; 79 current projects; 79 historical revisions; 675 referenced images.
- AES authentication, image checksums, and all restored document comparisons passed in `sgw_restore_20260912_cms_drill_v2`.
- The initial partial drill exposed a text-index restoration issue; the restore tool was corrected before the successful second drill.
- Single-Save migration subsequently removed obsolete publication fields from the 79 projects. A second dry run reported zero remaining changes.
- Both exact drill databases were removed after verification. The encrypted archive and its key were retained locally; no source collections were removed.
