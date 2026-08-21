import {
  CMS_PROJECT_WORK_TYPES,
  type CmsProjectWorkType,
} from '../types/cms.ts'

export type ProjectWorkTypeLocale = 'th' | 'en' | 'zh' | 'ja'

const labels: Record<CmsProjectWorkType, Record<ProjectWorkTypeLocale, string>> = {
  'dewatering-well-construction': {
    th: 'งานขุดเจาะก่อสร้างบ่อสูบลดระดับน้ำ',
    en: 'Dewatering well construction',
    zh: '降水井钻探与施工',
    ja: '地下水位低下井戸の掘削・建設',
  },
  'groundwater-project-remediation': {
    th: 'งานแก้ไขโครงการที่เจาะน้ำบาดาลแล้วมีปัญหา',
    en: 'Groundwater project remediation',
    zh: '地下水项目修复',
    ja: '問題のある地下水プロジェクトの改修',
  },
  'groundwater-survey': {
    th: 'งานสำรวจน้ำบาดาล',
    en: 'Groundwater survey',
    zh: '地下水勘探',
    ja: '地下水調査',
  },
  'groundwater-use-capacity-adjustment': {
    th: 'งานแก้ไขปริมาณการใช้น้ำบาดาล',
    en: 'Groundwater abstraction capacity adjustment',
    zh: '地下水开采量调整',
    ja: '地下水揚水量の調整',
  },
  'groundwater-well-drilling': {
    th: 'งานเจาะบ่อน้ำบาดาล',
    en: 'Groundwater well drilling',
    zh: '地下水井钻探',
    ja: '地下水井戸掘削',
  },
  'groundwater-well-maintenance': {
    th: 'งานซ่อมบำรุงรักษาบ่อน้ำบาดาล',
    en: 'Groundwater well maintenance',
    zh: '地下水井维护',
    ja: '地下水井戸の保守',
  },
  'mineral-water-survey': {
    th: 'งานสำรวจศึกษาน้ำแร่',
    en: 'Mineral water survey and study',
    zh: '矿泉水勘探与研究',
    ja: '鉱泉水の調査・研究',
  },
  'mineral-water-well-drilling': {
    th: 'งานเจาะบ่อน้ำแร่คุณภาพดี',
    en: 'High-quality mineral water well drilling',
    zh: '优质矿泉水井钻探',
    ja: '高品質な鉱泉井戸の掘削',
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
