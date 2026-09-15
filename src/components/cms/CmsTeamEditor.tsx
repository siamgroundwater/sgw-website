'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DragDropProvider, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'
import { ArrowLeft, ChevronDown, GripVertical, LoaderCircle, Plus, RefreshCw, Save, Trash2, UserRound, UsersRound } from 'lucide-react'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { reorderCmsMembersByIndex } from '@/lib/cms-team-order'
import {
  TEAM_DEPARTMENTS,
  type CmsTeamInput,
  type CmsTeamMemberRecord,
  type CmsTeamRecord,
  type TeamDepartment,
} from '@/lib/team-directory'
import { CmsDndSortableLink, cmsSortableCardPlugins } from './CmsDndSortableLink'
import { useCmsLanguage } from './CmsLanguage'
import {
  TEAM_CONTENT_LOCALES,
  TeamFieldError,
  clearStoredTeamSave,
  readStoredTeamSave,
  storeTeamSave,
  teamContentLocaleLabels,
  teamFieldProps,
  useCmsTeamDirtyGuard,
} from './CmsTeamEditorSupport'
import './CmsTeams.css'

const departmentLabels: Record<TeamDepartment, { th: string; en: string }> = {
  management: { th: 'ฝ่ายบริหาร', en: 'Management' },
  survey: { th: 'ฝ่ายสำรวจ', en: 'Survey' },
  drilling: { th: 'ฝ่ายเจาะ', en: 'Drilling' },
  maintenance: { th: 'ฝ่ายซ่อมบำรุง', en: 'Maintenance' },
  marketing: { th: 'ฝ่ายประชาสัมพันธ์', en: 'Communications' },
}

type TeamForm = CmsTeamInput

type MutationPayload = {
  error?: string
  fields?: Record<string, string>
  item?: CmsTeamRecord | null
  result?: { revision?: number; teamId?: string }
}

type PendingTeamSave = {
  body: Record<string, unknown>
  method: 'POST' | 'PUT'
  operationId: string
}

const teamSaveRetryMaxAgeMs = 6 * 24 * 60 * 60 * 1000

function isPendingTeamSave(value: unknown): value is PendingTeamSave {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const save = value as Partial<PendingTeamSave>
  return (save.method === 'POST' || save.method === 'PUT') &&
    typeof save.operationId === 'string' &&
    /^[A-Za-z0-9_-]{8,100}$/.test(save.operationId) &&
    Boolean(save.body && typeof save.body === 'object' && !Array.isArray(save.body) && save.body.operationId === save.operationId)
}

function sortMembers(members: CmsTeamMemberRecord[]) {
  return [...members].sort((left, right) =>
    (left.role === 'leader' ? 0 : 1) - (right.role === 'leader' ? 0 : 1) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  )
}

function memberOrderSignature(members: CmsTeamMemberRecord[]) {
  return JSON.stringify(sortMembers(members).map((member) => member.id))
}

function blankTranslations(): CmsTeamInput['translations'] {
  return {}
}

