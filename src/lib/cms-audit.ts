export const cmsAuditActions = ['content.create', 'content.update', 'content.archive', 'content.import', 'media.upload', 'user.create', 'user.update', 'user.delete', 'content.publish', 'content.unpublish', 'content.restore'] as const
export type CmsAuditActionFilter = typeof cmsAuditActions[number]

const labels: Record<CmsAuditActionFilter, { th: string; en: string }> = {
  'content.create': { th: 'เพิ่มเนื้อหา', en: 'Content added' },
  'content.update': { th: 'อัปเดตเนื้อหา', en: 'Content updated' },
  'content.archive': { th: 'นำเนื้อหาออก', en: 'Content removed' },
  'content.import': { th: 'นำเข้าเนื้อหา', en: 'Content imported' },
  'media.upload': { th: 'อัปโหลดรูปภาพ', en: 'Image uploaded' },
  'user.create': { th: 'เพิ่มผู้ใช้', en: 'User added' },
  'user.update': { th: 'อัปเดตผู้ใช้', en: 'User updated' },
  'user.delete': { th: 'ยกเลิกสิทธิ์ผู้ใช้', en: 'User access removed' },
  'content.publish': { th: 'เผยแพร่เนื้อหา (ประวัติเดิม)', en: 'Content published (historical)' },
  'content.unpublish': { th: 'ถอนการเผยแพร่ (ประวัติเดิม)', en: 'Content unpublished (historical)' },
  'content.restore': { th: 'กู้คืนเนื้อหา', en: 'Content restored' },
}

export function cmsAuditActionLabel(action: string, locale: 'th' | 'en') {
  return labels[action as CmsAuditActionFilter]?.[locale] || (locale === 'th' ? 'การเปลี่ยนแปลงอื่น' : 'Other change')
}

export type CmsAuditFilters = { actor: string; action: CmsAuditActionFilter | ''; project: string; from: string; to: string; page: number }

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeCmsAuditFilters(raw: Record<string, unknown>): CmsAuditFilters {
  const string = (name: string, length = 80) => typeof raw[name] === 'string' ? raw[name].trim().slice(0, length) : ''
  const from = string('from', 10)
  const to = string('to', 10)
  const action = string('action')
  const page = Number(raw.page)
  return { actor: string('actor'), project: string('project'), action: cmsAuditActions.includes(action as CmsAuditActionFilter) ? action as CmsAuditActionFilter : '', from: validDate(from) ? from : '', to: validDate(to) ? to : '', page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1 }
}

export function cmsAuditDateRange(filters: Pick<CmsAuditFilters, 'from' | 'to'>) {
  return {
    ...(filters.from ? { $gte: new Date(`${filters.from}T00:00:00+07:00`) } : {}),
    ...(filters.to ? { $lt: new Date(new Date(`${filters.to}T00:00:00+07:00`).getTime() + 86_400_000) } : {}),
  }
}

export function cmsAuditPageHref(filters: CmsAuditFilters, page: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, page })) if (value && (key !== 'page' || value !== 1)) params.set(key, String(value))
  return `/cms/audit-logs${params.size ? `?${params}` : ''}`
}
