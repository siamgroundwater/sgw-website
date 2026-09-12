'use client'

import { Activity, AlertTriangle, CheckCircle2, FolderKanban, Plus, Trash2, Users } from 'lucide-react'
import { cmsDateLocale } from '@/lib/cms-locale'
import { cmsAuditActionLabel } from '@/lib/cms-audit'
import type { getCmsDashboardData } from '@/server/cms/dashboard'
import { useCmsLanguage } from './CmsLanguage'
import './CmsDashboardImprovements.css'

export default function CmsDashboard({ data, canWrite, canManage }: { data: Awaited<ReturnType<typeof getCmsDashboardData>>; canWrite: boolean; canManage: boolean }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const formatDate = (date: string) => new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
  return <div className="cms-dashboard-content">
    <p className="cms-message">{text('กดบันทึกเพื่ออัปเดตผลงานบนเว็บไซต์ทันที', 'Save a project to update the website immediately.')}</p>
    <div className="cms-overview-cards">
      <a className="cms-panel cms-overview-card" href="/cms/projects"><FolderKanban aria-hidden="true" /><strong>{data.active}</strong><span>{text('ผลงานบนเว็บไซต์', 'Live projects')}</span></a>
      {canManage && <a className="cms-panel cms-overview-card" href="/cms/projects?view=trash"><Trash2 aria-hidden="true" /><strong>{data.removed}</strong><span>{text('ในถังขยะ', 'In Trash')}</span></a>}
      {canManage && <a className="cms-panel cms-overview-card" href="/cms/users"><Users aria-hidden="true" /><strong>{data.userCount}</strong><span>{text('ผู้ใช้ที่เปิดใช้งาน', 'Active users')}</span></a>}
    </div>
    <section className="cms-panel">
      <header className="cms-panel-header"><h2>{text('แก้ไขล่าสุด', 'Recently edited')}</h2>{canWrite && <a className="cms-button" href="/cms/projects/new" target="_blank" rel="noopener noreferrer"><Plus aria-hidden="true" />{text('เพิ่มผลงาน', 'New project')}</a>}</header>
      <ul className="cms-dashboard-recent">{data.recentProjects.map(project => <li key={project.id}><a href={'/cms/projects/' + project.id} target="_blank" rel="noopener noreferrer">{project.title}</a><time dateTime={project.updatedAt}>{formatDate(project.updatedAt)}</time></li>)}</ul>
    </section>
    {canManage && data.operations && <section className="cms-panel">
      <header className="cms-panel-header"><h2>{text('สถานะระบบ', 'System status')}</h2>{data.operations.cleanupOverdue ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</header>
      <dl className="cms-dashboard-status">
        <div><dt>{text('สภาพแวดล้อม', 'Environment')}</dt><dd>{/(dev|test|preview|staging)/i.test(data.dbName) ? text('ทดสอบ', 'Development / test') : text('เว็บไซต์จริง', 'Production')}</dd></div>
        <div><dt>{text('ล้างภาพค้างสำเร็จล่าสุด', 'Last successful staged-image cleanup')}</dt><dd>{data.operations.lastSuccessfulCleanupAt ? formatDate(data.operations.lastSuccessfulCleanupAt) : text('ยังไม่มีประวัติ', 'No run recorded')}</dd></div>
        <div><dt>{text('ภาพค้างที่หมดอายุ', 'Expired staged images')}</dt><dd>{data.operations.expiredMediaCount}</dd></div>
      </dl>
      {data.operations.cleanupOverdue && <p className="cms-notice">{text('ยังไม่พบการล้างภาพสำเร็จใน 36 ชั่วโมงที่ผ่านมา โปรดตรวจสอบงานตามเวลา', 'No successful cleanup is recorded within 36 hours. Check the scheduled job.')}</p>}
      {data.operations.recentFailures.length > 0 && <details><summary>{text('ปัญหาระบบล่าสุด', 'Recent system failures')} ({data.operations.recentFailures.length})</summary><ul className="cms-dashboard-recent">{data.operations.recentFailures.map((event,index) => <li key={index}><span>{event.kind === 'media-cleanup' ? text('ล้างภาพค้างไม่สำเร็จ', 'Staged-image cleanup failed') : event.kind === 'project-revalidation' ? text('รอรีเฟรชเว็บไซต์', 'Website refresh needs attention') : text('บันทึกประวัติไม่สำเร็จ', 'Activity recording failed')}</span><time>{formatDate(event.createdAt)}</time></li>)}</ul></details>}
    </section>}
    <section className="cms-panel"><header className="cms-panel-header"><h2>{text('กิจกรรมล่าสุด', 'Recent activity')}</h2><Activity aria-hidden="true" /></header>
      <ul className="cms-dashboard-recent">{data.recent.map(item => <li key={item.id}><div><strong>{cmsAuditActionLabel(item.action, locale)}</strong>{item.entityType === 'project' && item.available ? <a href={'/cms/projects/' + item.entityId} target="_blank" rel="noopener noreferrer">{item.entityLabel}</a> : <span>{item.entityLabel}</span>}<span>{item.actor}</span></div><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></li>)}</ul>
      {canManage && <a className="cms-back-link" href="/cms/audit-logs">{text('ดูประวัติทั้งหมด', 'View all activity')}</a>}
    </section>
  </div>
}