export default function CmsTeamEditor({
  allTeams,
  canDelete,
  canWrite,
  initialItem,
  initialMembers = [],
  initialMessage = '',
  initialRevision,
  userId,
}: {
  allTeams: CmsTeamRecord[]
  canDelete: boolean
  canWrite: boolean
  initialItem?: CmsTeamRecord
  initialMembers?: CmsTeamMemberRecord[]
  initialMessage?: string
  initialRevision: number
  userId: string
}) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const nextOrder = (department: TeamDepartment) => Math.max(
    -1,
    ...allTeams.filter((team) => team.department === department).map((team) => team.order)
  ) + 1
  const initialForm = (): TeamForm => initialItem ? {
    department: initialItem.department,
    name: initialItem.name,
    order: initialItem.order,
    translations: initialItem.translations,
  } : {
    department: 'management',
    name: '',
    order: nextOrder('management'),
    translations: blankTranslations(),
  }
  const [editingId, setEditingId] = useState(initialItem?.id || '')
  const [form, setForm] = useState<TeamForm>(initialForm)
  const [savedForm, setSavedForm] = useState(() => JSON.stringify(initialForm()))
  const [members, setMembers] = useState(() => sortMembers(initialMembers))
  const membersRef = useRef(members)
  const [savedMemberOrderSignature, setSavedMemberOrderSignature] = useState(() => memberOrderSignature(initialMembers))
  const [revision, setRevision] = useState(initialRevision)
  const [busy, setBusy] = useState(false)
  const [memberOrderBusy, setMemberOrderBusy] = useState(false)
  const [message, setMessage] = useState(initialMessage)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pendingSave, setPendingSave] = useState<PendingTeamSave | null>(null)
  const [pendingSavedAt, setPendingSavedAt] = useState<number | null>(null)
  const [pendingRetryExpired, setPendingRetryExpired] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(true)
  const [externalChange, setExternalChange] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [memberOrderAnnouncement, setMemberOrderAnnouncement] = useState('')
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const memberOrderAnnouncementRef = useRef<HTMLSpanElement>(null)
  const lastAnnouncedMemberPosition = useRef('')
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const allowNavigation = useRef(false)
  const busyRef = useRef(false)
  const recoveryLoaded = useRef(false)
  const pendingStorageKey = `sgw-cms-team-save:${userId}:${initialItem?.id || 'new'}`
  const formDirty = JSON.stringify(form) !== savedForm
  const memberOrderDirty = memberOrderSignature(members) !== savedMemberOrderSignature
  const dirty = formDirty || memberOrderDirty
  const locked = !canWrite || busy || deleteBusy || recoveryLoading || Boolean(pendingSave)

  useEffect(() => {
    if (recoveryLoaded.current) return
    recoveryLoaded.current = true
    const stored = readStoredTeamSave(pendingStorageKey, isPendingTeamSave)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (stored) {
        setPendingSave(stored.value)
        setPendingSavedAt(stored.savedAt)
        const retryExpired = Date.now() - stored.savedAt > teamSaveRetryMaxAgeMs
        setPendingRetryExpired(retryExpired)
        setError(th
          ? retryExpired
            ? 'พบคำขอบันทึกเก่าที่ยังไม่ยืนยัน ตรวจสอบผลก่อน และอย่าลองคำขอเดิมหลังช่วงกู้คืน'
            : 'พบคำขอบันทึกที่ยังไม่ยืนยันจากครั้งก่อน กรุณาตรวจสอบผลหรือลองคำขอเดิม'
          : retryExpired
            ? 'An older unconfirmed save was restored. Check its result first; do not retry it after the recovery window.'
            : 'An unconfirmed save from this tab was restored. Check its result or retry the same request.')
      }
      setRecoveryLoading(false)
    })
    return () => { cancelled = true }
  }, [pendingStorageKey, th])

  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (event.key === 'sgw-cms-teams-changed') setExternalChange(true)
    }
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('storage', storage)
    }
  }, [])

  useCmsTeamDirtyGuard({
    allowNavigation,
    busy: busy || deleteBusy,
    dirty,
    message: busy || deleteBusy
      ? text('ระบบกำลังบันทึก กรุณารอให้เสร็จก่อนออกจากหน้านี้', 'A save is in progress. Wait before leaving this page.')
      : text('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่', 'You have unsaved changes. Leave this page?'),
  })

  const orderedMembers = useMemo(() => sortMembers(members), [members])
  const memberSortGroup = `members-${editingId}`

  function announceMemberPosition(memberId: string, nextMembers: CmsTeamMemberRecord[]) {
    const member = nextMembers.find((item) => item.id === memberId)
    if (!member) return
    const siblings = sortMembers(nextMembers)
    const position = siblings.findIndex((item) => item.id === memberId) + 1
    setMemberOrderAnnouncement(text(
      position === 1
        ? `ย้าย ${member.name} ไปตำแหน่งแรก และจะเป็นหัวหน้าทีมเมื่อบันทึก`
        : `ย้าย ${member.name} ไปตำแหน่ง ${position} จาก ${siblings.length}`,
      position === 1
        ? `Moved ${member.name} to the first position. They will become the team leader when saved.`
        : `Moved ${member.name} to position ${position} of ${siblings.length}.`
    ))
  }

  function moveMemberLocally(activeId: string, initialIndex: number, targetIndex: number) {
    const next = reorderCmsMembersByIndex(membersRef.current, activeId, initialIndex, targetIndex)
    if (next === membersRef.current) return
    membersRef.current = next
    setMembers(next)
    setMessage('')
    announceMemberPosition(activeId, next)
  }

  function startMemberDrag(event: DragStartEvent) {
    const source = event.operation.source
    if (!source) return
    const id = String(source.id)
    const member = membersRef.current.find((item) => item.id === id)
    lastAnnouncedMemberPosition.current = ''
    setActiveMemberId(id)
    setMessage('')
    if (member) setMemberOrderAnnouncement(text(`กำลังจัดลำดับ ${member.name}`, `Reordering ${member.name}.`))
  }

  function announceMemberDragOver(event: DragOverEvent) {
    const source = event.operation.source
    if (!source || !isSortable(source) || source.group !== memberSortGroup) return
    const member = membersRef.current.find((item) => item.id === String(source.id))
    if (!member) return
    const siblings = sortMembers(membersRef.current)
    const position = Math.min(Math.max(source.index + 1, 1), siblings.length)
    const key = `${member.id}:${position}`
    if (lastAnnouncedMemberPosition.current === key) return
    lastAnnouncedMemberPosition.current = key
    if (memberOrderAnnouncementRef.current) {
      memberOrderAnnouncementRef.current.textContent = text(
        `${member.name} อยู่ตำแหน่ง ${position} จาก ${siblings.length}`,
        `${member.name} is at position ${position} of ${siblings.length}.`
      )
    }
  }

  function finishMemberDrag(event: DragEndEvent) {
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
    setActiveMemberId(null)
    if (!sortable) return
    if (event.canceled) {
      setMemberOrderAnnouncement(text('ยกเลิกการจัดลำดับแล้ว', 'Reordering cancelled.'))
      return
    }
    if (sortable.initialGroup !== sortable.group || sortable.group !== memberSortGroup) {
      setMemberOrderAnnouncement(text('ย้ายบุคลากรได้เฉพาะภายในทีมเดิม', 'Members can only move within their current team.'))
      return
    }
    if (sortable.initialIndex === sortable.targetIndex) {
      setMemberOrderAnnouncement(text('ลำดับบุคลากรไม่เปลี่ยนแปลง', 'Member order unchanged.'))
      return
    }
    moveMemberLocally(sortable.activeId, sortable.initialIndex, sortable.targetIndex)
  }

  function rememberPending(save: PendingTeamSave) {
    setPendingSave(save)
    setPendingRetryExpired(false)
    setPendingSavedAt(storeTeamSave(pendingStorageKey, save))
  }

  function clearPending() {
    setPendingSave(null)
    setPendingSavedAt(null)
    setPendingRetryExpired(false)
    clearStoredTeamSave(pendingStorageKey)
  }

  function set<K extends keyof TeamForm>(key: K, value: TeamForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function setTranslation(language: (typeof TEAM_CONTENT_LOCALES)[number], value: string) {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [language]: value ? { name: value } : undefined,
      },
    }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[`translations.${language}.name`]
      return next
    })
  }

  function localizedFields(fields?: Record<string, string>) {
    if (!fields) return {}
    if (!th) return fields
    return Object.fromEntries(Object.keys(fields).map((field) => [field,
      field === 'name' ? 'กรอกชื่อทีมภาษาไทย ไม่เกิน 120 ตัวอักษร'
        : field === 'department' ? 'เลือกฝ่ายให้ถูกต้อง'
          : field === 'order' ? 'ลำดับต้องเป็นเลขจำนวนเต็ม 0–9999'
            : 'ข้อความต้องไม่เกิน 120 ตัวอักษร']))
  }

  function acceptSaved(item: CmsTeamRecord, nextRevision: number) {
    const next: TeamForm = {
      department: item.department,
      name: item.name,
      order: item.order,
      translations: item.translations,
    }
    setForm(next)
    setSavedForm(JSON.stringify(next))
    setEditingId(item.id)
    setRevision(nextRevision)
    clearPending()
    setFieldErrors({})
    setError('')
    setMessage(text('บันทึกแล้ว เว็บไซต์อัปเดตข้อมูลนี้ทันที', 'Saved. This team is now live on the website.'))
    try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event('sgw-cms-teams-changed'))
    if (!editingId) {
      allowNavigation.current = true
      router.replace(`/cms/teams/${item.id}?created=1`)
    }
    router.refresh()
  }

  async function reconcile(save: PendingTeamSave) {
    const receiptResponse = await fetch(`/api/cms/teams?operationId=${encodeURIComponent(save.operationId)}`, { cache: 'no-store' })
    if (handleCmsUnauthorized(receiptResponse)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
    if (!receiptResponse.ok) throw new Error(text('ตรวจสอบผลการบันทึกไม่ได้ กรุณาลองใหม่', 'Could not check the save result. Try again.'))
    const receipt = await receiptResponse.json().catch(() => ({})) as MutationPayload & { pending?: boolean }
    const id = receipt.result?.teamId || editingId
    if (!id || receipt.pending || typeof receipt.result?.revision !== 'number') return null
    const itemResponse = await fetch(`/api/cms/teams?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!itemResponse.ok) throw new Error(text('บันทึกแล้ว แต่ยังโหลดทีมที่บันทึกไม่ได้ กรุณาลองตรวจสอบอีกครั้ง', 'The save was recorded, but the saved team could not be loaded. Check again.'))
    const payload = await itemResponse.json().catch(() => ({})) as { item?: CmsTeamRecord | null; revision?: number }
    return payload.item && typeof payload.revision === 'number' ? { item: payload.item, revision: payload.revision } : null
  }

  async function submit(save: PendingTeamSave) {
    rememberPending(save)
    try {
      const response = await fetch('/api/cms/teams', {
        method: save.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(save.body),
      })
      const payload = await response.json().catch(() => ({})) as MutationPayload
      if (handleCmsUnauthorized(response)) {
        setError(text('เซสชันหมดอายุ เข้าสู่ระบบอีกครั้งแล้วลองบันทึกคำขอเดิม', 'Session expired. Sign in again, then retry the same save.'))
        return
      }
      if (response.ok && payload.item && typeof payload.result?.revision === 'number') {
        acceptSaved(payload.item, payload.result.revision)
        return
      }
      const recovered = await reconcile(save).catch(() => null)
      if (recovered) {
        acceptSaved(recovered.item, recovered.revision)
        return
      }
      if (payload.fields) setFieldErrors(localizedFields(payload.fields))
      setError(response.status === 409
        ? text('ข้อมูลทีมถูกแก้ไขจากอีกแท็บ ข้อมูลที่กรอกยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก', 'This team changed in another tab. Your edits remain; reload the latest data before saving.')
        : payload.fields
          ? text('ตรวจสอบช่องที่ระบุแล้วบันทึกอีกครั้ง', 'Correct the highlighted fields and save again.')
          : payload.error || text('ไม่สามารถบันทึกทีมได้ กรุณาลองใหม่', 'Could not save the team. Please try again.'))
      if (response.status >= 400 && response.status < 500) clearPending()
    } catch {
      const recovered = await reconcile(save).catch(() => null)
      if (recovered) acceptSaved(recovered.item, recovered.revision)
      else setError(text('ยังยืนยันผลการบันทึกไม่ได้ กด “ลองบันทึกคำขอเดิม” เพื่อป้องกันรายการซ้ำ', 'The save result is not confirmed. Retry the same request to prevent a duplicate.'))
    }
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (locked || busyRef.current || pendingSave) return
    setError('')
    setMessage('')
    setFieldErrors({})
    const cleanName = form.name.trim()
    const localErrors: Record<string, string> = {}
    if (!cleanName || cleanName.length > 120) localErrors.name = text('กรอกชื่อทีมภาษาไทย ไม่เกิน 120 ตัวอักษร', 'Enter a Thai team name of 120 characters or fewer.')
    if (!Number.isInteger(form.order) || form.order < 0 || form.order > 9999) localErrors.order = text('ลำดับต้องเป็นเลขจำนวนเต็ม 0–9999', 'Order must be a whole number from 0 to 9999.')
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors)
      setError(text('ตรวจสอบช่องที่ระบุก่อนบันทึก', 'Correct the highlighted fields before saving.'))
      return
    }
    const input: CmsTeamInput = {
      ...form,
      name: cleanName,
      translations: Object.fromEntries(Object.entries(form.translations).filter(([, value]) => value?.name.trim()).map(([key, value]) => [key, { name: value?.name.trim() || '' }])),
    }
    const operationId = crypto.randomUUID()
    const pending: PendingTeamSave = {
      body: { expectedRevision: revision, id: editingId || undefined, input, operationId },
      method: editingId ? 'PUT' : 'POST',
      operationId,
    }
    busyRef.current = true
    setBusy(true)
    try { await submit(pending) } finally { busyRef.current = false; setBusy(false) }
  }

  async function resolvePending(retry: boolean) {
    if (!pendingSave || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const recovered = await reconcile(pendingSave)
      if (recovered) acceptSaved(recovered.item, recovered.revision)
      else {
        const retryExpired = pendingRetryExpired || pendingSavedAt === null || Date.now() - pendingSavedAt > teamSaveRetryMaxAgeMs
        if (retryExpired) setPendingRetryExpired(true)
        if (retry && !retryExpired) await submit(pendingSave)
        else setError(retryExpired
        ? text('ไม่พบใบยืนยันที่ยังใช้งานได้ โหลดรายการทีมและตรวจสอบว่ารายการถูกสร้างแล้วหรือไม่ก่อนล้างการกู้คืน', 'No active receipt was found. Reload the team directory and verify whether the item exists before clearing recovery.')
        : text('ยังไม่พบผลยืนยัน กดลองคำขอเดิมเมื่อการเชื่อมต่อพร้อม', 'No confirmed result was found. Retry the same request when connected.'))
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('ตรวจสอบผลไม่ได้ กรุณาลองใหม่', 'Could not check the result. Try again.'))
    } finally { busyRef.current = false; setBusy(false) }
  }

  function discardExpiredRecovery() {
    if (!pendingRetryExpired) return
    const confirmed = window.confirm(text(
      'ล้างคำขอกู้คืนเฉพาะเมื่อคุณตรวจสอบรายการทีมแล้วว่าไม่มีข้อมูลซ้ำ ต้องการดำเนินการต่อหรือไม่',
      'Clear this recovery only after checking the team directory for duplicates. Continue?'
    ))
    if (confirmed) {
      clearPending()
      setError('')
    }
  }

  async function saveMemberOrder() {
    if (!editingId || locked || externalChange || !memberOrderDirty || activeMemberId || busyRef.current) return
    const next = sortMembers(membersRef.current)
    const operationId = crypto.randomUUID()
    busyRef.current = true
    setBusy(true)
    setMemberOrderBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/cms/team-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', expectedRevision: revision, ids: next.map((item) => item.id), operationId, teamId: editingId }),
      })
      const payload = await response.json().catch(() => ({})) as MutationPayload
      if (handleCmsUnauthorized(response)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
      if (!response.ok || typeof payload.result?.revision !== 'number') {
        setError(response.status === 409
          ? text('รายชื่อมีการเปลี่ยนจากอีกแท็บ โหลดหน้าใหม่ก่อนจัดลำดับ', 'The member list changed in another tab. Reload before reordering.')
          : payload.error || text('จัดลำดับสมาชิกไม่สำเร็จ', 'Could not reorder members.'))
        return
      }
      setRevision(payload.result.revision)
      setSavedMemberOrderSignature(memberOrderSignature(next))
      setMessage(text('บันทึกลำดับและอัปเดตหัวหน้าทีมแล้ว', 'Member order and team leader saved.'))
      try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('การเชื่อมต่อขัดข้อง โหลดหน้าใหม่เพื่อตรวจสอบลำดับ', 'Connection interrupted. Reload to verify the order.'))
    } finally { busyRef.current = false; setBusy(false); setMemberOrderBusy(false) }
  }

  async function removeTeam() {
    if (!initialItem || !canDelete || deleteBusy || deleteConfirmation !== initialItem.name || members.length) return
    setDeleteBusy(true)
    setError('')
    const operationId = crypto.randomUUID()
    try {
      const response = await fetch('/api/cms/teams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation, expectedRevision: revision, id: initialItem.id, operationId }),
      })
      const payload = await response.json().catch(() => ({})) as MutationPayload
      if (handleCmsUnauthorized(response)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
      if (!response.ok) {
        setError(response.status === 409
          ? text('ลบไม่ได้ เพราะข้อมูลเปลี่ยนหรือทีมยังมีสมาชิก โหลดหน้าใหม่แล้วตรวจสอบอีกครั้ง', 'Cannot delete because the directory changed or this team still has members. Reload and check again.')
          : payload.error || text('ลบทีมไม่สำเร็จ', 'Could not delete the team.'))
        deleteDialog.current?.close()
        return
      }
      allowNavigation.current = true
      deleteDialog.current?.close()
      try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
      router.replace('/cms/teams?removed=1')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('การเชื่อมต่อขัดข้อง ยังยืนยันการลบไม่ได้', 'Connection interrupted. Deletion is not confirmed.'))
      deleteDialog.current?.close()
    } finally { setDeleteBusy(false) }
  }

  return <div className="cms-team-editor-layout">
    <form className="cms-editor cms-team-editor" onSubmit={(event) => void save(event)}>
      <header className="cms-editor-header">
        <div>
          <a className="cms-back-link" href="/cms/teams"><ArrowLeft aria-hidden="true" />{text('กลับไปรายการทีม', 'Back to teams')}</a>
          <h2>{editingId ? text('ข้อมูลทีม', 'Team details') : text('สร้างทีมใหม่', 'Create a team')}</h2>
          <p>{text('ภาษาไทยเป็นข้อมูลหลัก ช่องภาษาอื่นเว้นว่างได้ และข้อมูลที่บันทึกจะแสดงบนเว็บไซต์ทันที', 'Thai is the primary content. Other languages are optional, and saved changes go live immediately.')}</p>
        </div>
        <span className="cms-team-live-badge">{text('เผยแพร่ทันที', 'Live on save')}</span>
      </header>

      <div aria-live="polite">
        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error" role="alert">{error}</p> : null}
      </div>
      {externalChange ? <div className="cms-notice cms-team-refresh-notice"><span>{text('ทีมงานถูกแก้ไขในอีกแท็บ โหลดข้อมูลล่าสุดก่อนบันทึกหรือจัดลำดับต่อ', 'The directory changed in another tab. Reload the latest data before saving or reordering.')}</span><button className="cms-button-secondary" type="button" onClick={() => window.location.reload()}><RefreshCw aria-hidden="true" />{text('โหลดข้อมูลล่าสุด', 'Reload latest')}</button></div> : null}
      {pendingSave ? <div className="cms-team-recovery"><p>{text('ระบบเก็บรหัสคำขอเดิมไว้ เพื่อไม่ให้สร้างทีมซ้ำ', 'The original request ID is retained to prevent a duplicate team.')}</p><div><button className="cms-button-secondary" type="button" disabled={busy} onClick={() => void resolvePending(false)}>{text('ตรวจสอบผล', 'Check result')}</button><button className="cms-button" type="button" disabled={busy || pendingRetryExpired} onClick={() => void resolvePending(true)}>{text('ลองคำขอเดิม', 'Retry same request')}</button>{pendingRetryExpired ? <button className="cms-button-secondary" type="button" disabled={busy} onClick={discardExpiredRecovery}>{text('ล้างหลังตรวจสอบแล้ว', 'Clear after checking')}</button> : null}</div></div> : null}

      <section className="cms-team-form-section" aria-labelledby="team-thai-heading">
        <div className="cms-team-section-heading"><div><h3 id="team-thai-heading">{text('ข้อมูลหลักภาษาไทย', 'Primary Thai content')}</h3><p>{text('ชื่อทีมภาษาไทยจำเป็นต่อการบันทึกและการยืนยันเมื่อลบทีม', 'The Thai name is required for saving and exact-name deletion.')}</p></div><span>TH</span></div>
        <div className="cms-form-grid">
          <label className="cms-field"><span className="cms-field-label">{text('ฝ่าย', 'Department')} <span className="cms-required" aria-hidden="true">*</span></span><select {...teamFieldProps('department', fieldErrors)} required value={form.department} disabled={locked} onChange={(event) => {
            const department = event.target.value as TeamDepartment
            setForm((current) => ({ ...current, department, order: current.department === department ? current.order : nextOrder(department) }))
          }}>{TEAM_DEPARTMENTS.map((department) => <option value={department} key={department}>{departmentLabels[department][locale]}</option>)}</select><TeamFieldError errors={fieldErrors} field="department" /></label>
          <label className="cms-field"><span className="cms-field-label">{text('ชื่อทีม (ไทย)', 'Team name (Thai)')} <span className="cms-required" aria-hidden="true">*</span></span><input {...teamFieldProps('name', fieldErrors)} required lang="th" maxLength={120} value={form.name} disabled={locked} onChange={(event) => set('name', event.target.value)} /><TeamFieldError errors={fieldErrors} field="name" /></label>
        </div>
      </section>

      <section className="cms-team-form-section" aria-labelledby="team-language-heading">
        <div className="cms-team-section-heading"><div><h3 id="team-language-heading">{text('ภาษาเพิ่มเติม', 'Additional languages')}</h3><p>{text('หน้าเว็บไซต์เลือกข้อความตามภาษา แล้วใช้ภาษาอังกฤษ และภาษาไทยตามลำดับเมื่อช่องว่าง', 'The website uses the selected language, then English, then Thai when a field is empty.')}</p></div></div>
        <div className="cms-team-language-stack">
          {TEAM_CONTENT_LOCALES.map((language) => {
            const labels = teamContentLocaleLabels[language]
            const field = `translations.${language}.name`
            return <details className="cms-language-section" key={language}>
              <summary><span><strong>{text(labels.content.th, labels.content.en)}</strong><small>{text(labels.fallback.th, labels.fallback.en)}</small></span><ChevronDown aria-hidden="true" /></summary>
              <div className="cms-language-fields">
                <label className="cms-field cms-field-full"><span className="cms-field-label">{text('ชื่อทีม', 'Team name')}</span><input {...teamFieldProps(field, fieldErrors)} lang={labels.htmlLang} maxLength={120} value={form.translations[language]?.name || ''} disabled={locked} onChange={(event) => setTranslation(language, event.target.value)} /><TeamFieldError errors={fieldErrors} field={field} /></label>
              </div>
            </details>
          })}
        </div>
      </section>

      <div className="cms-form-actions cms-team-sticky-actions">
        <a className="cms-button-secondary" href="/cms/teams">{text('ยกเลิก', 'Cancel')}</a>
        {canWrite ? <button className="cms-button" type="submit" disabled={locked || !formDirty}>{busy && !memberOrderBusy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : null}{busy && !memberOrderBusy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกและแสดงผลทันที', 'Save and publish now')}</button> : <p className="cms-notice">{text('บัญชีนี้ดูข้อมูลได้ แต่ไม่มีสิทธิ์แก้ไข', 'This account can view but cannot edit.')}</p>}
      </div>
    </form>

    {editingId ? <section className="cms-panel cms-team-members-panel" aria-labelledby="team-members-heading">
      <header className="cms-panel-header"><div><h2 id="team-members-heading">{text('บุคลากรในทีม', 'Team members')}</h2><p>{text(`${members.length} คน · การ์ดลำดับแรกคือหัวหน้าทีม`, `${members.length} people · The first card is the team leader.`)}</p></div>{canWrite ? <div className="cms-team-panel-actions"><button className="cms-button" type="button" disabled={locked || externalChange || !memberOrderDirty || Boolean(activeMemberId)} onClick={() => void saveMemberOrder()}>{memberOrderBusy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{memberOrderBusy ? text('กำลังบันทึกลำดับ...', 'Saving order...') : text('บันทึกลำดับ', 'Save order')}</button><a className="cms-button-secondary" href={`/cms/teams/${editingId}/members/new`} target="_blank" rel="noopener noreferrer"><Plus aria-hidden="true" />{text('เพิ่มบุคลากร', 'Add member')}</a></div> : null}</header>
      {canWrite && orderedMembers.length ? <p className="cms-team-order-guide"><GripVertical aria-hidden="true" /><span>{text('ลากการ์ดบุคลากรเพื่อจัดลำดับ แล้วกดบันทึกลำดับ การ์ดแรกจะเป็นหัวหน้าทีมและระบบจะอัปเดตบทบาทให้อัตโนมัติ บนอุปกรณ์สัมผัสให้กดค้างก่อนลาก ใช้ Tab เลือกการ์ด กด Space และปุ่มลูกศรเพื่อจัดลำดับ หรือกด Enter เพื่อเปิด', 'Drag any member card to reorder it, then select Save order. The first card becomes the team leader and roles update automatically. On touch, press and hold before dragging. Use Tab to focus a card, Space and the arrow keys to reorder, or Enter to open it.')}</span></p> : null}
      <span className="cms-sr-only" id="member-order-instructions">{text('กด Space เพื่อเริ่มหรือจบการจัดลำดับ ใช้ปุ่มลูกศรเพื่อย้าย กด Escape เพื่อยกเลิก หรือกด Enter เพื่อเปิดในแท็บใหม่', 'Press Space to start or finish reordering, use the arrow keys to move, Escape to cancel, or Enter to open in a new tab.')}</span>
      <span ref={memberOrderAnnouncementRef} className="cms-sr-only" aria-live="polite">{memberOrderAnnouncement}</span>
      {orderedMembers.length ? <DragDropProvider plugins={cmsSortableCardPlugins} onDragStart={startMemberDrag} onDragOver={announceMemberDragOver} onDragEnd={finishMemberDrag}>
        <div className="cms-team-member-grid">{orderedMembers.map((member) => {
          const memberPosition = orderedMembers.findIndex((item) => item.id === member.id)
          const sortableEnabled = canWrite && !locked && !externalChange && orderedMembers.length > 1
          return <CmsDndSortableLink
            ariaLabel={sortableEnabled
              ? text(`${member.name} เปิดแก้ไขในแท็บใหม่ หรือกด Space เพื่อจัดลำดับ`, `${member.name}. Open the editor in a new tab, or press Space to reorder.`)
              : text(`${member.name} เปิดในแท็บใหม่`, `${member.name}. Open in a new tab.`)}
            className="cms-team-member-card cms-team-sortable-card"
            describedBy={sortableEnabled ? 'member-order-instructions' : undefined}
            enabled={sortableEnabled}
            group={memberSortGroup}
            href={`/cms/teams/${editingId}/members/${member.id}`}
            id={member.id}
            index={Math.max(0, memberPosition)}
            key={member.id}
          >
            <img src={member.imageSrc || '/images/personnel/user.png'} alt="" draggable={false} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/personnel/user.png' }} />
            <div className="cms-team-member-copy"><div className="cms-team-member-title-row"><h3>{member.name}</h3><span data-role={member.role}>{member.role === 'leader' ? text('หัวหน้าทีม', 'Leader') : text('สมาชิก', 'Member')}</span></div><p>{member.title || text('ยังไม่ระบุตำแหน่ง', 'No title')}</p></div>
          </CmsDndSortableLink>
        })}</div>
      </DragDropProvider> : <div className="cms-empty cms-team-empty"><UsersRound aria-hidden="true" /><p>{text('ทีมนี้ยังไม่มีบุคลากร เพิ่มคนแรกเป็นหัวหน้าทีม', 'This team has no members. Add its first person as the team leader.')}</p>{canWrite ? <a className="cms-button" href={`/cms/teams/${editingId}/members/new`} target="_blank" rel="noopener noreferrer"><UserRound aria-hidden="true" />{text('เพิ่มบุคลากรคนแรก', 'Add the first person')}</a> : null}</div>}
    </section> : null}

    {initialItem && canDelete ? <section className="cms-panel cms-team-danger-zone"><div><h2>{text('ลบทีม', 'Delete team')}</h2><p>{members.length ? text('ต้องย้ายหรือลบบุคลากรทุกคนก่อน จึงจะลบทีมได้', 'Move or delete every member before deleting this team.') : text('การลบมีผลทันทีและไม่สามารถย้อนกลับจาก CMS ได้', 'Deletion is immediate and cannot be undone from the CMS.')}</p></div><button className="cms-button-danger" type="button" disabled={busy || Boolean(pendingSave) || Boolean(members.length)} onClick={() => { setDeleteConfirmation(''); deleteDialog.current?.showModal() }}><Trash2 aria-hidden="true" />{text('ลบทีมนี้', 'Delete this team')}</button></section> : null}

    {initialItem ? <dialog ref={deleteDialog} className="cms-confirm-dialog cms-native-confirm cms-team-delete-dialog" aria-labelledby="delete-team-title" aria-describedby="delete-team-description" onCancel={(event) => { event.preventDefault(); if (!deleteBusy) deleteDialog.current?.close() }}>
      <div className="cms-confirm-header"><span className="cms-confirm-icon"><Trash2 aria-hidden="true" /></span><div><h2 id="delete-team-title">{text('ยืนยันการลบทีม', 'Confirm team deletion')}</h2><p id="delete-team-description">{text('พิมพ์ชื่อทีมภาษาไทยให้ตรงทุกตัวอักษร', 'Type the exact Thai team name.')}</p></div><button className="cms-icon-button" type="button" disabled={deleteBusy} onClick={() => deleteDialog.current?.close()} aria-label={text('ปิด', 'Close')}>×</button></div>
      <div className="cms-confirm-warning"><span>{text('ข้อความที่ต้องพิมพ์', 'Required text')}</span><strong className="cms-confirm-phrase">{initialItem.name}</strong></div>
      <label className="cms-field"><span className="cms-field-label">{text('ชื่อทีมภาษาไทย', 'Thai team name')}</span><input autoComplete="off" value={deleteConfirmation} disabled={deleteBusy} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>
      <div className="cms-confirm-actions"><button className="cms-button-secondary" type="button" disabled={deleteBusy} onClick={() => deleteDialog.current?.close()}>{text('ยกเลิก', 'Cancel')}</button><button className="cms-button-danger" type="button" disabled={deleteBusy || deleteConfirmation !== initialItem.name || Boolean(members.length)} onClick={() => void removeTeam()}>{deleteBusy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{text('ลบทีมถาวร', 'Delete team')}</button></div>
    </dialog> : null}
  </div>
}
