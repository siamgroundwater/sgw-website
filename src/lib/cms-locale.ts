import type { CmsProjectCategory, CmsProjectWorkType, CmsRole, CmsStatus } from '@/types/cms'
import { projectWorkTypeLabel } from './project-work-types.ts'

export type CmsLocale = 'th' | 'en'

export const CMS_LOCALE_COOKIE = 'sgw_cms_locale'

export function normalizeCmsLocale(value: string | null | undefined): CmsLocale {
  return value === 'en' ? 'en' : 'th'
}

export function cmsDateLocale(locale: CmsLocale) {
  return locale === 'th' ? 'th-TH' : 'en-GB'
}

export function cmsStatusLabel(locale: CmsLocale, status: CmsStatus) {
  const labels: Record<CmsStatus, Record<CmsLocale, string>> = {
    active: { th: 'เปิดใช้งาน', en: 'Active' },
    archived: { th: 'เก็บถาวร', en: 'Archived' },
    draft: { th: 'ฉบับร่าง', en: 'Draft' },
  }
  return labels[status][locale]
}

export function cmsRoleLabel(locale: CmsLocale, role: CmsRole) {
  const labels: Record<CmsRole, Record<CmsLocale, string>> = {
    admin: { th: 'ผู้ดูแลระบบ', en: 'Administrator' },
    editor: { th: 'ผู้แก้ไขเนื้อหา', en: 'Content editor' },
    viewer: { th: 'ผู้เข้าชม', en: 'Viewer' },
  }
  return labels[role][locale]
}

export function cmsRoleDescription(locale: CmsLocale, role: CmsRole) {
  const descriptions: Record<CmsRole, Record<CmsLocale, string>> = {
    admin: {
      th: 'จัดการเนื้อหา ผู้ใช้ และประวัติการใช้งานทั้งหมด',
      en: 'Manage all content, users, and audit history.',
    },
    editor: {
      th: 'สร้างและแก้ไขเนื้อหาได้ แต่ไม่สามารถจัดการผู้ใช้ได้',
      en: 'Create and edit content, without user administration.',
    },
    viewer: {
      th: 'ดูข้อมูลใน CMS ได้อย่างเดียว',
      en: 'Read-only access to CMS content.',
    },
  }
  return descriptions[role][locale]
}

export function cmsSourceLabel(locale: CmsLocale, source: 'cms' | 'public') {
  if (source === 'cms') return locale === 'th' ? 'แก้ไขใน CMS' : 'CMS edited'
  return locale === 'th' ? 'สำเนาจากเว็บสาธารณะ' : 'Public snapshot'
}

export function cmsProjectCategoryLabel(locale: CmsLocale, category: CmsProjectCategory) {
  const labels = {
    agriculture: { th: 'เกษตรกรรม ปศุสัตว์', en: 'Agriculture and livestock' },
    dewatering: { th: 'งานสูบลดระดับน้ำ', en: 'Dewatering' },
    factory: { th: 'โรงงาน', en: 'Factory' },
    government: { th: 'ภาครัฐ', en: 'Government' },
    other: { th: 'อื่นๆ', en: 'Other' },
    resort: { th: 'โรงแรม รีสอร์ต', en: 'Hotels and resorts' },
  }
  return labels[category][locale]
}

export function cmsProjectWorkTypeLabel(locale: CmsLocale, workType: CmsProjectWorkType) {
  return projectWorkTypeLabel(locale, workType)
}

export function localizeCmsFieldErrors(locale: CmsLocale, errors: Record<string, string>) {
  if (locale === 'en') return errors
  const translations: Record<string, string> = {
    'Add at least one learning section.': 'เพิ่มส่วนความรู้อย่างน้อยหนึ่งส่วน',
    'Add at least one service detail block.': 'เพิ่มส่วนรายละเอียดบริการอย่างน้อยหนึ่งส่วน',
    'Article description is required.': 'กรุณากรอกคำอธิบายบทความ',
    'Article title is required.': 'กรุณากรอกชื่อบทความ',
    'Choose a valid content status.': 'กรุณาเลือกสถานะเนื้อหาที่ถูกต้อง',
    'Choose a valid project category.': 'กรุณาเลือกหมวดหมู่ผลงานที่ถูกต้อง',
    'Choose valid project work types.': 'กรุณาเลือกประเภทงานที่ถูกต้อง',
    'Choose a valid SGW service.': 'กรุณาเลือกบริการ SGW ที่ถูกต้อง',
    'Cover image is required before publishing.': 'กรุณาเพิ่มภาพปกก่อนเผยแพร่',
    'Describe the intended audience.': 'กรุณาอธิบายกลุ่มเป้าหมาย',
    'Enter a valid four-digit year.': 'กรุณากรอกปีแบบสี่หลักที่ถูกต้อง',
    'Enter both latitude and longitude, or leave both empty.': 'กรอกละติจูดและลองจิจูดให้ครบทั้งคู่ หรือเว้นว่างทั้งคู่',
    'Every gallery item must be a valid asset URL or local path.': 'ภาพแกลเลอรีทุกภาพต้องใช้ URL หรือพาธภายในที่ถูกต้อง',
    'Every section image must use an HTTP(S) URL or a local / path.': 'ภาพประกอบทุกภาพต้องใช้ HTTP(S) URL หรือพาธภายใน',
    'Every section needs a heading and learning content.': 'ทุกส่วนต้องมีหัวข้อและเนื้อหาการเรียนรู้',
    'Every service block needs a title and description.': 'ทุกส่วนบริการต้องมีหัวข้อและคำอธิบาย',
    'Every source needs a label and a valid HTTP(S) URL.': 'ทุกแหล่งอ้างอิงต้องมีชื่อและ HTTP(S) URL ที่ถูกต้อง',
    'Latitude must be between -90 and 90.': 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90',
    'Longitude must be between -180 and 180.': 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180',
    'Project location is required.': 'กรุณากรอกสถานที่ของผลงาน',
    'Project title is required.': 'กรุณากรอกชื่อผลงาน',
    'Project type is required.': 'กรุณากรอกประเภทผลงาน',
    'Service description is required.': 'กรุณากรอกคำอธิบายบริการ',
    'Service title is required.': 'กรุณากรอกชื่อบริการ',
    'Thai project summary is required before publishing.': 'กรุณากรอกสรุปผลงานภาษาไทยก่อนเผยแพร่',
    'Use a URL-safe slug without spaces or slashes.': 'ใช้ slug ที่ปลอดภัยสำหรับ URL โดยไม่มีช่องว่างหรือเครื่องหมายทับ',
    'Use a valid HTTP(S) URL or local path.': 'ใช้ HTTP(S) URL หรือพาธภายในที่ถูกต้อง',
    'Use an absolute HTTP(S) URL or a local / path.': 'ใช้ HTTP(S) URL แบบเต็ม หรือพาธภายในที่ขึ้นต้นด้วย /',
  }
  return Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, translations[message] || message]))
}
