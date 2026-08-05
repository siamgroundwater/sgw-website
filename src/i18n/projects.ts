import type { Project } from '@/lib/projects'
import type { LocalizedContent } from './localized-content'

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

export function getProjectCategoryKey(
  projectType: Project['projectType']
): ProjectCategoryKey {
  if (projectType === 'government') return 'government'
  if (projectType === 'factory') return 'factory'
  if (projectType === 'resort' || projectType === 'island, resort') return 'resort'
  if (projectType === 'agriculture') return 'agriculture'
  if (projectType === 'train' || projectType === 'infrastructure') {
    return 'dewatering'
  }
  return 'other'
}

export function getLocalizedProjectPresentation(
  project: Project,
  copy: LocalizedContent['projects']
) {
  const categoryKey = getProjectCategoryKey(project.projectType)
  return {
    categoryKey,
    categoryLabel: copy.categories[categoryKey],
    typeLabel: copy.types[project.projectType] ?? copy.types.other,
  }
}
