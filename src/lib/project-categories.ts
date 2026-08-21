export const PROJECT_CATEGORIES = [
  'ภาครัฐ',
  'โรงงาน',
  'โรงแรม รีสอร์ต',
  'เกษตรกรรม ปศุสัตว์',
  'Dewatering',
  'อื่นๆ',
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

export type ProjectCategoryKey =
  | 'government'
  | 'factory'
  | 'resort'
  | 'agriculture'
  | 'dewatering'
  | 'other'

const categoryLabels: Record<ProjectCategoryKey, ProjectCategory> = {
  agriculture: 'เกษตรกรรม ปศุสัตว์',
  dewatering: 'Dewatering',
  factory: 'โรงงาน',
  government: 'ภาครัฐ',
  other: 'อื่นๆ',
  resort: 'โรงแรม รีสอร์ต',
}

export function getProjectCategoryLabel(category: ProjectCategoryKey) {
  return categoryLabels[category]
}
