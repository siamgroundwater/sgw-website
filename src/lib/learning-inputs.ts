export type NumericRules = { min?: number; max?: number; integer?: boolean }
export type NumericValidationError = 'required' | 'number' | 'min' | 'max' | 'integer'
export type NumericValidation = { value: number | null; error: NumericValidationError | null }
type InputLocale = 'th' | 'en' | 'zh' | 'ja'

/** Validate the draft without changing the text the person entered. */
export function validateNumericDraft(raw: string, rules: NumericRules = {}): NumericValidation {
  const draft = raw.trim()
  if (!draft) return { value: null, error: 'required' }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(draft)) return { value: null, error: 'number' }
  const value = Number(draft)
  if (!Number.isFinite(value)) return { value: null, error: 'number' }
  if (rules.min !== undefined && value < rules.min) return { value: null, error: 'min' }
  if (rules.max !== undefined && value > rules.max) return { value: null, error: 'max' }
  if (rules.integer && !Number.isInteger(value)) return { value: null, error: 'integer' }
  return { value, error: null }
}

export function numericValidationMessage(locale: InputLocale, error: NumericValidationError | null, rules: NumericRules = {}): string {
  if (!error) return ''
  const messages = {
    th: { required: 'กรุณากรอกตัวเลขในช่องนี้', number: 'กรุณากรอกตัวเลขให้ครบ ใช้จุดสำหรับทศนิยม เช่น 12.5', min: `กรุณากรอกค่าอย่างน้อย ${rules.min}`, max: `กรุณากรอกค่าไม่เกิน ${rules.max}`, integer: 'กรุณากรอกจำนวนเต็ม' },
    en: { required: 'Enter a value in this field.', number: 'Enter a complete number; use a decimal point, for example 12.5.', min: `Enter a value of at least ${rules.min}.`, max: `Enter a value no greater than ${rules.max}.`, integer: 'Enter a whole number.' },
    zh: { required: '请填写此项数值。', number: '请输入完整数字；小数请使用点，例如12.5。', min: `请输入不小于${rules.min}的数值。`, max: `请输入不大于${rules.max}的数值。`, integer: '请输入整数。' },
    ja: { required: 'この項目に数値を入力してください。', number: '数値を最後まで入力してください。小数点は「.」を使います（例：12.5）。', min: `${rules.min}以上の値を入力してください。`, max: `${rules.max}以下の値を入力してください。`, integer: '整数を入力してください。' },
  }
  return messages[locale][error]
}

export type LearningReport = {
  title: string
  status: string
  inputsHeading: string
  inputs: Array<{ label: string; value: string; unit?: string }>
  resultsHeading: string
  results: string
  assumptionsHeading: string
  assumptions: string
  limitationsHeading: string
  limitations: string
  sourceHeading: string
  pageUrl: string
}

export function buildLearningReport(report: LearningReport): string {
  const pageUrl = new URL(report.pageUrl)
  const source = `${pageUrl.origin}${pageUrl.pathname}`
  return [report.title, report.status, '', report.inputsHeading,
    ...report.inputs.map(({ label, value, unit }) => `${label}: ${value}${unit ? ` ${unit}` : ''}`),
    '', report.resultsHeading, report.results, '', report.assumptionsHeading, report.assumptions,
    '', report.limitationsHeading, report.limitations, '', `${report.sourceHeading}: ${source}`].join('\n')
}
