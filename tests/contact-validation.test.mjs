import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidEmail,
  normalizeText,
  validateContactPayload,
} from '../src/lib/contact-validation.ts'

const validPayload = {
  subject: 'สำรวจน้ำบาดาล',
  name: 'ผู้ติดต่อ',
  company: 'บริษัทตัวอย่าง',
  phone: '0812345678',
  email: 'contact@example.com',
  details: 'ต้องการประเมินพื้นที่โครงการ',
  consent: 'accepted',
}

test('accepts and normalizes a complete contact payload', () => {
  const result = validateContactPayload({
    ...validPayload,
    subject: '  สำรวจน้ำบาดาล  ',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.data.subject, 'สำรวจน้ำบาดาล')
})

test('rejects missing consent and malformed email', () => {
  assert.equal(validateContactPayload({ ...validPayload, consent: '' }).ok, false)
  assert.equal(validateContactPayload({ ...validPayload, email: 'not-an-email' }).ok, false)
})

test('normalization enforces maximum lengths', () => {
  assert.equal(normalizeText('  abcdef  ', 3), 'abc')
  assert.equal(isValidEmail('team@siamgroundwater.com'), true)
  assert.equal(isValidEmail('team@'), false)
})
