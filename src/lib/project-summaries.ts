import type { Project } from './projects'
import type { ProjectCategory } from './project-categories'
import type { LocalizedLocale } from '../i18n/config.ts'

export type ProjectSummary = {
  _id: string
  title: string
  year: number | null
  projectType: string
  projectTypeLabel: string
  lat: number | null
  lng: number | null
  location: string
  workTypes: string[]
  coverImage: string
  category: ProjectCategory[]
}

export function toProjectSummary(project: Project, locale: LocalizedLocale = 'th'): ProjectSummary {
  const english = project.translations?.en
  const localized = locale === 'th' || !english
    ? project
    : {
        ...project,
        location: english.location || project.location,
        title: english.title || project.title,
        workTypes: english.workTypes.length ? english.workTypes : project.workTypes,
      }
  return {
    _id: localized._id,
    category: localized.category,
    coverImage: localized.coverImage,
    lat: localized.lat,
    lng: localized.lng,
    location: localized.location,
    projectType: localized.projectType,
    projectTypeLabel: localized.projectTypeLabel,
    title: localized.title,
    workTypes: localized.workTypes,
    year: localized.year,
  }
}
