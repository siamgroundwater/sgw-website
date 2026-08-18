'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Database,
  FolderKanban,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react'
import { cmsDateLocale } from '@/lib/cms-locale'
import { useCmsLanguage } from './CmsLanguage'

type DashboardData = {
  counts: { learning: number; projects: number; services: number; users: number }
  dbName: string
  recent: Array<{ action: string; actor: string; createdAt: string; id: string; summary: string }>
}

export default function CmsDashboard({ canImport, data }: { canImport: boolean; data: DashboardData }) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const copy = locale === 'th' ? {
    activity: 'กิจกรรมล่าสุด', activityDescription: 'การเปลี่ยนแปลงเนื้อหาและบัญชีล่าสุด',
    auditDescription: 'เก็บประวัติการเปลี่ยนแปลงเนื้อหาและบัญชีไว้ 365 วัน', auditHistory: 'ประวัติการใช้งาน',
    confirmImport: 'นำเข้าเนื้อหา SGW สาธารณะปัจจุบันมายังพื้นที่ CMS นี้หรือไม่? ระบบจะไม่เขียนทับรายการที่แก้ไขใน CMS แล้ว',
    errorImport: 'ไม่สามารถนำเข้าสำเนาจากเว็บสาธารณะได้', errorReach: 'ไม่สามารถเชื่อมต่อบริการนำเข้า CMS ได้',
    import: 'นำเข้าสำเนาจากเว็บสาธารณะ', importing: 'กำลังนำเข้า...', learning: 'บทความความรู้',
    noActivity: 'ยังไม่มีการบันทึกกิจกรรม CMS', privateDescription: 'ปิดกั้นเสิร์ชเอนจิน และเส้นทางข้อมูลทั้งหมดต้องมีเซสชัน', privateRoutes: 'เส้นทาง CMS ส่วนตัว',
    projects: 'ผลงาน', protected: 'เว็บสาธารณะได้รับการปกป้อง', protectedDescription: 'เว็บไซต์สาธารณะยังไม่อ่านข้อมูลจาก CMS',
    services: 'บริการ', setup: 'การตั้งค่าพื้นที่ทำงาน', totals: 'จำนวนเนื้อหา CMS', users: 'ผู้ใช้ CMS',
  } : {
    activity: 'Recent activity', activityDescription: 'Latest recorded content and account changes.', auditDescription: 'Content and account mutations are retained for 365 days.', auditHistory: 'Audit history',
    confirmImport: 'Import the current public SGW content into this CMS workspace? CMS-edited records will not be overwritten.', errorImport: 'Could not import the public snapshot.', errorReach: 'Could not reach the CMS import service.',
    import: 'Import public snapshot', importing: 'Importing...', learning: 'Learning articles', noActivity: 'No CMS activity has been recorded yet.', privateDescription: 'Search engines are blocked and all data routes require a session.', privateRoutes: 'Private CMS routes',
    projects: 'Projects', protected: 'Public frontend protected', protectedDescription: 'CMS records are not read by the public website yet.', services: 'Services', setup: 'Workspace setup', totals: 'CMS content totals', users: 'CMS users',
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const stats = [
    { icon: FolderKanban, label: copy.projects, value: data.counts.projects },
    { icon: Wrench, label: copy.services, value: data.counts.services },
    { icon: BookOpen, label: copy.learning, value: data.counts.learning },
    { icon: Users, label: copy.users, value: data.counts.users },
  ]
  const actionLabel = (action: string) => {
    if (!th) return action
    return ({
      'content.archive': 'นำเนื้อหาออก', 'content.create': 'สร้างเนื้อหา', 'content.import': 'นำเข้าเนื้อหา', 'content.update': 'อัปเดตเนื้อหา',
      'media.upload': 'อัปโหลดสื่อ', 'user.create': 'สร้างผู้ใช้', 'user.delete': 'ลบผู้ใช้', 'user.update': 'อัปเดตผู้ใช้',
    } as Record<string, string>)[action] || action
  }

  async function importSnapshot() {
    if (!window.confirm(copy.confirmImport)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/cms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'IMPORT_PUBLIC_SNAPSHOT' }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        result?: Record<string, { inserted: number; skipped: number; updated: number }>
      }
      if (!response.ok) {
        setError(copy.errorImport)
        return
      }
      const inserted = Object.values(payload.result || {}).reduce((sum, item) => sum + item.inserted, 0)
      const updated = Object.values(payload.result || {}).reduce((sum, item) => sum + item.updated, 0)
      const skipped = Object.values(payload.result || {}).reduce((sum, item) => sum + item.skipped, 0)
      setMessage(locale === 'th' ? `นำเข้าสำเร็จ: เพิ่ม ${inserted} รายการ, รีเฟรช ${updated} รายการ, คงรายการที่แก้ไขใน CMS ${skipped} รายการ` : `Import complete: ${inserted} added, ${updated} refreshed, ${skipped} CMS-edited records preserved.`)
      router.refresh()
    } catch {
      setError(copy.errorReach)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="cms-stats" aria-label={copy.totals}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article className="cms-stat" key={stat.label}>
              <div className="cms-stat-head"><span>{stat.label}</span><span className="cms-stat-icon"><Icon aria-hidden="true" /></span></div>
              <strong className="cms-stat-value">{stat.value}</strong>
            </article>
          )
        })}
      </section>

      <div className="cms-dashboard-grid">
        <section className="cms-panel">
          <header className="cms-panel-header">
            <div><h2>{copy.activity}</h2><p>{copy.activityDescription}</p></div>
            <Activity aria-hidden="true" />
          </header>
          {data.recent.length ? (
            <ul className="cms-activity-list">
              {data.recent.map((item) => (
                <li className="cms-activity-item" key={item.id}>
                  <div><strong>{th ? actionLabel(item.action) : item.summary}</strong><p>{item.actor} · {actionLabel(item.action)}</p></div>
                  <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
                </li>
              ))}
            </ul>
          ) : <div className="cms-empty"><Activity aria-hidden="true" /><p>{copy.noActivity}</p></div>}
        </section>

        <section className="cms-panel">
          <header className="cms-panel-header"><div><h2>{copy.setup}</h2><p>Database: {data.dbName}</p></div><Database aria-hidden="true" /></header>
          <ul className="cms-check-list">
            <li><CheckCircle2 aria-hidden="true" /><div><strong>{copy.privateRoutes}</strong><span>{copy.privateDescription}</span></div></li>
            <li><CheckCircle2 aria-hidden="true" /><div><strong>{copy.protected}</strong><span>{copy.protectedDescription}</span></div></li>
            <li><CheckCircle2 aria-hidden="true" /><div><strong>{copy.auditHistory}</strong><span>{copy.auditDescription}</span></div></li>
          </ul>
          {canImport ? <button className="cms-button" type="button" onClick={importSnapshot} disabled={busy}><RefreshCw aria-hidden="true" />{busy ? copy.importing : copy.import}</button> : null}
          <div aria-live="polite">
            {error ? <p className="cms-error">{error}</p> : null}
            {message ? <p className="cms-message">{message}</p> : null}
          </div>
        </section>
      </div>
    </>
  )
}
