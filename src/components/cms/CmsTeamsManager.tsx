'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DragDropProvider, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'
import { GripVertical, LoaderCircle, RefreshCw, Save, Search, UserPlus, UsersRound } from 'lucide-react'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { reorderCmsIdsByIndex } from '@/lib/cms-team-order'
import {
  TEAM_DEPARTMENTS,
  type CmsTeamMemberRecord,
  type CmsTeamRecord,
  type TeamDepartment,
} from '@/lib/team-directory'
import type { CmsTeamDirectorySnapshot } from '@/server/cms/teams'
import { CmsDndSortableLink, cmsSortableCardPlugins } from './CmsDndSortableLink'
import { useCmsLanguage } from './CmsLanguage'
import { useCmsTeamDirtyGuard } from './CmsTeamEditorSupport'
import './CmsTeams.css'

const departmentLabels: Record<TeamDepartment, { th: string; en: string }> = {
  management: { th: 'ฝ่ายบริหาร', en: 'Management' },
  survey: { th: 'ฝ่ายสำรวจ', en: 'Survey' },
  drilling: { th: 'ฝ่ายเจาะ', en: 'Drilling' },
  maintenance: { th: 'ฝ่ายซ่อมบำรุง', en: 'Maintenance' },
  marketing: { th: 'ฝ่ายประชาสัมพันธ์', en: 'Communications' },
}

type ReorderResponse = {
  error?: string
  result?: { revision?: number }
}

function orderedTeams(teams: CmsTeamRecord[]) {
  return [...teams].sort((left, right) =>
    TEAM_DEPARTMENTS.indexOf(left.department) - TEAM_DEPARTMENTS.indexOf(right.department) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  )
}

function teamOrders(teams: CmsTeamRecord[]) {
  return Object.fromEntries(TEAM_DEPARTMENTS.map((department) => [
    department,
    orderedTeams(teams.filter((team) => team.department === department)).map((team) => team.id),
  ])) as Record<TeamDepartment, string[]>
}

function teamOrderSignature(teams: CmsTeamRecord[]) {
  return JSON.stringify(teamOrders(teams))
}

function reorderTeam(teams: CmsTeamRecord[], activeId: string, initialIndex: number, targetIndex: number) {
  const active = teams.find((team) => team.id === activeId)
  if (!active) return teams

  const siblings = orderedTeams(teams.filter((team) => team.department === active.department))
  const siblingIds = siblings.map((team) => team.id)
  const nextIds = reorderCmsIdsByIndex(siblingIds, activeId, initialIndex, targetIndex)
  if (nextIds === siblingIds) return teams
  const order = new Map(nextIds.map((id, position) => [id, position]))
  return orderedTeams(teams.map((team) => team.department === active.department
    ? { ...team, order: order.get(team.id) ?? team.order }
    : team))
}

