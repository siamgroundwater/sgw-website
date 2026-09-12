import type { Project } from './projects'
import type { ProjectCategory } from './project-categories'
import type { LocalizedLocale } from '../i18n/config.ts'
import { localizeProject } from '../i18n/projects.ts'

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
  const localized = localizeProject(project, locale)
  return {
    _id: localized._id,
    category: localized.category,
    coverImage: localized.coverImage,
    lat: localized.lat,
    lng: localized.lng,
    location: localized.location,
    title: localized.title,
    workTypes: localized.workTypes,
    year: localized.year,
  }
}
