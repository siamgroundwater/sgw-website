import {
  type ProjectCategory,
} from './project-categories'

export type { ProjectCategory }

export type ProjectTranslation = {
  details: string[]
  location: string
  summary: string
  title: string
}

export type Project = {
  _id: string
  slug: string
  title: string
  translations: { en: ProjectTranslation }
  year: number | null
  lat: number | null
  lng: number | null
  location: string
  workTypes: string[]
  coverImage: string
  galleryImages: string[]
  summary: string
  details: string[]
  category: ProjectCategory[]
}

export function getProjectMapUrl(project: Project) {
  if (project.lat === null || project.lng === null) return null
  const query = encodeURIComponent(`${project.lat},${project.lng}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
