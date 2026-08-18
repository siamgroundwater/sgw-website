import { Activity } from 'lucide-react'
import CmsShell from '@/components/cms/CmsShell'
import { listCmsAuditLogs } from '@/server/cms/audit'
import { requireCmsPage } from '@/server/cms/page-guard'
import { cmsDateLocale, cmsRoleLabel, type CmsLocale } from '@/lib/cms-locale'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

function value(value: unknown, locale: CmsLocale) {
  if (value === null || value === undefined || value === '') return locale === 'th' ? 'ว่าง' : 'Empty'
  return String(value)
}

function actionLabel(action: string, locale: CmsLocale) {
  const labels: Record<string, { th: string; en: string }> = {
    'content.archive': { th: 'นำเนื้อหาออก', en: 'Content removed' },
    'content.create': { th: 'สร้างเนื้อหา', en: 'Content created' },
    'content.import': { th: 'นำเข้าเนื้อหา', en: 'Content imported' },
    'content.update': { th: 'อัปเดตเนื้อหา', en: 'Content updated' },
    'media.upload': { th: 'อัปโหลดสื่อ', en: 'Media uploaded' },
    'user.create': { th: 'สร้างผู้ใช้', en: 'User created' },
    'user.delete': { th: 'ลบผู้ใช้', en: 'User removed' },
    'user.update': { th: 'อัปเดตผู้ใช้', en: 'User updated' },
  }
  return labels[action]?.[locale] || action
}

function auditFieldLabel(field: string, locale: CmsLocale) {
  if (locale === 'en') return field
  const labels: Record<string, string> = {
    Audience: 'กลุ่มเป้าหมาย', Category: 'หมวดหมู่', Description: 'คำอธิบาย', 'Detail blocks': 'ส่วนรายละเอียด',
    'Display name': 'ชื่อแสดง', Email: 'อีเมล', Eyebrow: 'ข้อความเหนือหัวข้อ', 'Hero image': 'ภาพหลัก', Location: 'สถานที่',
    Role: 'บทบาท', Sections: 'ส่วนเนื้อหา', 'Service key': 'คีย์บริการ', Sources: 'แหล่งอ้างอิง', Status: 'สถานะ', Title: 'ชื่อ', Username: 'ชื่อผู้ใช้', Year: 'ปี',
  }
  return labels[field] || field
}

function auditEntityLabel(entity: string, locale: CmsLocale) {
  if (locale === 'en') return entity
  return ({ import: 'การนำเข้า', learning: 'บทความ', media: 'สื่อ', project: 'ผลงาน', service: 'บริการ', user: 'ผู้ใช้' } as Record<string, string>)[entity] || entity
}

export default async function CmsAuditLogsPage() {
  const session = await requireCmsPage('audit:view')
  const locale = await getCmsLocale()
  const logs = await listCmsAuditLogs()
  const copy = locale === 'th' ? {
    action: 'การดำเนินการ', actor: 'ผู้ดำเนินการ', administration: 'การจัดการระบบ',
    details: 'รายละเอียด', empty: 'ยังไม่มีการบันทึกการเปลี่ยนแปลงใน CMS', logs: 'ประวัติการใช้งาน',
    recorded: 'การเปลี่ยนแปลงที่บันทึกไว้', retention: 'การเปลี่ยนแปลง CMS 100 รายการล่าสุด ระบบจะลบรายการอัตโนมัติหลัง 365 วัน', time: 'เวลา',
  } : {
    action: 'Action', actor: 'Actor', administration: 'Administration', details: 'Details', empty: 'No CMS changes have been recorded yet', logs: 'Audit logs',
    recorded: 'Recorded changes', retention: 'The most recent 100 CMS mutations. Records expire automatically after 365 days.', time: 'Time',
  }
  return (
    <CmsShell eyebrow={copy.administration} title={copy.logs} session={session}>
      <section className="cms-panel">
        <header className="cms-panel-header"><div><h2>{copy.recorded}</h2><p>{copy.retention}</p></div><Activity aria-hidden="true" /></header>
        {logs.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>{copy.time}</th><th>{copy.action}</th><th>{copy.details}</th><th>{copy.actor}</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><time dateTime={log.createdAt}>{new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.createdAt))}</time></td><td><span className="cms-status">{actionLabel(log.action, locale)}</span></td><td><div className="cms-title-cell"><strong>{locale === 'th' ? actionLabel(log.action, locale) : log.summary}</strong><span>{auditEntityLabel(log.entity.type, locale)}{log.entity.label ? ` · ${log.entity.label}` : ''}</span>{log.changes.length ? <ul className="cms-audit-change-list">{log.changes.map((change, index) => <li key={`${change.field}-${index}`}><strong>{auditFieldLabel(change.field, locale)}:</strong> {value(change.before, locale)} → {value(change.after, locale)}</li>)}</ul> : null}</div></td><td><div className="cms-title-cell"><strong>{log.actor.displayName}</strong><span>@{log.actor.username} · {cmsRoleLabel(locale, log.actor.role)}</span></div></td></tr>)}</tbody></table></div> : <div className="cms-empty"><Activity aria-hidden="true" /><p>{copy.empty}</p></div>}
      </section>
    </CmsShell>
  )
}
