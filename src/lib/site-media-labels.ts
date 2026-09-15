import type { SiteMediaSectionKey } from './site-media'

export type SiteMediaEditorKind = 'service' | 'single' | 'slides'

export const siteMediaLabels: Record<SiteMediaSectionKey, {
  description: { en: string; th: string }
  kind: SiteMediaEditorKind
  publicHref: string
  title: { en: string; th: string }
}> = {
  'service-survey': {
    description: { th: 'ภาพหลัก 16:9 และภาพสไลด์ 4:3 สำหรับงานสำรวจน้ำบาดาล', en: '16:9 hero and 4:3 slide images for groundwater surveys.' },
    kind: 'service', publicHref: '/services/survey', title: { th: 'งานสำรวจน้ำบาดาล', en: 'Groundwater survey' },
  },
  'service-drilling': {
    description: { th: 'ภาพหลัก 16:9 และภาพสไลด์ 4:3 สำหรับงานเจาะบ่อน้ำบาดาล', en: '16:9 hero and 4:3 slide images for groundwater well drilling.' },
    kind: 'service', publicHref: '/services/drilling', title: { th: 'งานเจาะบ่อน้ำบาดาล', en: 'Well drilling' },
  },
  'service-maintenance': {
    description: { th: 'ภาพหลัก 16:9 และภาพสไลด์ 4:3 สำหรับงานซ่อมบำรุง', en: '16:9 hero and 4:3 slide images for maintenance services.' },
    kind: 'service', publicHref: '/services/maintenance', title: { th: 'งานซ่อมบำรุง', en: 'Maintenance' },
  },
  'service-consult': {
    description: { th: 'ภาพหลัก 16:9 และภาพสไลด์ 4:3 สำหรับงานแก้ไขปัญหาโครงการ', en: '16:9 hero and 4:3 slide images for project remediation.' },
    kind: 'service', publicHref: '/services/consult', title: { th: 'งานแก้ไขปัญหาโครงการ', en: 'Project remediation' },
  },
  'project-map': {
    description: { th: 'แผนที่ผลงานในอดีต ควรใช้ภาพความละเอียดสูง', en: 'Historic project map. Use a high-resolution image.' },
    kind: 'single', publicHref: '/projects', title: { th: 'แผนที่ผลงาน', en: 'Project map' },
  },
  governance: {
    description: { th: 'โปสเตอร์โครงการรักษ์น้ำบาดาล ควรใช้ภาพความละเอียดสูง', en: 'Groundwater governance poster. Use a high-resolution image.' },
    kind: 'single', publicHref: '/governance', title: { th: 'โปสเตอร์รักษ์น้ำบาดาล', en: 'Governance poster' },
  },
  'about-hero': {
    description: { th: 'สไลด์หน้าเกี่ยวกับเรา ครอปภาพ 3:1 บนจอใหญ่และ 16:9 บนจอเล็ก', en: 'About-page slides, cropped to 3:1 on large screens and 16:9 on small screens.' },
    kind: 'slides', publicHref: '/about', title: { th: 'สไลด์เกี่ยวกับเรา', en: 'About hero slides' },
  },
}
