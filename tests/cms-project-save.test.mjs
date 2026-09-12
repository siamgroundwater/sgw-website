import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProjectForSave, validateProjectInput, CMS_PROJECT_MAX_GALLERY_IMAGES } from '../src/lib/cms-validation.ts'
import { cmsProjectReadPermission } from '../src/lib/cms-project-access.ts'
import { canCmsRole } from '../src/lib/cms-permissions.ts'

function project(overrides = {}) {
  return {
    category: ['government'], coverImage: 'https://res.cloudinary.com/example/image/upload/cover.webp',
    details: ['Project description'], galleryImages: [], lat: null, lng: null,
    location: 'Bangkok', slug: 'example-project', status: 'active', summary: 'Project summary',
    title: 'Example project', translations: { en: { title: '', location: '', summary: '', details: [] } },
    workTypes: ['groundwater-survey'], year: 2026, ...overrides,
  }
}

test('trash queries require administrative permission while active projects remain readable', () => {
  for (const role of ['viewer', 'editor']) {
    assert.equal(canCmsRole(role, cmsProjectReadPermission('trash')), false)
    assert.equal(canCmsRole(role, cmsProjectReadPermission('active')), true)
  }
  assert.equal(canCmsRole('admin', cmsProjectReadPermission('trash')), true)
})

test('project save has one live status and requires complete public content', () => {
  const result = validateProjectInput(project())
  assert.equal(result.errors, null)
  assert.equal(result.data.status, 'active')
  assert.equal(validateProjectForSave(result.data), null)
  assert.ok(validateProjectInput(project({ status: 'draft' })).errors.status)
  assert.ok(validateProjectInput(project({ status: 'archived' })).errors.status)
  assert.ok(validateProjectForSave({ ...result.data, coverImage: '' }).coverImage)
  assert.ok(validateProjectForSave({ ...result.data, summary: '' }).summary)
})

test('saving never silently truncates project or translation text', () => {
  const fullTitle = 'ก'.repeat(180)
  assert.equal(validateProjectInput(project({ title: fullTitle })).data.title, fullTitle)
  assert.ok(validateProjectInput(project({ title: `${fullTitle}ก` })).errors.title)
  assert.ok(validateProjectInput(project({ details: ['a'.repeat(6001)] })).errors.details)
  assert.ok(validateProjectInput(project({ details: Array.from({ length: 81 }, () => 'detail') })).errors.details)
  const translated = project({ translations: { en: { title: 'a'.repeat(181), location: '', summary: '', details: [] } } })
  assert.ok(validateProjectInput(translated).errors['translations.en.title'])
})

test('gallery limits reject overflow and preserve an existing full gallery', () => {
  const galleryImages = Array.from({ length: CMS_PROJECT_MAX_GALLERY_IMAGES }, (_, i) => `https://example.com/${i}.webp`)
  assert.deepEqual(validateProjectInput(project({ galleryImages })).data.galleryImages, galleryImages)
  assert.ok(validateProjectInput(project({ galleryImages: [...galleryImages, 'https://example.com/overflow.webp'] })).errors.galleryImages)
  assert.ok(validateProjectInput(project({ galleryImages: ['x'.repeat(1001)] })).errors.galleryImages)
})

test('invalid numeric text cannot silently erase project coordinates', () => {
  assert.ok(validateProjectInput(project({ lat: 'invalid', lng: 'invalid' })).errors.lat)
  assert.ok(validateProjectInput(project({ year: false })).errors.year)
  assert.equal(validateProjectInput(project({ lat: '13.75', lng: '100.5' })).data.lat, 13.75)
})

test('image descriptions follow referenced images and enforce lengths', () => {
  const input = project()
  input.mediaMetadata = {
    [input.coverImage]: { alt: ' Drilling equipment ', caption: ' Site visit ' },
    'https://example.com/removed.webp': { alt: 'Removed', caption: '' },
  }
  const saved = validateProjectInput(input)
  assert.deepEqual(saved.data.mediaMetadata, { [input.coverImage]: { alt: 'Drilling equipment', caption: 'Site visit' } })
  input.mediaMetadata[input.coverImage].alt = 'a'.repeat(301)
  assert.ok(validateProjectInput(input).errors.mediaMetadata)
})

test('translation review markers preserve only supported locale hashes', () => {
  const result = validateProjectInput(project({ translationSourceHash: { en: 'abc123', zh: 'v1_hash', other: 'ignored' } }))
  assert.deepEqual(result.data.translationSourceHash, { en: 'abc123', zh: 'v1_hash' })
  assert.ok(validateProjectInput(project({ translationSourceHash: { en: 'invalid hash' } })).errors.translationSourceHash)
})
