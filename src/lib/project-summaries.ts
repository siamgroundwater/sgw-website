import type { Project } from './projects'
import type { ProjectCategory } from './project-categories'
import type { LocalizedLocale } from '../i18n/config.ts'
import { localizeProjectWorkTypes } from './project-work-types.ts'

export type ProjectSummary = {
  _id: string
  title: string
  year: number | null
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
      }
  return {
    _id: localized._id,
    category: localized.category,
    coverImage: localized.coverImage,
    lat: localized.lat,
    lng: localized.lng,
    location: localized.location,
    title: localized.title,
    workTypes: localizeProjectWorkTypes(project.workTypes, locale),
    year: localized.year,
  }
}
