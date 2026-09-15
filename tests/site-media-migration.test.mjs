import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertApplyConfirmations,
  assertDeletionConfirmed,
  buildSourcePlans,
  classifySections,
  documentMatchesImages,
  findReferencedPublicIds,
  normalizeRootFolder,
  parseMigrationArguments,
  validateManagedDocument,
  validateReusablePlan,
} from '../scripts/lib/site-media-migration.mjs'

const definitions = {
  'project-map': {
    fallbacks: ['/images/map.jpg'],
    maximum: 1,
    minimum: 1,
  },
}
const configuration = {
  cloudName: 'example-cloud',
  databaseName: 'siamgroundwater_dev',
  databaseWasExplicit: true,
  rootFolder: 'siamgroundwater/cms',
}

function planned(contents = 'first map bytes') {
  return buildSourcePlans(
    definitions,
    configuration.rootFolder,
    new Map([['/images/map.jpg', Buffer.from(contents)]])
  ).get('/images/map.jpg')
}

function providerFor(plan = planned()) {
  const src = `https://res.cloudinary.com/${configuration.cloudName}/image/upload/v1/${plan.publicId}.jpg`
  return {
    asset: {
      bytes: 1200,
      createdAt: '2026-09-14T00:00:00.000Z',
      format: 'jpg',
      height: 2400,
      publicId: plan.publicId,
      src,
      width: 1800,
    },
    migrationSha256: plan.contentSha256,
    publicId: plan.publicId,
    src,
  }
}

function documentFor(provider = providerFor()) {
  return {
    _id: 'project-map',
    createdAt: new Date('2026-09-14T00:00:00.000Z'),
    images: [{ asset: provider.asset, src: provider.src }],
    updatedAt: new Date('2026-09-14T01:00:00.000Z'),
    updatedBy: 'migration-test',
  }
}

test('apply requires exact database, Cloudinary, root, and backup confirmations', () => {
  const dryRun = parseMigrationArguments([])
  assert.equal(dryRun.apply, false)
  assert.doesNotThrow(() => assertApplyConfirmations(dryRun, {
    ...configuration,
    databaseWasExplicit: false,
  }))

  const apply = parseMigrationArguments([
    '--apply',
    '--backup=.cms-backups/before.sgwbackup',
    '--confirm-database=siamgroundwater_dev',
    '--confirm-cloud=example-cloud',
    '--confirm-root=siamgroundwater/cms',
  ])
  assert.doesNotThrow(() => assertApplyConfirmations(apply, configuration))
  assert.throws(
    () => assertApplyConfirmations({ ...apply, confirmDatabase: 'production' }, configuration),
    /confirm-database=siamgroundwater_dev/
  )
  assert.throws(
    () => assertApplyConfirmations(apply, { ...configuration, databaseWasExplicit: false }),
    /explicit MONGODB_DB/
  )
  assert.throws(() => parseMigrationArguments(['--apply', '--unsafe']), /Usage:/)
  assert.equal(normalizeRootFolder('/siamgroundwater/cms/'), 'siamgroundwater/cms')
  assert.throws(() => normalizeRootFolder('../cms'), /safe Cloudinary root folder/)
})

test('content-addressed public IDs are stable and change when source bytes change', () => {
  const first = planned('same bytes')
  const again = planned('same bytes')
  const changed = planned('changed bytes')
  assert.deepEqual(first, again)
  assert.notEqual(first.publicId, changed.publicId)
  assert.match(first.publicId, /^siamgroundwater\/cms\/site\/imported\/project-map\/map-/)
  assert.equal(first.contentSha256.length, 64)
})

test('preflight classifies missing and exact fallbacks, accepts valid managed data, and blocks malformed data', () => {
  const plan = planned()
  const provider = providerFor(plan)
  const providerAssets = new Map([[plan.publicId, provider]])

  assert.deepEqual(
    classifySections(definitions, new Map(), configuration, providerAssets).needsMigration,
    ['project-map']
  )
  assert.deepEqual(
    classifySections(definitions, new Map([['project-map', {
      _id: 'project-map',
      images: [{ src: '/images/map.jpg' }],
    }]]), configuration, providerAssets).needsMigration,
    ['project-map']
  )

  const valid = documentFor(provider)
  const accepted = classifySections(
    definitions,
    new Map([['project-map', valid]]),
    configuration,
    providerAssets
  )
  assert.deepEqual(accepted.alreadyValid, ['project-map'])
  assert.deepEqual(accepted.blocking, [])

  const malformed = { ...valid, images: [{ src: provider.src }] }
  const blocked = classifySections(
    definitions,
    new Map([['project-map', malformed]]),
    configuration,
    providerAssets
  )
  assert.equal(blocked.blocking.length, 1)
  assert.match(blocked.blocking[0].errors.join(' '), /no Cloudinary asset metadata/)
})

test('post-check validates the runtime record and live provider metadata', () => {
  const plan = planned()
  const provider = providerFor(plan)
  const document = documentFor(provider)
  const providerAssets = new Map([[plan.publicId, provider]])
  assert.deepEqual(
    validateManagedDocument(
      'project-map',
      document,
      definitions['project-map'],
      configuration,
      providerAssets
    ),
    []
  )

  const missingProvider = validateManagedDocument(
    'project-map',
    document,
    definitions['project-map'],
    configuration,
    new Map()
  )
  assert.match(missingProvider.join(' '), /missing from Cloudinary/)

  const mismatched = documentFor(provider)
  mismatched.images[0].asset = { ...mismatched.images[0].asset, width: 999 }
  assert.match(
    validateManagedDocument(
      'project-map',
      mismatched,
      definitions['project-map'],
      configuration,
      providerAssets
    ).join(' '),
    /width does not match Cloudinary/
  )
})

test('reused deterministic assets require the exact stored source hash', () => {
  const plan = planned()
  const provider = providerFor(plan)
  assert.deepEqual(validateReusablePlan(plan, provider, configuration), [])
  assert.match(
    validateReusablePlan(plan, { ...provider, migrationSha256: 'wrong' }, configuration).join(' '),
    /expected source-content hash/
  )
})

test('unknown-write reconciliation compares the complete ordered image identity', () => {
  const provider = providerFor()
  const images = [{ asset: provider.asset, src: provider.src }]
  assert.equal(documentMatchesImages(documentFor(provider), images), true)
  assert.equal(documentMatchesImages(documentFor(provider), [
    { asset: { ...provider.asset, publicId: `${provider.publicId}-other` }, src: provider.src },
  ]), false)
})

test('rollback requires provider confirmation and reference matching protects exact and transformed URLs', () => {
  const provider = providerFor()
  assert.deepEqual(
    assertDeletionConfirmed([provider.publicId], { deleted: { [provider.publicId]: 'deleted' } }),
    [provider.publicId]
  )
  assert.throws(
    () => assertDeletionConfirmed([provider.publicId], { deleted: { [provider.publicId]: 'error' } }),
    /did not confirm deletion/
  )

  const transformed = provider.src.replace('/upload/', '/upload/w_800,q_auto/')
  const found = findReferencedPublicIds(
    { original: provider.src, transformed },
    [{ publicId: provider.publicId, src: provider.src }],
    configuration.cloudName
  )
  assert.deepEqual(found, new Set([provider.publicId]))
})
