import type { Project } from '@/lib/projects'
import type { LocalizedLocale } from './config'
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
  if (
    projectType === 'train' ||
    projectType === 'infrastructure' ||
    projectType === 'dewatering'
  ) {
    return 'dewatering'
  }
  return 'other'
}

export function getLocalizedProjectPresentation(
  project: Pick<Project, 'projectType'>,
  copy: LocalizedContent['projects']
) {
  const categoryKey = getProjectCategoryKey(project.projectType)
  return {
    categoryKey,
    categoryLabel: copy.categories[categoryKey],
    typeLabel:
      copy.types[project.projectType] ??
      (categoryKey === 'dewatering'
        ? copy.types.infrastructure
        : copy.types.other),
  }
}

export function localizeProject(project: Project, locale: LocalizedLocale): Project {
  if (locale === 'th') return project
  const english = project.translations.en
  return {
    ...project,
    businessTypes: english.businessTypes.length ? english.businessTypes : project.businessTypes,
    details: english.details.length ? english.details : project.details,
    location: english.location || project.location,
    summary: english.summary || project.summary,
    title: english.title || project.title,
    workTypes: english.workTypes.length ? english.workTypes : project.workTypes,
  }
}
