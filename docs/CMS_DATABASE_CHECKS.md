# CMS database compatibility checks

Run `npm run check:cms:database` before deploying model/index changes, after a database migration, and against an isolated restore before considering production recovery.

The command uses `MONGODB_URI` and `MONGODB_DB` from the environment, with `.env.local` as fallback. It is read-only: it reports collection/index names and counts, never stored content, passwords, image URLs, or secrets. It creates no GitHub workflow or scheduled task.

It checks the same index definitions used by the application in `src/server/db/cms-indexes.ts`, including uniqueness, compound-key order, partial filters, text-search options and TTL retention. It also counts missing required indexed identities. Collections that have never been initialized are reported separately; normal CMS operations initialize them when needed.

- `ok`: the existing collection matches the current contract.
- `needs-review`: an index is missing, has different options, introduces unexpected uniqueness/TTL, or indexes records with missing required identities. Inspect before changing anything. The command exits unsuccessfully to make this visible.
- `not-initialized`: no collection exists yet; this is not automatically a fault.

If no known CMS collections exist at all, the command fails rather than reporting an empty or accidentally selected database as healthy.

Do not delete arbitrary indexes to make a check pass. Confirm the current model, protect its uniqueness rules, and test a narrowly scoped migration first. Restore drills intentionally omit TTL to preserve recovery evidence, so they may report TTL mismatches; do not enable deletion policies on a recovery archive without reviewing it.

The confirmed retired `cmsStagedProjectMedia.publicId_1` index is repaired by `ensureCmsStagedMediaIndexes`. The repair establishes current `asset.publicId` uniqueness first, removes only the exact obsolete index, and tolerates another server instance having removed it already. It never deletes content or images. Both content initialization and staged-upload initialization use this repair.

## Regression checks

- `npm test`: offline contracts, malformed JSON handling, upload ownership, save/replay and rollback tests.
- `npm run test:e2e:cms -- --grep="all CMS JSON|simultaneous|viewers can read"`: isolated API/concurrency tests with no Cloudinary writes.
- `npm run test:e2e:cms:media`: isolated real-provider uploads, including three About images in one Save and an obsolete-index upgrade fixture. Cleans up its exact temporary images/database.

Optional real-database index tests (PowerShell):

```powershell
$env:CMS_TEST_STAGED_INDEXES = 'true'
node --env-file=.env.local --experimental-strip-types --test tests/cms-index-contracts.test.mjs tests/cms-staged-media-indexes.test.mjs
Remove-Item Env:CMS_TEST_STAGED_INDEXES
```

These tests allocate fresh `sgw_test_*` databases and remove only those databases. They do not write to the configured application database. Run CMS server suites sequentially because they share a test build directory.
