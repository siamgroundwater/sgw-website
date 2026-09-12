import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLearningReport, numericValidationMessage, validateNumericDraft } from '../src/lib/learning-inputs.ts'
import { calculateGroundwaterPlan } from '../src/lib/groundwater-calculator.ts'

test('numeric drafts distinguish missing and incomplete data from valid zero and decimals', () => {
  for (const raw of ['', '   ']) assert.deepEqual(validateNumericDraft(raw, { min: 0 }), { value: null, error: 'required' })
  for (const raw of ['-', '.', '+', '-.', '1..2', '1,200', 'Infinity', '12abc', '1e3']) assert.deepEqual(validateNumericDraft(raw), { value: null, error: 'number' })
  assert.deepEqual(validateNumericDraft('0', { min: 0 }), { value: 0, error: null })
  assert.deepEqual(validateNumericDraft('.5'), { value: 0.5, error: null })
  assert.deepEqual(validateNumericDraft('12.'), { value: 12, error: null })
  assert.deepEqual(validateNumericDraft('0012.50'), { value: 12.5, error: null })
})

test('limits reject the original draft without substituting a boundary value', () => {
  assert.deepEqual(validateNumericDraft('25', { min: 1, max: 24 }), { value: null, error: 'max' })
  assert.deepEqual(validateNumericDraft('0', { min: 1, max: 24 }), { value: null, error: 'min' })
  assert.deepEqual(validateNumericDraft('-1', { min: 0 }), { value: null, error: 'min' })
  assert.deepEqual(validateNumericDraft('1.5', { integer: true }), { value: null, error: 'integer' })
  assert.deepEqual(validateNumericDraft('9'.repeat(400)), { value: null, error: 'number' })
  assert.deepEqual(validateNumericDraft('24', { min: 1, max: 24 }), { value: 24, error: null })
})

test('every validation case has a localized actionable message', () => {
  for (const locale of ['th', 'en', 'zh', 'ja']) {
    assert.equal(numericValidationMessage(locale, null), '')
    for (const error of ['required', 'number', 'min', 'max', 'integer']) {
      const message = numericValidationMessage(locale, error, { min: 1, max: 24 })
      assert.ok(message.length > 5)
      assert.ok(!message.includes('undefined'))
      if (error === 'min') assert.ok(message.includes('1'))
      if (error === 'max') assert.ok(message.includes('24'))
    }
  }
})

test('valid decimal drafts reach the existing engineering formula unchanged', () => {
  const dailyDemand = validateNumericDraft('100.50', { min: 0 }).value
  const pumpHours = validateNumericDraft('16.5', { min: 1, max: 24 }).value
  const reservePercent = validateNumericDraft('12.5', { min: 0, max: 100 }).value
  const result = calculateGroundwaterPlan({ dailyDemand, pumpHours, reservePercent })
  assert.equal(result.requiredFlow, 100.5 * 1.125 / 16.5)
})

test('saved reports include context and raw inputs while removing URL private parts', () => {
  const report = buildLearningReport({
    title: 'Demand & pumping flow', status: 'Example values', inputsHeading: 'Calculation inputs',
    inputs: [{ label: 'Daily demand', value: '00100.50', unit: 'm³/day' }, { label: 'Phase', value: 'Three phase' }],
    resultsHeading: 'Preliminary results', results: 'Required flow: 7.5 m³/h', assumptionsHeading: 'Assumptions',
    assumptions: 'Buffer is 25%.', limitationsHeading: 'Limitations', limitations: 'Planning only.',
    sourceHeading: 'Source page', pageUrl: 'https://user:secret@example.com/en/learn/calculator?token=private#gw-tab-demand',
  })
  for (const content of ['Demand & pumping flow', 'Example values', 'Daily demand: 00100.50 m³/day', 'Phase: Three phase', 'Required flow: 7.5 m³/h', 'Buffer is 25%.', 'Planning only.', 'https://example.com/en/learn/calculator']) assert.ok(report.includes(content))
  for (const privateText of ['user:', 'secret', '?token=', 'private', '#gw-']) assert.ok(!report.includes(privateText))
})