export default function CmsTeamsManager({
  canWrite,
  initialMessage = '',
  initialSnapshot,
}: {
  canWrite: boolean
  initialMessage?: string
  initialSnapshot: CmsTeamDirectorySnapshot
}) {
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const [teams, setTeams] = useState(() => orderedTeams(initialSnapshot.teams))
  const teamsRef = useRef(teams)
  const [savedOrderSignature, setSavedOrderSignature] = useState(() => teamOrderSignature(initialSnapshot.teams))
  const [revision, setRevision] = useState(initialSnapshot.revision)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState<TeamDepartment | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [orderAnnouncement, setOrderAnnouncement] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const orderAnnouncementRef = useRef<HTMLSpanElement>(null)
  const lastAnnouncedTeamPosition = useRef('')
  const [externalChange, setExternalChange] = useState(false)
  const allowNavigation = useRef(false)
  const orderDirty = teamOrderSignature(teams) !== savedOrderSignature
  const searchHidesTeams = Boolean(query.trim())

  useEffect(() => {
    const changed = () => setExternalChange(true)
    const storage = (event: StorageEvent) => {
      if (event.key === 'sgw-cms-teams-changed') changed()
    }
    window.addEventListener('sgw-cms-teams-changed', changed)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('sgw-cms-teams-changed', changed)
      window.removeEventListener('storage', storage)
    }
  }, [])

  const memberByTeam = useMemo(() => {
    const map = new Map<string, CmsTeamMemberRecord[]>()
    for (const member of initialSnapshot.members) {
      const list = map.get(member.teamId) || []
      list.push(member)
      map.set(member.teamId, list)
    }
    return map
  }, [initialSnapshot.members])

  const visibleTeams = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(th ? 'th' : 'en')
    return teams.filter((team) => {
      if (department !== 'all' && team.department !== department) return false
      if (!term) return true
      const names = [team.name, team.translations.en?.name, team.translations.zh?.name, team.translations.ja?.name]
      return names.some((name) => name?.toLocaleLowerCase().includes(term))
    })
  }, [department, query, teams, th])

  function announceTeamPosition(teamId: string, nextTeams: CmsTeamRecord[]) {
    const team = nextTeams.find((item) => item.id === teamId)
    if (!team) return
    const siblings = orderedTeams(nextTeams.filter((item) => item.department === team.department))
    const position = siblings.findIndex((item) => item.id === teamId) + 1
    setOrderAnnouncement(text(
      `ย้าย ${team.name} ไปตำแหน่ง ${position} จาก ${siblings.length}`,
      `Moved ${team.name} to position ${position} of ${siblings.length}.`
    ))
  }

  function moveTeam(activeId: string, initialIndex: number, targetIndex: number) {
    const next = reorderTeam(teamsRef.current, activeId, initialIndex, targetIndex)
    if (next === teamsRef.current) return
    teamsRef.current = next
    setTeams(next)
    setMessage('')
    announceTeamPosition(activeId, next)
  }

  function startTeamDrag(event: DragStartEvent) {
    const source = event.operation.source
    if (!source) return
    const id = String(source.id)
    const team = teamsRef.current.find((item) => item.id === id)
    lastAnnouncedTeamPosition.current = ''
    setActiveTeamId(id)
    setMessage('')
    if (team) setOrderAnnouncement(text(`กำลังจัดลำดับ ${team.name}`, `Reordering ${team.name}.`))
  }

  function announceTeamDragOver(event: DragOverEvent) {
    const source = event.operation.source
    if (!source || !isSortable(source)) return
    const team = teamsRef.current.find((item) => item.id === String(source.id))
    if (!team || source.group !== team.department) return
    const siblings = orderedTeams(teamsRef.current.filter((item) => item.department === team.department))
    const position = Math.min(Math.max(source.index + 1, 1), siblings.length)
    const key = `${team.id}:${position}`
    if (lastAnnouncedTeamPosition.current === key) return
    lastAnnouncedTeamPosition.current = key
    if (orderAnnouncementRef.current) {
      orderAnnouncementRef.current.textContent = text(
        `${team.name} อยู่ตำแหน่ง ${position} จาก ${siblings.length}`,
        `${team.name} is at position ${position} of ${siblings.length}.`
      )
    }
  }

  function finishTeamDrag(event: DragEndEvent) {
    const source = event.operation.source
    const sortable = source && isSortable(source)
      ? {
          activeId: String(source.id),
          group: source.group,
          initialGroup: source.initialGroup,
          initialIndex: source.initialIndex,
          targetIndex: source.index,
        }
      : null
    setActiveTeamId(null)
    if (!sortable) return
    if (event.canceled) {
      setOrderAnnouncement(text('ยกเลิกการจัดลำดับแล้ว', 'Reordering cancelled.'))
      return
    }
    const active = teamsRef.current.find((team) => team.id === sortable.activeId)
    if (!active || sortable.initialGroup !== sortable.group || sortable.group !== active.department) {
      setOrderAnnouncement(text('ย้ายทีมได้เฉพาะภายในฝ่ายเดิม', 'Teams can only move within their current department.'))
      return
    }
    if (sortable.initialIndex === sortable.targetIndex) {
      setOrderAnnouncement(text('ลำดับทีมไม่เปลี่ยนแปลง', 'Team order unchanged.'))
      return
    }
    moveTeam(sortable.activeId, sortable.initialIndex, sortable.targetIndex)
  }

  useCmsTeamDirtyGuard({
    allowNavigation,
    busy,
    dirty: orderDirty,
    message: busy
      ? text('ระบบกำลังบันทึกลำดับ กรุณารอให้เสร็จก่อนออกจากหน้านี้', 'The order is being saved. Wait before leaving this page.')
      : text('มีลำดับทีมที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่', 'You have an unsaved team order. Leave this page?'),
  })

  async function saveOrder() {
    if (!canWrite || busy || externalChange || !orderDirty || activeTeamId) return
    const operationId = crypto.randomUUID()
    const currentTeams = teamsRef.current
    const orders = teamOrders(currentTeams)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/cms/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          expectedRevision: revision,
          operationId,
          orders,
        }),
      })
      const payload = await response.json().catch(() => ({})) as ReorderResponse
      if (handleCmsUnauthorized(response)) {
        setError(text('เซสชันหมดอายุ เข้าสู่ระบบในแท็บใหม่แล้วโหลดหน้านี้อีกครั้ง', 'Session expired. Sign in in a new tab, then reload this page.'))
        return
      }
      if (!response.ok || typeof payload.result?.revision !== 'number') {
        setError(response.status === 409
          ? text('รายการทีมมีการเปลี่ยนแปลงจากอีกแท็บ โหลดหน้าใหม่ก่อนจัดลำดับอีกครั้ง', 'The directory changed in another tab. Reload before reordering again.')
          : payload.error || text('ไม่สามารถจัดลำดับทีมได้', 'Could not reorder the teams.'))
        return
      }
      setRevision(payload.result.revision)
      setSavedOrderSignature(teamOrderSignature(currentTeams))
      setMessage(text('บันทึกลำดับทีมแล้ว หน้าเว็บไซต์อัปเดตทันที', 'Team order saved and the website was updated.'))
      try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
    } catch {
      setError(text('การเชื่อมต่อขัดข้อง โหลดหน้าใหม่เพื่อตรวจสอบลำดับล่าสุด', 'Connection interrupted. Reload to verify the latest order.'))
    } finally {
      setBusy(false)
    }
  }

  const saveOrderButton = (placement: 'header' | 'footer') => (
    <button
      className="cms-button"
      type="button"
      data-cms-team-save={placement}
      disabled={busy || !orderDirty || externalChange || Boolean(activeTeamId)}
      onClick={() => void saveOrder()}
    >
      {busy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
      {busy ? text('กำลังบันทึกลำดับ...', 'Saving order...') : text('บันทึกลำดับ', 'Save order')}
    </button>
  )

  return (
    <section className="cms-panel cms-team-library" aria-labelledby="team-library-title">
      <header className="cms-panel-header">
        <div>
          <h2 id="team-library-title">{text('รายการทีมงาน', 'Team directory')}</h2>
          <p>{text('จัดการทีม บุคลากร และลำดับที่แสดงในหน้าเกี่ยวกับเรา', 'Manage teams, people, and their display order on the About page.')}</p>
        </div>
        {canWrite && <div className="cms-team-panel-actions">
          {saveOrderButton('header')}
          <a className="cms-button-secondary" href="/cms/teams/new" target="_blank" rel="noopener noreferrer"><UserPlus aria-hidden="true" />{text('เพิ่มทีม', 'New team')}</a>
        </div>}
      </header>

      <div aria-live="polite">
        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error" role="alert">{error}</p> : null}
        {externalChange ? <div className="cms-notice cms-team-refresh-notice"><span>{text('ทีมงานถูกแก้ไขในอีกแท็บ โหลดหน้านี้ใหม่เพื่อดูข้อมูลล่าสุด', 'The directory changed in another tab. Reload to see the latest data.')}</span><button className="cms-button-secondary" type="button" onClick={() => window.location.reload()}><RefreshCw aria-hidden="true" />{text('โหลดข้อมูลล่าสุด', 'Reload latest')}</button></div> : null}
      </div>

      <div className="cms-team-filters">
        <label className="cms-field cms-team-search">
          <span>{text('ค้นหาทีม', 'Search teams')}</span>
          <span className="cms-team-search-control"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} placeholder={text('ชื่อทีมทุกภาษา', 'Team name in any language')} /></span>
        </label>
        <label className="cms-field">
          <span>{text('ฝ่าย', 'Department')}</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value as TeamDepartment | 'all')}>
            <option value="all">{text('ทุกฝ่าย', 'All departments')}</option>
            {TEAM_DEPARTMENTS.map((key) => <option value={key} key={key}>{departmentLabels[key][locale]}</option>)}
          </select>
        </label>
      </div>

      <p className="cms-library-count">{text(`แสดง ${visibleTeams.length} จาก ${teams.length} ทีม`, `Showing ${visibleTeams.length} of ${teams.length} teams`)}</p>
      {canWrite ? <p className="cms-team-order-guide"><GripVertical aria-hidden="true" /><span>{searchHidesTeams
        ? text('ล้างคำค้นหาก่อนจัดลำดับ เพื่อให้เห็นทีมครบทุกทีมในฝ่าย', 'Clear the search before reordering so every team in the department is visible.')
        : text('ลากการ์ดเพื่อจัดลำดับภายในฝ่ายเดียวกัน แล้วกดบันทึกลำดับ บนอุปกรณ์สัมผัสให้กดค้างก่อนลาก ใช้ Tab เลือกการ์ด กด Space และปุ่มลูกศรเพื่อจัดลำดับ หรือกด Enter เพื่อเปิด', 'Drag a card to reorder it within the same department, then select Save order. On touch, press and hold before dragging. Use Tab to focus a card, Space and the arrow keys to reorder, or Enter to open it.')}</span></p> : null}
      <span className="cms-sr-only" id="team-order-instructions">{text('กด Space เพื่อเริ่มหรือจบการจัดลำดับ ใช้ปุ่มลูกศรเพื่อย้าย กด Escape เพื่อยกเลิก หรือกด Enter เพื่อเปิดในแท็บใหม่', 'Press Space to start or finish reordering, use the arrow keys to move, Escape to cancel, or Enter to open in a new tab.')}</span>
      <span ref={orderAnnouncementRef} className="cms-sr-only" aria-live="polite">{orderAnnouncement}</span>

      {visibleTeams.length ? <DragDropProvider plugins={cmsSortableCardPlugins} onDragStart={startTeamDrag} onDragOver={announceTeamDragOver} onDragEnd={finishTeamDrag}>
        <div className="cms-team-grid">
          {visibleTeams.map((team) => {
            const departmentTeams = orderedTeams(teams.filter((candidate) => candidate.department === team.department))
            const position = departmentTeams.findIndex((candidate) => candidate.id === team.id)
            const members = memberByTeam.get(team.id) || []
            const leader = members.find((member) => member.role === 'leader')
            const sortableEnabled = canWrite && !busy && !externalChange && !searchHidesTeams && departmentTeams.length > 1
            return <CmsDndSortableLink
              ariaLabel={sortableEnabled
                ? text(`${team.name} เปิดแก้ไขในแท็บใหม่ หรือกด Space เพื่อจัดลำดับ`, `${team.name}. Open the editor in a new tab, or press Space to reorder.`)
                : text(`${team.name} เปิดในแท็บใหม่`, `${team.name}. Open in a new tab.`)}
              className="cms-team-card cms-team-sortable-card"
              describedBy={sortableEnabled ? 'team-order-instructions' : undefined}
              enabled={sortableEnabled}
              group={team.department}
              href={`/cms/teams/${team.id}`}
              id={team.id}
              index={position}
              key={team.id}
            >
              <div className="cms-team-card-top">
                <span className="cms-team-department">{departmentLabels[team.department][locale]}</span>
                <span className="cms-team-card-order">{text(`ลำดับ ${position + 1}`, `Position ${position + 1}`)}</span>
              </div>
              <div className="cms-team-leader">
                <img
                  src={leader?.imageSrc || '/images/personnel/user.png'}
                  alt=""
                  draggable={false}
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = '/images/personnel/user.png'
                  }}
                />
                <div><span>{text('หัวหน้าทีม', 'Team leader')}</span><strong>{leader?.name || text('ยังไม่มีหัวหน้าทีม', 'No leader yet')}</strong></div>
              </div>
              <div className="cms-team-card-copy">
                <h3>{team.name}</h3>
                <p><UsersRound aria-hidden="true" />{text(`${team.memberCount} คน`, `${team.memberCount} ${team.memberCount === 1 ? 'person' : 'people'}`)}</p>
                <p className="cms-team-translation-summary">{text('คำแปล', 'Translations')}: {(['en', 'zh', 'ja'] as const).filter((key) => team.translations[key]?.name).map((key) => key.toUpperCase()).join(' · ') || text('ภาษาไทยเท่านั้น', 'Thai only')}</p>
              </div>
            </CmsDndSortableLink>
          })}
        </div>
      </DragDropProvider> : <div className="cms-empty"><UsersRound aria-hidden="true" /><p>{text('ไม่พบทีมที่ตรงกับการค้นหา', 'No teams match these filters.')}</p><button className="cms-button-secondary" type="button" onClick={() => { setQuery(''); setDepartment('all') }}>{text('ล้างตัวกรอง', 'Clear filters')}</button></div>}
      {canWrite ? <div className="cms-team-save-actions">{saveOrderButton('footer')}</div> : null}
    </section>
  )
}
