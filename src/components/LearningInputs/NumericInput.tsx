'use client'

import { numericValidationMessage, validateNumericDraft, type NumericRules } from '@/lib/learning-inputs'
import type { LocalizedLocale } from '@/i18n/config'
import './NumericInput.css'

export type NumericInputProps = NumericRules & {
  id: string
  label: string
  value: string
  onChange: (raw: string) => void
  locale: LocalizedLocale
  unit?: string
  help?: string
  error?: string
  className?: string
}

export default function NumericInput({ id, label, value, onChange, locale, min, max, integer, unit, help, error, className = '' }: NumericInputProps) {
  const rules = { min, max, integer }
  const message = error || numericValidationMessage(locale, validateNumericDraft(value, rules).error, rules)
  const describedBy = [unit && `${id}-unit`, help && `${id}-help`, message && `${id}-error`].filter(Boolean).join(' ') || undefined
  return <div className={`learning-number-field ${className}`}>
    <label htmlFor={id}>{label}</label>
    <div className="learning-number-control">
      <input id={id} type="text" inputMode={integer ? 'numeric' : 'decimal'} value={value} onChange={(event) => onChange(event.currentTarget.value)} required aria-invalid={Boolean(message)} aria-describedby={describedBy} autoComplete="off" spellCheck={false} />
      {unit && <span id={`${id}-unit`}>{unit}</span>}
    </div>
    {help && <p className="learning-number-help" id={`${id}-help`}>{help}</p>}
    {message && <p className="learning-number-error" id={`${id}-error`}>{message}</p>}
  </div>
}
