import {
  CMS_PROJECT_WORK_TYPES,
  type CmsProjectWorkType,
} from '../types/cms.ts'

export type ProjectWorkTypeLocale = 'th' | 'en' | 'zh' | 'ja'

const labels: Record<CmsProjectWorkType, Record<ProjectWorkTypeLocale, string>> = {
  'groundwater-project-remediation': {
    th: 'งานแก้ไขโครงการที่มีปัญหา',
    en: 'Problem project remediation',
    zh: '问题项目修复',
    ja: '問題のあるプロジェクトの改修',
  },
  'groundwater-survey': {
    th: 'งานสำรวจน้ำบาดาล',
    en: 'Groundwater survey',
    zh: '地下水勘探',
    ja: '地下水調査',
  },
  'groundwater-well-drilling': {
    th: 'งานเจาะบ่อน้ำบาดาล',
    en: 'Groundwater well drilling',
    zh: '地下水井钻探',
    ja: '地下水井戸掘削',
  },
  'groundwater-well-maintenance': {
    th: 'งานซ่อมบำรุง',
    en: 'Maintenance work',
    zh: '维护工程',
    ja: '保守作業',
  },
  'island-work': {
    th: 'งานบนเกาะ',
    en: 'Island work',
    zh: '岛屿工程',
    ja: '島しょ部での作業',
  },
  'mineral-water': {
    th: 'งานน้ำแร่',
    en: 'Mineral water work',
    zh: '矿泉水工程',
    ja: '鉱泉関連作業',
  },
  other: {
    th: 'งานอื่นๆ',
    en: 'Other work',
    zh: '其他工程',
    ja: 'その他の作業',
  },
}

const aliases = new Map<string, CmsProjectWorkType>()
for (const workType of CMS_PROJECT_WORK_TYPES) {
  aliases.set(workType, workType)
  for (const label of Object.values(labels[workType])) {
    aliases.set(label, workType)
    aliases.set(label.toLocaleLowerCase('en'), workType)
  }
}

const legacyAliases: Record<string, CmsProjectWorkType> = {
  'dewatering-well-construction': 'other',
  'Dewatering well construction': 'other',
  'groundwater-use-capacity-adjustment': 'other',
  'Groundwater abstraction capacity adjustment': 'other',
  'mineral-water-survey': 'mineral-water',
  'Mineral water survey and study': 'mineral-water',
  'mineral-water-well-drilling': 'mineral-water',
  'High-quality mineral water well drilling': 'mineral-water',
  'งานขุดเจาะก่อสร้างบ่อสูบลดระดับน้ำ': 'other',
  'งานแก้ไขปริมาณการใช้น้ำบาดาล': 'other',
  'งานเจาะบ่อน้ำแร่คุณภาพดี': 'mineral-water',
  'งานสำรวจศึกษาน้ำแร่': 'mineral-water',
  'งานแก้ไขโครงการที่เจาะน้ำบาดาลแล้วมีปัญหา': 'groundwater-project-remediation',
  'งานซ่อมบำรุงรักษาบ่อน้ำบาดาล': 'groundwater-well-maintenance',
}

for (const [alias, workType] of Object.entries(legacyAliases)) {
  aliases.set(alias, workType)
  aliases.set(alias.toLocaleLowerCase('en'), workType)
}

export function projectWorkTypeLabel(locale: ProjectWorkTypeLocale, workType: CmsProjectWorkType) {
  return labels[workType][locale]
}

export function normalizeProjectWorkTypes(value: unknown): CmsProjectWorkType[] {
  if (!Array.isArray(value)) return []
  const normalized = value.flatMap((item) => {
    if (typeof item !== 'string') return []
    const trimmed = item.trim()
    const workType = aliases.get(trimmed) || aliases.get(trimmed.toLocaleLowerCase('en'))
    return workType ? [workType] : []
  })
  return [...new Set(normalized)]
}

export function localizeProjectWorkTypes(value: unknown, locale: ProjectWorkTypeLocale) {
  return normalizeProjectWorkTypes(value).map((workType) => projectWorkTypeLabel(locale, workType))
}
