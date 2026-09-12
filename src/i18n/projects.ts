import type { Project } from '../lib/projects.ts'
import { localizeProjectWorkTypes } from '../lib/project-work-types.ts'
import { normalizeProjectTranslation } from '../lib/project-translations.ts'
import type { LocalizedLocale } from './config.ts'
import type { LocalizedContent } from './localized-content.ts'

export type ProjectCategoryKey =
  | 'government'
  | 'factory'
  | 'resort'
  | 'agriculture'
  | 'dewatering'
  | 'other'

export const PROJECT_CATEGORY_KEYS: ProjectCategoryKey[] = [
  'government',
  'factory',
  'resort',
  'agriculture',
  'dewatering',
  'other',
]

export function getProjectCategoryKeys(
  categories: Project['category']
): ProjectCategoryKey[] {
  const keys: ProjectCategoryKey[] = []
  if (categories.includes('ภาครัฐ')) keys.push('government')
  if (categories.includes('โรงงาน')) keys.push('factory')
  if (categories.includes('โรงแรม รีสอร์ต')) keys.push('resort')
  if (categories.includes('เกษตรกรรม ปศุสัตว์')) keys.push('agriculture')
  if (categories.includes('Dewatering')) keys.push('dewatering')
  if (categories.includes('อื่นๆ') || !keys.length) keys.push('other')
  return keys
}

export function getProjectCategoryKey(categories: Project['category']): ProjectCategoryKey {
  return getProjectCategoryKeys(categories)[0]
}

export function getLocalizedProjectPresentation(
  project: Pick<Project, 'category'>,
  copy: LocalizedContent['projects']
) {
  const categoryKeys = getProjectCategoryKeys(project.category)
  const categoryKey = categoryKeys[0]
  const categoryLabels = categoryKeys.map((key) => copy.categories[key])
  const typeLabels = [...new Set(categoryKeys.map((key) => {
    const typeKey = key === 'dewatering' ? 'infrastructure' : key
    return copy.types[typeKey]
  }))]
  return {
    categoryKey,
    categoryKeys,
    categoryLabel: categoryLabels.join(' • '),
    categoryLabels,
    typeLabel: typeLabels.join(' • '),
    typeLabels,
  }
}

export function localizeProject(project: Project, locale: LocalizedLocale): Project {
  if (locale === 'th') {
    return {
      ...project,
      workTypes: localizeProjectWorkTypes(project.workTypes, locale),
    }
  }

  const selected = normalizeProjectTranslation(project.translations[locale])
  const english = normalizeProjectTranslation(project.translations.en)
  return {
    ...project,
    details: selected.details.length
      ? selected.details
      : english.details.length
        ? english.details
        : project.details,
    location: selected.location || english.location || project.location,
    summary: selected.summary || english.summary || project.summary,
    title: selected.title || english.title || project.title,
    workTypes: localizeProjectWorkTypes(project.workTypes, locale),
  }
}
