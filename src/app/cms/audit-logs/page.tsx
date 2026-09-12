import { Activity, Search } from 'lucide-react'
import CmsShell from '@/components/cms/CmsShell'
import { searchCmsAuditLogs } from '@/server/cms/audit'
import { requireCmsPage } from '@/server/cms/page-guard'
import { cmsDateLocale, cmsRoleLabel, type CmsLocale } from '@/lib/cms-locale'
import { cmsAuditActionLabel, cmsAuditActions, cmsAuditPageHref, normalizeCmsAuditFilters } from '@/lib/cms-audit'
import { getCmsLocale } from '@/server/cms/locale'

export const dynamic = 'force-dynamic'

function value(value: unknown, locale: CmsLocale) {
  if (value === null || value === undefined || value === '') return locale === 'th' ? 'ว่าง' : 'Empty'
  if (value === 'Changed; all sessions signed out' && locale === 'th') return 'เปลี่ยนแล้ว และออกจากระบบทุกอุปกรณ์'
  return String(value)
}

function auditFieldLabel(field: string, locale: CmsLocale) {
  if (locale === 'en') return field
  const labels: Record<string, string> = {
    Audience: 'กลุ่มเป้าหมาย', Category: 'หมวดหมู่', Description: 'คำอธิบาย', 'Detail blocks': 'ส่วนรายละเอียด',
    'Display name': 'ชื่อแสดง', Email: 'อีเมล', Password: 'รหัสผ่าน', Eyebrow: 'ข้อความเหนือหัวข้อ', 'Hero image': 'ภาพหลัก', Location: 'สถานที่',
    Role: 'บทบาท', Sections: 'ส่วนเนื้อหา', 'Service key': 'คีย์บริการ', Sources: 'แหล่งอ้างอิง', Status: 'สถานะ', Title: 'ชื่อ', Username: 'ชื่อผู้ใช้', Year: 'ปี',
    Slug: 'ลิงก์', Summary: 'สรุป', Details: 'รายละเอียด', 'Cover image': 'ภาพปก', Gallery: 'แกลเลอรี', 'Gallery images': 'ภาพแกลเลอรี',
    'Work types': 'ประเภทงาน', Latitude: 'ละติจูด', Longitude: 'ลองจิจูด', Translations: 'คำแปล', 'Media metadata': 'คำอธิบายรูปภาพ',
  }
  return labels[field] || field
}

function auditEntityLabel(entity: string, locale: CmsLocale) {
  const labels: Record<string, { th: string; en: string }> = {
    import: { th: 'การนำเข้า', en: 'Import' }, learning: { th: 'บทความ', en: 'Article' }, media: { th: 'รูปภาพ', en: 'Image' },
    project: { th: 'ผลงาน', en: 'Project' }, service: { th: 'บริการ', en: 'Service' }, user: { th: 'ผู้ใช้', en: 'User' },
  }
  return labels[entity]?.[locale] || entity
}

