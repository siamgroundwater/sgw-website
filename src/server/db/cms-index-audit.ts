import type { IndexDescription, IndexDescriptionInfo } from 'mongodb'
import { cmsIndexDefinitions, type CmsCollectionKey } from './cms-indexes.ts'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

function signature(index: IndexDescription | IndexDescriptionInfo) {
  const fields = Object.entries(index.key)
  const text = fields.some(([, direction]) => direction === 'text')
  // MongoDB reports text indexes as _fts/_ftsx plus weights, not authored keys.
  const key = text ? {
    text: index.weights || Object.fromEntries(fields.filter(([, direction]) => direction === 'text').map(([field]) => [field, 1])),
    ordered: fields.filter(([field, direction]) => direction !== 'text' && field !== '_ftsx'),
  } : fields
  return JSON.stringify(canonical({
    key, unique: Boolean(index.unique), sparse: Boolean(index.sparse),
    partial: index.partialFilterExpression || null,
    ttl: index.expireAfterSeconds ?? null,
    collation: index.collation?.locale === 'simple' ? null : index.collation || null,
    hidden: Boolean(index.hidden),
    ...(text ? { defaultLanguage: index.default_language || 'english', languageOverride: index.language_override || 'language' } : {}),
  }))
}

export function auditCmsIndexes(kind: CmsCollectionKey, actual: IndexDescriptionInfo[]) {
  const expected = cmsIndexDefinitions[kind]
  const issues: { index: string; issue: string }[] = []
  for (const definition of expected) {
    const stored = actual.find(({ name }) => name === definition.name)
    if (!stored) issues.push({ index: definition.name!, issue: 'missing-current-index' })
    else if (signature(stored) !== signature(definition)) issues.push({ index: definition.name!, issue: 'index-definition-mismatch' })
  }
  for (const index of actual) {
    if (index.name === '_id_' || expected.some(({ name }) => name === index.name)) continue
    if (index.unique || index.expireAfterSeconds !== undefined) {
      issues.push({ index: index.name || '(unnamed)', issue: 'unexpected-unique-or-ttl-index' })
    }
  }
  return issues
}
