import assert from 'node:assert/strict'
import test from 'node:test'
import { createMediaReferenceMatcher, classifyMedia } from '../scripts/review-cms-media.mjs'

const asset = {
  publicId: 'sgw/cms/projects/photo',
  secureUrl: 'https://res.cloudinary.com/example/image/upload/v1/sgw/cms/projects/photo.webp',
}

test('read-only inventory finds historical, transformed, and metadata-key references', () => {
  const matcher = createMediaReferenceMatcher([asset], 'example')
  const documents = [
    { draft: { galleryImages: [asset.secureUrl] } },
    { content: { coverImage: 'https://res.cloudinary.com/example/image/upload/c_fill,w_500/v4/sgw/cms/projects/photo.jpg' } },
    { mediaMetadata: { [asset.secureUrl]: { alt: 'Equipment' } } },
    { asset: { publicId: asset.publicId } },
  ]
  for (const document of documents) assert.deepEqual([...matcher(document)], [asset.publicId])
  assert.deepEqual([...matcher({ coverImage: 'https://res.cloudinary.com/different/image/upload/v1/sgw/cms/projects/photo.webp' })], [])
})

test('an old but newly unreferenced asset still waits the full observation period', () => {
  const now = new Date('2026-09-12T00:00:00Z')
  const rows = classifyMedia([{ ...asset, createdAt: '2020-01-01T00:00:00Z' }], new Map(), [], now)
  assert.equal(rows[0].status, 'retention-pending')
  assert.equal(rows[0].unreferencedSince, now.toISOString())
})

test('a retained unreferenced asset becomes only a manual review candidate', () => {
  const rows = classifyMedia([asset], new Map(), [{ ...asset, unreferencedSince: '2026-08-01T00:00:00Z' }], new Date('2026-09-12T00:00:00Z'))
  assert.equal(rows[0].status, 'manual-review-candidate')
})

test('a restored reference resets the unreferenced observation period', () => {
  const references = new Map([[asset.publicId, new Set(['cmsProjectRevisions:version1'])]])
  const referenced = classifyMedia([asset], references, [{ ...asset, unreferencedSince: '2026-08-01T00:00:00Z' }], new Date('2026-09-12T00:00:00Z'))
  assert.equal(referenced[0].status, 'referenced')
  assert.equal(referenced[0].unreferencedSince, null)
  const removedAgain = classifyMedia([asset], new Map(), referenced, new Date('2026-09-13T00:00:00Z'))
  assert.equal(removedAgain[0].status, 'retention-pending')
  assert.equal(removedAgain[0].unreferencedSince, '2026-09-13T00:00:00.000Z')
})