export default async function CmsAuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireCmsPage('audit:view')
  const locale = await getCmsLocale()
  const text = (th: string, en: string) => locale === 'th' ? th : en
  const filters = normalizeCmsAuditFilters(await searchParams)
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)
  const result = invalidRange ? { logs: [], page: 1, pages: 1, total: 0 } : await searchCmsAuditLogs(filters)
  const labels = [text('เวลา', 'Time'), text('การดำเนินการ', 'Action'), text('รายละเอียด', 'Details'), text('ผู้ดำเนินการ', 'Actor')]

  return <CmsShell eyebrow={text('การจัดการระบบ', 'Administration')} title={text('ประวัติการใช้งาน', 'Audit logs')} session={session}>
    <section className="cms-panel">
      <header className="cms-panel-header"><div><h2>{text('การเปลี่ยนแปลงที่บันทึกไว้', 'Recorded changes')}</h2><p>{text('ค้นหาประวัติย้อนหลัง 365 วัน แสดงหน้าละ 25 รายการ เวลาอ้างอิงประเทศไทย', 'Search 365 days of history, 25 changes per page. Dates and times use Bangkok time.')}</p></div><Activity aria-hidden="true" /></header>
      <form action="/cms/audit-logs" method="get" className="cms-audit-filters">
        <label className="cms-field"><span>{labels[3]}</span><input name="actor" defaultValue={filters.actor} maxLength={80} placeholder={text('ชื่อหรือชื่อผู้ใช้', 'Name or username')} /></label>
        <label className="cms-field"><span>{text('ผลงาน', 'Project')}</span><input name="project" defaultValue={filters.project} maxLength={80} placeholder={text('ชื่อผลงานหรือรหัส', 'Project title or ID')} /></label>
        <label className="cms-field"><span>{labels[1]}</span><select name="action" defaultValue={filters.action}><option value="">{text('ทุกการดำเนินการ', 'All actions')}</option>{cmsAuditActions.map((action) => <option key={action} value={action}>{cmsAuditActionLabel(action, locale)}</option>)}</select></label>
        <label className="cms-field"><span>{text('ตั้งแต่วันที่', 'From date')}</span><input type="date" name="from" defaultValue={filters.from} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'audit-range-error' : undefined} /></label>
        <label className="cms-field"><span>{text('ถึงวันที่', 'Through date')}</span><input type="date" name="to" defaultValue={filters.to} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'audit-range-error' : undefined} /></label>
        <div className="cms-row-actions"><button className="cms-button" type="submit"><Search aria-hidden="true" />{text('ค้นหา', 'Search')}</button><a className="cms-button-secondary" href="/cms/audit-logs">{text('ล้างตัวกรอง', 'Clear filters')}</a></div>
      </form>
      {invalidRange ? <p className="cms-error" id="audit-range-error" role="alert">{text('วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด', 'The start date must not be after the end date.')}</p> : null}
      <p className="cms-field-help">{text(`พบ ${result.total} รายการ`, `${result.total} matching changes`)}</p>
      {result.logs.length ? <div className="cms-table-wrap"><table className="cms-table cms-access-table" role="table"><thead role="rowgroup"><tr role="row">{labels.map((label) => <th role="columnheader" scope="col" key={label}>{label}</th>)}</tr></thead><tbody role="rowgroup">{result.logs.map((log) => <tr key={log.id} role="row">
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[0]}</span><time dateTime={log.createdAt}>{new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(log.createdAt))}</time></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[1]}</span><span className="cms-status">{cmsAuditActionLabel(log.action, locale)}</span></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[2]}</span><div className="cms-title-cell">
          <strong>{locale === 'th' ? cmsAuditActionLabel(log.action, locale) : log.summary}</strong>
          <span>{auditEntityLabel(log.entity.type, locale)}{log.entity.label ? ` · ${log.entity.label}` : ''}</span>
          {log.projectHref ? <a className="cms-audit-project-link" href={log.projectHref}>{text('เปิดผลงาน', 'Open project')}</a> : null}
          {log.changes.length ? <details><summary>{text(`ดูการเปลี่ยนแปลง ${log.changes.length} ช่อง`, `View ${log.changes.length} changed fields`)}</summary><ul className="cms-audit-change-list">{log.changes.map((change, index) => <li key={`${change.field}-${index}`}><strong>{auditFieldLabel(change.field, locale)}:</strong> {value(change.before, locale)} → {value(change.after, locale)}</li>)}</ul></details> : null}
        </div></td>
        <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[3]}</span><div className="cms-title-cell"><strong>{log.actor.displayName}</strong><span>@{log.actor.username} · {cmsRoleLabel(locale, log.actor.role)}</span></div></td>
      </tr>)}</tbody></table></div> : !invalidRange ? <div className="cms-empty"><Activity aria-hidden="true" /><p>{text('ไม่พบประวัติที่ตรงกับตัวกรอง', 'No changes match these filters.')}</p><a className="cms-button-secondary" href="/cms/audit-logs">{text('แสดงประวัติทั้งหมด', 'Show all history')}</a></div> : null}
      <nav className="cms-audit-pagination" aria-label={text('หน้าประวัติการใช้งาน', 'Audit history pages')}>
        {result.page > 1 ? <a className="cms-button-secondary" href={cmsAuditPageHref(filters, result.page - 1)} rel="prev">{text('ก่อนหน้า', 'Previous')}</a> : <span />}
        <span>{text(`หน้า ${result.page} จาก ${result.pages}`, `Page ${result.page} of ${result.pages}`)}</span>
        {result.page < result.pages ? <a className="cms-button-secondary" href={cmsAuditPageHref(filters, result.page + 1)} rel="next">{text('ถัดไป', 'Next')}</a> : <span />}
      </nav>
    </section>
  </CmsShell>
}
