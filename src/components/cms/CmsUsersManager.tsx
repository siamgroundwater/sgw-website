'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit3, Plus, Search, UserRound } from 'lucide-react'
import { cmsDateLocale, cmsRoleDescription, cmsRoleLabel, cmsStatusLabel } from '@/lib/cms-locale'
import type { CmsUserRecord } from '@/types/cms'
import { useCmsLanguage } from './CmsLanguage'

export default function CmsUsersManager({ initialUsers, currentUserId, initialMessage = '' }: { initialUsers: CmsUserRecord[]; currentUserId: string; initialMessage?: string }) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return initialUsers.filter((user) => (!clean || `${user.name} ${user.username} ${user.email} ${cmsRoleLabel(locale, user.role)}`.toLowerCase().includes(clean)) && (!roleFilter || user.role === roleFilter) && (!statusFilter || user.status === statusFilter))
  }, [query, initialUsers, roleFilter, statusFilter, locale])

  const labels = [text('ผู้ใช้', 'User'), text('บทบาท', 'Role'), text('สถานะ', 'Status'), text('เข้าสู่ระบบล่าสุด', 'Last login'), text('การจัดการ', 'Actions')]
  return <section className="cms-panel">
    <header className="cms-panel-header cms-panel-header-single"><div><h2>{text('สิทธิ์เข้าถึง CMS', 'CMS access')}</h2><p>{text('กำหนดสิทธิ์เท่าที่แต่ละคนจำเป็น ต้องมีผู้ดูแลที่เปิดใช้งานอย่างน้อยหนึ่งคน', 'Assign only the access each person needs. Keep at least one active administrator.')}</p></div><Link className="cms-button" href="/cms/users/add"><Plus aria-hidden="true" />{text('เพิ่มผู้ใช้', 'Add user')}</Link></header>
    {initialMessage ? <p className="cms-message" role="status">{initialMessage}</p> : null}
    <div className="cms-audit-filters">
      <label className="cms-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text('ค้นหาผู้ใช้', 'Search users')} aria-label={text('ค้นหาผู้ใช้ CMS', 'Search CMS users')} /></label>
      <label className="cms-field"><span>{labels[1]}</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">{text('ทุกบทบาท', 'All roles')}</option>{(['admin', 'editor', 'viewer'] as const).map((role) => <option key={role} value={role}>{cmsRoleLabel(locale, role)}</option>)}</select></label>
      <label className="cms-field"><span>{labels[2]}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{text('ทุกสถานะ', 'All statuses')}</option>{(['active', 'draft', 'archived'] as const).map((status) => <option key={status} value={status}>{status === 'active' ? cmsStatusLabel(locale, status) : status === 'draft' ? text('ปิดใช้งาน', 'Disabled') : text('เก็บถาวร / ปิดใช้งาน', 'Archived / disabled')}</option>)}</select></label>
    </div>
    {filtered.length ? <div className="cms-table-wrap"><table className="cms-table cms-access-table" role="table"><thead role="rowgroup"><tr role="row">{labels.map((label) => <th scope="col" role="columnheader" key={label}>{label}</th>)}</tr></thead><tbody role="rowgroup">{filtered.map((user) => <tr role="row" key={user.id}>
      <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[0]}</span><div className="cms-title-cell"><strong>{user.name}{user.id === currentUserId ? text(' (คุณ)', ' (you)') : ''}</strong><span>@{user.username}{user.email ? ` · ${user.email}` : ''}</span></div></td>
      <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[1]}</span><div className="cms-title-cell"><strong>{cmsRoleLabel(locale, user.role)}</strong><span>{cmsRoleDescription(locale, user.role)}</span></div></td>
      <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[2]}</span><span className="cms-status" data-status={user.status}>{user.status === 'active' ? cmsStatusLabel(locale, user.status) : text('ปิดใช้งาน', 'Disabled')}</span></td>
      <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[3]}</span>{user.lastLoginAt ? <time dateTime={user.lastLoginAt}>{new Intl.DateTimeFormat(cmsDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(user.lastLoginAt))}</time> : text('ไม่เคย', 'Never')}</td>
      <td role="cell"><span className="cms-mobile-field-label" aria-hidden="true">{labels[4]}</span><Link className="cms-icon-button" href={`/cms/users/edit?id=${encodeURIComponent(user.id)}`} aria-label={`${text('แก้ไข', 'Edit')} ${user.name}`}><Edit3 aria-hidden="true" /></Link></td>
    </tr>)}</tbody></table></div> : <div className="cms-empty"><UserRound aria-hidden="true" /><p>{text('ไม่พบผู้ใช้ที่ตรงกับตัวกรอง', 'No users match these filters.')}</p><button className="cms-button-secondary" type="button" onClick={() => { setQuery(''); setRoleFilter(''); setStatusFilter('') }}>{text('ล้างตัวกรอง', 'Clear filters')}</button></div>}
  </section>
}
