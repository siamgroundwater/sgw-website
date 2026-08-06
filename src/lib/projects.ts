import recoveredProjects from '@/data/wordpress-projects-recovered.json'
import { sortProjectsNewestFirst } from './project-sort'

export const PROJECT_CATEGORIES = [
  'ภาครัฐ',
  'โรงงาน',
  'โรงแรม รีสอร์ต',
  'เกษตรกรรม ปศุสัตว์',
  'Dewatering',
  'อื่นๆ',
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

export type Project = {
  _id: number
  legacyPostId: number
  slug: string
  title: string
  year: number | null
  projectType: string
  projectTypeLabel: string
  lat: number | null
  lng: number | null
  location: string
  workTypes: string[]
  businessTypes: string[]
  coverImage: string
  localCoverImage: string
  galleryImages: string[]
  localGalleryImages: string[]
  summary: string
  details: string[]
  legacyUrl: string
  category: ProjectCategory[]
}

type RecoveredProject = Omit<Project, 'projectTypeLabel' | 'category'>

const typePresentation: Record<
  string,
  { label: string; category: ProjectCategory }
> = {
  agriculture: {
    label: 'โครงการน้ำบาดาลเพื่อการเกษตร',
    category: 'เกษตรกรรม ปศุสัตว์',
  },
  factory: {
    label: 'โครงการน้ำบาดาลภาคอุตสาหกรรม',
    category: 'โรงงาน',
  },
  government: {
    label: 'โครงการน้ำบาดาลภาครัฐ',
    category: 'ภาครัฐ',
  },
  'island, resort': {
    label: 'โครงการน้ำบาดาลรีสอร์ตบนเกาะ',
    category: 'โรงแรม รีสอร์ต',
  },
  resort: {
    label: 'โครงการน้ำบาดาลโรงแรมและรีสอร์ต',
    category: 'โรงแรม รีสอร์ต',
  },
  train: {
    label: 'โครงการสูบลดระดับน้ำและโครงสร้างพื้นฐาน',
    category: 'Dewatering',
  },
  infrastructure: {
    label: 'โครงการสูบลดระดับน้ำและโครงสร้างพื้นฐาน',
    category: 'Dewatering',
  },
  dewatering: {
    label: 'โครงการสูบลดระดับน้ำและโครงสร้างพื้นฐาน',
    category: 'Dewatering',
  },
  other: {
    label: 'โครงการน้ำบาดาล',
    category: 'อื่นๆ',
  },
}

function presentProject(project: RecoveredProject): Project {
  const presentation = typePresentation[project.projectType] ?? typePresentation.other

  return {
    ...project,
    projectTypeLabel: presentation.label,
    category: [presentation.category],
  }
}

export const projects = sortProjectsNewestFirst(
  (recoveredProjects as RecoveredProject[]).map(presentProject)
)

export function getProjectById(id: string | number) {
  const numericId = typeof id === 'number' ? id : Number(id)
  if (!Number.isInteger(numericId)) return undefined
  return projects.find((project) => project._id === numericId)
}

export function getProjectMapUrl(project: Project) {
  if (project.lat === null || project.lng === null) return null
  const query = encodeURIComponent(`${project.lat},${project.lng}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
