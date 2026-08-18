export const PROJECT_CATEGORIES = [
  'ภาครัฐ',
  'โรงงาน',
  'โรงแรม รีสอร์ต',
  'เกษตรกรรม ปศุสัตว์',
  'Dewatering',
  'อื่นๆ',
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

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

export function getProjectTypePresentation(projectType: string) {
  return typePresentation[projectType] ?? typePresentation.other
}
