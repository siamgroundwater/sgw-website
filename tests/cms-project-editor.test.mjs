import assert from 'node:assert/strict'
import test from 'node:test'
import { hasRecoverableProjectShape, moveProjectImage, orderedProjectImages, projectTemplate, reconnectProjectImageDescriptions, thaiProjectContentHash, translationCompletion } from '../src/lib/cms-project-editor.ts'

const thai = { title: 'โครงการ', location: 'เชียงใหม่', summary: 'รายละเอียด', details: ['ส่วนที่หนึ่ง'] }

test('translation review marker matches normalized saved Thai content', () => {
  assert.equal(thaiProjectContentHash(thai), thaiProjectContentHash({ ...thai, title: ' โครงการ ', details: ['ส่วนที่หนึ่ง', ' '] }))
  assert.notEqual(thaiProjectContentHash(thai), thaiProjectContentHash({ ...thai, summary: 'แก้ไขรายละเอียด' }))
  assert.notEqual(thaiProjectContentHash(thai), thaiProjectContentHash({ ...thai, details: ['ส่วนที่สอง', 'ส่วนที่หนึ่ง'] }))
})

test('optional translations report only populated fields', () => {
  assert.equal(translationCompletion({ title: '', location: ' ', summary: '', details: [''] }), 0)
  assert.equal(translationCompletion({ title: 'Title', location: '', summary: '', details: [' ', 'Details'] }), 2)
})

test('image reordering is immutable and never wraps at either end', () => {
  const images = ['a', 'b', 'c']
  assert.deepEqual(moveProjectImage(images, 1, -1), ['b', 'a', 'c'])
  assert.deepEqual(moveProjectImage(images, 1, 1), ['a', 'c', 'b'])
  assert.deepEqual(images, ['a', 'b', 'c'])
  assert.equal(moveProjectImage(images, 0, -1), images)
  assert.equal(moveProjectImage(images, 2, 1), images)
})

test('templates omit project identity and image data', () => {
  const template = projectTemplate({ id: 'one', name: 'Survey', category: ['government'], workTypes: ['groundwater-survey'], details: ['Details'], title: 'Do not copy', location: 'Do not copy', coverImage: '/image.jpg' })
  assert.deepEqual(Object.keys(template).sort(), ['category', 'details', 'id', 'name', 'workTypes'])
  assert.equal(projectTemplate({ id: 'bad', name: 'Bad', category: [], workTypes: [], details: [3] }), null)
})

test('saved and newly selected gallery images share one stable order', () => {
  assert.deepEqual(orderedProjectImages(['saved-a', 'saved-b'], ['pending-a'], ['pending-a', 'saved-b', 'saved-a']), ['pending-a', 'saved-b', 'saved-a'])
  assert.deepEqual(orderedProjectImages(['saved-a'], ['pending-b'], ['removed', 'saved-a', 'saved-a']), ['saved-a', 'pending-b'])
})

test('recovery allows unfinished text but rejects malformed arrays before rendering', () => {
  const incomplete = { title: '', slug: '', summary: '', location: '', coverImage: '', updatedAt: '', status: 'active', year: null, lat: null, lng: null, category: ['other'], workTypes: [], details: [''], galleryImages: [], translations: { en: { title: '', location: '', summary: '', details: [''] } } }
  assert.equal(hasRecoverableProjectShape(incomplete), true)
  assert.equal(hasRecoverableProjectShape({ ...incomplete, details: [7] }), false)
  assert.equal(hasRecoverableProjectShape({ ...incomplete, translations: { en: { details: [''] } } }), false)
  assert.equal(hasRecoverableProjectShape({ ...incomplete, lat: '12' }), false)
})

test('reselecting an original image reconnects its description and gallery order key', () => {
  const recovered = [{ id: 'old-gallery-id', name: 'original.jpg', originalBytes: 4200, kind: 'gallery', metadata: { alt: 'Borehole survey', caption: 'Survey team at work' } }, { id: 'old-cover-id', name: 'cover.jpg', originalBytes: 1600, kind: 'cover', metadata: { alt: 'Cover', caption: '' } }]
  const result = reconnectProjectImageDescriptions([{ id: 'new-gallery-id', originalName: 'original.jpg', originalBytes: 4200 }], recovered, 'gallery')
  assert.deepEqual(result.metadata['new-gallery-id'], recovered[0].metadata)
  assert.equal(result.restoredIds['old-gallery-id'], 'new-gallery-id')
  assert.deepEqual(result.remaining, [recovered[1]])
  assert.equal(recovered.length, 2)
  assert.equal(reconnectProjectImageDescriptions([{ id: 'wrong-file', originalName: 'original.jpg', originalBytes: 9999 }], recovered, 'gallery').remaining.length, 2)
})
