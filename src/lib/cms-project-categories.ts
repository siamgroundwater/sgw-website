import { CMS_PROJECT_CATEGORIES, type CmsProjectCategory } from '@/types/cms'

export function normalizeCmsProjectCategories(value: unknown): CmsProjectCategory[] {
  const raw = Array.isArray(value) ? value : [value]
  return Array.from(new Set(raw.filter(
    (item): item is CmsProjectCategory => CMS_PROJECT_CATEGORIES.includes(item as CmsProjectCategory)
  )))
}
