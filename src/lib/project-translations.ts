export type NormalizedProjectTranslation = {
  details: string[]
  location: string
  summary: string
  title: string
}

function translationRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function translationText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeProjectTranslation(value: unknown): NormalizedProjectTranslation {
  const translation = translationRecord(value)
  const details = Array.isArray(translation?.details)
    ? translation.details
        .filter((detail): detail is string => typeof detail === 'string')
        .map((detail) => detail.trim())
        .filter(Boolean)
    : []

  return {
    details,
    location: translationText(translation?.location),
    summary: translationText(translation?.summary),
    title: translationText(translation?.title),
  }
}

export function hasProjectTranslationContent(translation: NormalizedProjectTranslation) {
  return Boolean(
    translation.title ||
    translation.location ||
    translation.summary ||
    translation.details.length
  )
}

export function projectDetailSections(summary: string, details: string[]) {
  const normalizedSummary = summary.trim()
  return details.filter((detail) => detail.trim() !== normalizedSummary)
}
