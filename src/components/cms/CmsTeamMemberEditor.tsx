'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Award, ChevronDown, ImagePlus, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { formatImageBytes, prepareTeamPortrait, type PreparedClientImage } from '@/lib/client-image-compression'
import {
  type CmsTeamMemberInput,
  type CmsTeamMemberRecord,
  type CmsTeamMemberTranslations,
  type CmsTeamRecord,
  type TeamContentLocale,
} from '@/lib/team-directory'
import type { CmsStagedMediaUpload } from '@/types/cms-media'
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

const DEFAULT_PORTRAIT = '/images/personnel/user.png'

type MemberForm = CmsTeamMemberInput

type MutationPayload = {
  error?: string
  fields?: Record<string, string>
  item?: CmsTeamMemberRecord | null
  mediaCleanupCompleted?: boolean
  mediaCleanupFailed?: boolean
  operationCommitted?: boolean
  result?: { memberId?: string; revision?: number; teamId?: string }
}

type PendingMemberSave = {
  body: Record<string, unknown>
  method: 'POST' | 'PUT'
  operationId: string
  staged: CmsStagedMediaUpload[]
  submissionId: string
}

const memberSaveRecoveryMaxAgeMs = 6 * 24 * 60 * 60 * 1000
const stagedPortraitRecoveryMaxAgeMs = 25 * 60 * 1000
type PendingRetryExpiry = 'media' | 'receipt' | null

function isPendingMemberSave(value: unknown): value is PendingMemberSave {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const save = value as Partial<PendingMemberSave>
  if (
    (save.method !== 'POST' && save.method !== 'PUT') ||
    typeof save.operationId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(save.operationId) ||
    typeof save.submissionId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(save.submissionId) ||
    !save.body || typeof save.body !== 'object' || Array.isArray(save.body) ||
    save.body.operationId !== save.operationId ||
    !Array.isArray(save.staged) || save.staged.length > 1
  ) return false
  return save.staged.every((item) => Boolean(
    item && typeof item === 'object' &&
    typeof item.token === 'string' && item.token.length <= 8000 &&
    item.asset && typeof item.asset.publicId === 'string' && typeof item.asset.src === 'string'
  ))
}

function nextMemberOrder(teamId: string, members: CmsTeamMemberRecord[]) {
  return Math.max(-1, ...members.filter((member) => member.teamId === teamId).map((member) => member.order)) + 1
}

function emptyTranslation(): Required<CmsTeamMemberTranslations>[TeamContentLocale] {
  return { certificates: [], name: '', title: '' }
}

function cleanCertificates(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function revokePending(image: PreparedClientImage | null) {
  if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl)
}

export default function CmsTeamMemberEditor({
  allMembers,
  canDelete,
  canWrite,
  initialItem,
  initialMessage = '',
  initialRevision,
  initialTeamId,
  teams,
  userId,
}: {
  allMembers: CmsTeamMemberRecord[]
  canDelete: boolean
  canWrite: boolean
  initialItem?: CmsTeamMemberRecord
  initialMessage?: string
  initialRevision: number
  initialTeamId: string
  teams: CmsTeamRecord[]
  userId: string
}) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = (thai: string, english: string) => th ? thai : english
  const initialTeamMembers = allMembers.filter((member) => member.teamId === initialTeamId)
  const initialForm = (): MemberForm => initialItem ? {
    certificates: [...initialItem.certificates],
    imageSrc: initialItem.imageSrc || DEFAULT_PORTRAIT,
    name: initialItem.name,
    order: initialItem.order,
    role: initialItem.role,
    teamId: initialItem.teamId,
    title: initialItem.title,
    translations: initialItem.translations,
  } : {
    certificates: [],
    imageSrc: DEFAULT_PORTRAIT,
    name: '',
    order: nextMemberOrder(initialTeamId, allMembers),
    role: initialTeamMembers.length ? 'member' : 'leader',
    teamId: initialTeamId,
    title: '',
    translations: {},
  }
  const [editingId, setEditingId] = useState(initialItem?.id || '')
  const [form, setForm] = useState<MemberForm>(initialForm)
  const [savedForm, setSavedForm] = useState(() => JSON.stringify(initialForm()))
  const [revision, setRevision] = useState(initialRevision)
  const [pendingImage, setPendingImage] = useState<PreparedClientImage | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [prepareProgress, setPrepareProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saveStage, setSaveStage] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pendingSave, setPendingSave] = useState<PendingMemberSave | null>(null)
  const [pendingSavedAt, setPendingSavedAt] = useState<number | null>(null)
  const [pendingRetryExpiry, setPendingRetryExpiry] = useState<PendingRetryExpiry>(null)
  const [recoveryLoading, setRecoveryLoading] = useState(true)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const allowNavigation = useRef(false)
  const busyRef = useRef(false)
  const recoveryLoaded = useRef(false)
  const pendingStorageKey = `sgw-cms-team-member-save:${userId}:${initialItem?.id || `new:${initialTeamId}`}`
  const dirty = Boolean(pendingImage) || JSON.stringify(form) !== savedForm
  const locked = !canWrite || busy || deleteBusy || preparing || recoveryLoading || Boolean(pendingSave)

  useEffect(() => {
    if (recoveryLoaded.current) return
    recoveryLoaded.current = true
    const stored = readStoredTeamSave(pendingStorageKey, isPendingMemberSave)
    let recoveryError = ''
    let retryExpiry: PendingRetryExpiry = null
    if (stored) {
      const age = Date.now() - stored.savedAt
      retryExpiry = age > memberSaveRecoveryMaxAgeMs
        ? 'receipt'
        : stored.value.staged.length && age > stagedPortraitRecoveryMaxAgeMs ? 'media' : null
      recoveryError = th
        ? retryExpiry === 'receipt'
          ? 'พบคำขอบันทึกเก่าที่ยังไม่ยืนยัน ตรวจสอบผลก่อน และอย่าลองคำขอเดิมหลังช่วงกู้คืน'
          : retryExpiry === 'media'
            ? 'พบคำขอบันทึกที่ยังไม่ยืนยัน ตรวจสอบผลก่อน เพราะภาพเดิมหมดช่วงลองบันทึกซ้ำแล้ว'
            : 'พบคำขอบันทึกที่ยังไม่ยืนยันจากครั้งก่อน กรุณาตรวจสอบผลหรือลองคำขอเดิม'
        : retryExpiry === 'receipt'
          ? 'An older unconfirmed save was restored. Check its result first; do not retry it after the recovery window.'
          : retryExpiry === 'media'
            ? 'An unconfirmed save was restored. Check its result first because the portrait can no longer be retried.'
            : 'An unconfirmed save from this tab was restored. Check its result or retry the same request.'
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (stored) {
        setPendingSave(stored.value)
        setPendingSavedAt(stored.savedAt)
        setPendingRetryExpiry(retryExpiry)
      }
      if (recoveryError) setError(recoveryError)
      setRecoveryLoading(false)
    })
    return () => { cancelled = true }
  }, [pendingStorageKey, th])

  useEffect(() => () => revokePending(pendingImage), [pendingImage])

  useCmsTeamDirtyGuard({
    allowNavigation,
    busy: busy || deleteBusy || preparing,
    dirty,
    message: busy || deleteBusy || preparing
      ? text('ระบบกำลังเตรียมหรือบันทึกภาพ กรุณารอให้เสร็จก่อนออกจากหน้านี้', 'The portrait is being prepared or saved. Wait before leaving this page.')
      : text('มีข้อมูลบุคลากรที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่', 'You have unsaved member changes. Leave this page?'),
  })

  const destinationOthers = useMemo(() => allMembers.filter((member) => member.teamId === form.teamId && member.id !== editingId), [allMembers, editingId, form.teamId])
  const sourceMembers = initialItem ? allMembers.filter((member) => member.teamId === initialItem.teamId) : []
  const anotherLeader = destinationOthers.find((member) => member.role === 'leader')
  const movingProtectedLeader = Boolean(initialItem?.role === 'leader' && initialItem.teamId !== form.teamId && sourceMembers.length > 1)
  const canBeMember = Boolean(anotherLeader)
  const deleteBlocked = Boolean(initialItem?.role === 'leader' && sourceMembers.length > 1)

  function rememberPending(save: PendingMemberSave) {
    setPendingSave(save)
    setPendingRetryExpiry(null)
    setPendingSavedAt(storeTeamSave(pendingStorageKey, save))
  }

  function clearPending() {
    setPendingSave(null)
    setPendingSavedAt(null)
    setPendingRetryExpiry(null)
    clearStoredTeamSave(pendingStorageKey)
  }

  function set<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function translation(language: TeamContentLocale) {
    return form.translations[language] || emptyTranslation()
  }

  function setTranslation(language: TeamContentLocale, next: Required<CmsTeamMemberTranslations>[TeamContentLocale]) {
    const hasContent = Boolean(next.name || next.title || next.certificates.some((value) => value))
    setForm((current) => ({
      ...current,
      translations: { ...current.translations, [language]: hasContent ? next : undefined },
    }))
    setFieldErrors((current) => {
      const copy = { ...current }
      delete copy[`translations.${language}.name`]
      delete copy[`translations.${language}.title`]
      delete copy[`translations.${language}.certificates`]
      return copy
    })
  }

  function updateCertificate(index: number, value: string, language?: TeamContentLocale) {
    if (language) {
      const current = translation(language)
      const certificates = [...current.certificates]
      certificates[index] = value
      setTranslation(language, { ...current, certificates })
      return
    }
    const certificates = [...form.certificates]
    certificates[index] = value
    set('certificates', certificates)
  }

  function addCertificate(language?: TeamContentLocale) {
    if (language) {
      const current = translation(language)
      if (current.certificates.length >= 12) return
      setTranslation(language, { ...current, certificates: [...current.certificates, ''] })
      return
    }
    if (form.certificates.length < 12) set('certificates', [...form.certificates, ''])
  }

  function removeCertificate(index: number, language?: TeamContentLocale) {
    if (language) {
      const current = translation(language)
      setTranslation(language, { ...current, certificates: current.certificates.filter((_, position) => position !== index) })
      return
    }
    set('certificates', form.certificates.filter((_, position) => position !== index))
  }

  function certificateEditor(values: string[], language?: TeamContentLocale) {
    const field = language ? `translations.${language}.certificates` : 'certificates'
    return <div className="cms-field cms-team-certificates cms-field-full">
      <div className="cms-team-certificate-heading"><div><span className="cms-field-label">{text('ใบรับรอง / ความเชี่ยวชาญ', 'Certificates / expertise')}</span><small>{text('เพิ่มได้สูงสุด 12 รายการ รายการที่เว้นว่างจะไม่ถูกบันทึก', 'Up to 12 entries. Blank entries are not saved.')}</small></div><button className="cms-button-secondary" type="button" disabled={locked || values.length >= 12} onClick={() => addCertificate(language)}><Plus aria-hidden="true" />{text('เพิ่มรายการ', 'Add item')}</button></div>
      {values.length ? <div className="cms-team-certificate-list">{values.map((value, index) => <div className="cms-team-certificate-row" key={`${language || 'th'}-${index}`}><Award aria-hidden="true" /><label><span className="cms-sr-only">{text(`รายการที่ ${index + 1}`, `Item ${index + 1}`)}</span><input lang={language ? teamContentLocaleLabels[language].htmlLang : 'th'} maxLength={300} value={value} disabled={locked} onChange={(event) => updateCertificate(index, event.target.value, language)} /></label><button className="cms-icon-button" type="button" disabled={locked} onClick={() => removeCertificate(index, language)} aria-label={text(`ลบรายการที่ ${index + 1}`, `Remove item ${index + 1}`)}><X aria-hidden="true" /></button></div>)}</div> : <p className="cms-team-certificate-empty">{text('ยังไม่มีรายการ', 'No entries yet.')}</p>}
      <TeamFieldError errors={fieldErrors} field={field} />
    </div>
  }

  function portraitError(code: string) {
    const messages: Record<string, { th: string; en: string }> = {
      ANIMATED_IMAGE_TOO_LARGE: { th: 'ไฟล์ GIF แบบเคลื่อนไหวมีขนาดใหญ่เกิน 3.5 MB', en: 'Animated GIF files must be 3.5 MB or smaller.' },
      EMPTY_IMAGE: { th: 'ไฟล์ภาพว่างเปล่า กรุณาเลือกภาพอื่น', en: 'The image is empty. Choose another file.' },
      IMAGE_COMPRESSION_FAILED: { th: 'ย่อขนาดภาพไม่สำเร็จ กรุณาเลือกภาพอื่น', en: 'Could not compress this image. Choose another file.' },
      IMAGE_COMPRESSION_TOO_LARGE: { th: 'ภาพยังมีขนาดใหญ่เกินไปหลังปรับขนาด กรุณาเลือกภาพอื่น', en: 'The image is still too large after resizing. Choose another file.' },
      IMAGE_DECODE_FAILED: { th: 'อ่านไฟล์ภาพไม่ได้ กรุณาเลือกไฟล์ภาพที่สมบูรณ์', en: 'Could not read this image. Choose a valid image file.' },
      TEAM_PORTRAIT_ASPECT_RATIO_INVALID: { th: 'ภาพบุคลากรควรเป็นภาพแนวตั้งหรือสี่เหลี่ยม ไม่ใช่ภาพแนวกว้างหรือแคบมาก', en: 'Use a portrait or square image, not an extremely wide or narrow image.' },
      TEAM_PORTRAIT_RESOLUTION_TOO_LOW: { th: 'ภาพบุคลากรต้องกว้างและสูงอย่างน้อย 480 พิกเซล', en: 'The portrait must be at least 480 pixels wide and high.' },
      UNSUPPORTED_IMAGE_TYPE: { th: 'รองรับเฉพาะ JPG, PNG, WebP, GIF หรือ AVIF', en: 'Use a JPG, PNG, WebP, GIF, or AVIF image.' },
    }
    return text(messages[code]?.th || 'เตรียมภาพไม่สำเร็จ กรุณาเลือกภาพอื่น', messages[code]?.en || 'Could not prepare the portrait. Choose another image.')
  }

  async function choosePortrait(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || locked) return
    setPreparing(true)
    setPrepareProgress(1)
    setError('')
    setMessage('')
    setFieldErrors((current) => {
      const next = { ...current }
      delete next.imageSrc
      return next
    })
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const prepared = await prepareTeamPortrait(file, setPrepareProgress)
      setPendingImage((current) => {
        revokePending(current)
        return prepared
      })
      setMessage(text('เตรียมภาพในเครื่องแล้ว ระบบจะอัปโหลดเมื่อกดบันทึกเท่านั้น', 'Portrait prepared locally. It will upload only when you press Save.'))
    } catch (caught) {
      setError(portraitError(caught instanceof Error ? caught.message : ''))
    } finally {
      setPreparing(false)
      window.setTimeout(() => setPrepareProgress(0), 350)
    }
  }

  function localizeFields(fields?: Record<string, string>) {
    if (!fields || !th) return fields || {}
    return Object.fromEntries(Object.keys(fields).map((field) => [field,
      field === 'name' ? 'กรอกชื่อภาษาไทย ไม่เกิน 160 ตัวอักษร'
        : field === 'title' ? 'ตำแหน่งต้องไม่เกิน 240 ตัวอักษร'
          : field === 'teamId' ? 'เลือกทีม'
            : field === 'role' ? 'ทีมที่มีสมาชิกต้องมีหัวหน้าทีมหนึ่งคน'
              : field === 'order' ? 'ลำดับต้องเป็นเลขจำนวนเต็ม 0–9999'
                : field.includes('certificates') ? 'เพิ่มได้ไม่เกิน 12 รายการ และแต่ละรายการไม่เกิน 300 ตัวอักษร'
                  : field === 'imageSrc' ? 'เลือกภาพบุคลากรหรือใช้ภาพสำรองของระบบ'
                    : field.endsWith('.name') ? 'ชื่อต้องไม่เกิน 160 ตัวอักษร'
                      : 'ข้อความต้องไม่เกินจำนวนที่กำหนด']))
  }

  function cleanInput(imageSrc: string): CmsTeamMemberInput {
    const translations = Object.fromEntries(TEAM_CONTENT_LOCALES.flatMap((language) => {
      const value = translation(language)
      const clean = { certificates: cleanCertificates(value.certificates), name: value.name.trim(), title: value.title.trim() }
      return clean.name || clean.title || clean.certificates.length ? [[language, clean]] : []
    })) as CmsTeamMemberTranslations
    return {
      ...form,
      certificates: cleanCertificates(form.certificates),
      imageSrc,
      name: form.name.trim(),
      title: form.title.trim(),
      translations,
    }
  }

  function validateBeforeUpload() {
    const fields: Record<string, string> = {}
    const name = form.name.trim()
    if (!name || name.length > 160) fields.name = text('กรอกชื่อภาษาไทย ไม่เกิน 160 ตัวอักษร', 'Enter a Thai name of 160 characters or fewer.')
    if (form.title.trim().length > 240) fields.title = text('ตำแหน่งต้องไม่เกิน 240 ตัวอักษร', 'Title must be 240 characters or fewer.')
    if (!teams.some((team) => team.id === form.teamId)) fields.teamId = text('เลือกทีม', 'Choose a team.')
    if (!Number.isInteger(form.order) || form.order < 0 || form.order > 9999) fields.order = text('ลำดับต้องเป็นเลขจำนวนเต็ม 0–9999', 'Order must be a whole number from 0 to 9999.')
    if (form.certificates.length > 12 || form.certificates.some((value) => value.trim().length > 300)) fields.certificates = text('เพิ่มได้ไม่เกิน 12 รายการ และแต่ละรายการไม่เกิน 300 ตัวอักษร', 'Use at most 12 entries of 300 characters or fewer.')
    if (form.role === 'member' && !anotherLeader) fields.role = text('ทีมที่มีสมาชิกต้องมีหัวหน้าทีมหนึ่งคน', 'A non-empty team must have one leader.')
    if (movingProtectedLeader) fields.teamId = text('แต่งตั้งหัวหน้าคนใหม่ให้ทีมเดิมก่อนย้ายหัวหน้าทีมคนนี้', 'Assign a new leader to the current team before moving this leader.')
    for (const language of TEAM_CONTENT_LOCALES) {
      const value = translation(language)
      if (value.name.trim().length > 160) fields[`translations.${language}.name`] = text('ชื่อต้องไม่เกิน 160 ตัวอักษร', 'Name must be 160 characters or fewer.')
      if (value.title.trim().length > 240) fields[`translations.${language}.title`] = text('ตำแหน่งต้องไม่เกิน 240 ตัวอักษร', 'Title must be 240 characters or fewer.')
      if (value.certificates.length > 12 || value.certificates.some((item) => item.trim().length > 300)) fields[`translations.${language}.certificates`] = text('รายการไม่ถูกต้อง', 'Certificate entries are invalid.')
    }
    setFieldErrors(fields)
    return !Object.keys(fields).length
  }

  async function cleanUpStaged(save: PendingMemberSave) {
    // With no portrait there is no rollback evidence that proves the member
    // transaction did not commit, so retain the operation for reconciliation.
    if (!save.staged.length) return false
    try {
      const response = await fetch('/api/cms/team-members/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: save.submissionId, tokens: save.staged.map((item) => item.token) }),
      })
      handleCmsUnauthorized(response)
      const payload = await response.json().catch(() => ({})) as { removed?: string[] }
      const removed = new Set(payload.removed || [])
      return response.ok && save.staged.every(({ asset }) => removed.has(asset.publicId))
    } catch { return false }
  }

  async function reconcile(save: PendingMemberSave): Promise<{ item: CmsTeamMemberRecord | null; revision: number } | null> {
    const receiptResponse = await fetch(`/api/cms/team-members?operationId=${encodeURIComponent(save.operationId)}`, { cache: 'no-store' })
    if (handleCmsUnauthorized(receiptResponse)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
    if (!receiptResponse.ok) throw new Error(text('ตรวจสอบผลการบันทึกไม่ได้ กรุณาลองใหม่', 'Could not check the save result. Try again.'))
    const receipt = await receiptResponse.json().catch(() => ({})) as MutationPayload & { pending?: boolean }
    if (receipt.pending || !receipt.result?.memberId || typeof receipt.result.revision !== 'number') return null
    const response = await fetch(`/api/cms/team-members?id=${encodeURIComponent(receipt.result.memberId)}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({})) as { item?: CmsTeamMemberRecord | null; revision?: number }
    if (response.status === 404 && typeof payload.revision === 'number') return { item: null, revision: payload.revision }
    if (!response.ok) throw new Error(text('บันทึกแล้ว แต่ยังโหลดบุคลากรที่บันทึกไม่ได้ กรุณาลองตรวจสอบอีกครั้ง', 'The save was recorded, but the saved member could not be loaded. Check again.'))
    return payload.item && typeof payload.revision === 'number' ? { item: payload.item, revision: payload.revision } : null
  }

  function acceptReconciled(result: { item: CmsTeamMemberRecord | null; revision: number }) {
    if (result.item) {
      acceptSaved(result.item, result.revision)
      return
    }
    setRevision(result.revision)
    clearPending()
    setMessage('')
    setError(text(
      'คำขอบันทึกสำเร็จแล้ว แต่บุคลากรรายนี้ถูกลบภายหลัง กลับไปหน้าทีมและโหลดข้อมูลล่าสุด',
      'The save completed, but this member was removed afterward. Return to the team and load the latest data.'
    ))
  }

  function acceptSaved(item: CmsTeamMemberRecord, nextRevision: number) {
    const next: MemberForm = {
      certificates: [...item.certificates],
      imageSrc: item.imageSrc || DEFAULT_PORTRAIT,
      name: item.name,
      order: item.order,
      role: item.role,
      teamId: item.teamId,
      title: item.title,
      translations: item.translations,
    }
    revokePending(pendingImage)
    setPendingImage(null)
    setForm(next)
    setSavedForm(JSON.stringify(next))
    setEditingId(item.id)
    setRevision(nextRevision)
    clearPending()
    setFieldErrors({})
    setError('')
    setMessage(text('บันทึกแล้ว เว็บไซต์อัปเดตข้อมูลบุคลากรทันที', 'Saved. This member is now live on the website.'))
    try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event('sgw-cms-teams-changed'))
    if (!initialItem || initialItem.teamId !== item.teamId) {
      allowNavigation.current = true
      router.replace(`/cms/teams/${item.teamId}/members/${item.id}${initialItem ? '?moved=1' : '?created=1'}`)
    }
    router.refresh()
  }

  async function submitSave(save: PendingMemberSave) {
    rememberPending(save)
    try {
      setSaveStage(text('กำลังบันทึกข้อมูล...', 'Saving member...'))
      const response = await fetch('/api/cms/team-members', {
        method: save.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(save.body),
      })
      const payload = await response.json().catch(() => ({})) as MutationPayload
      if (response.ok && payload.item && typeof payload.result?.revision === 'number') {
        acceptSaved(payload.item, payload.result.revision)
        return
      }
      const unauthorized = handleCmsUnauthorized(response)
      const recovered = await reconcile(save).catch(() => null)
      if (recovered) {
        acceptReconciled(recovered)
        return
      }
      if (response.status >= 400 && response.status < 500 && !unauthorized) {
        clearPending()
        if (payload.fields) setFieldErrors(localizeFields(payload.fields))
        setError(response.status === 409
          ? text('ข้อมูลทีมถูกแก้ไขจากอีกแท็บ ข้อมูลที่กรอกยังอยู่ โหลดหน้านี้ใหม่ก่อนบันทึกอีกครั้ง', 'The directory changed in another tab. Your edits remain; reload before saving again.')
          : payload.fields
            ? text('ตรวจสอบช่องที่ระบุแล้วบันทึกอีกครั้ง', 'Correct the highlighted fields and save again.')
            : payload.error || text('บันทึกบุคลากรไม่สำเร็จ', 'Could not save the member.'))
        if (payload.mediaCleanupFailed) setMessage(text('ระบบยังยืนยันการล้างภาพอัปโหลดไม่ได้ ภาพที่ไม่ได้ใช้จะถูกตรวจสอบภายหลัง', 'Portrait cleanup is not confirmed. Unused media will be checked later.'))
        return
      }
      if (unauthorized) {
        const cleaned = await cleanUpStaged(save)
        clearPending()
        setError(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งแล้วกดบันทึก', 'Session expired. Sign in again, then save.'))
        if (save.staged.length && !cleaned) setMessage(text('ภาพอัปโหลดที่ไม่ได้ใช้จะถูกตรวจสอบภายหลัง', 'The unused upload will be checked later.'))
        return
      }
      if (payload.mediaCleanupCompleted && !payload.operationCommitted) {
        clearPending()
        setError(text(
          'ยังบันทึกข้อมูลไม่สำเร็จ ระบบล้างภาพอัปโหลดรอบนี้แล้ว ภาพที่เลือกยังอยู่ กดบันทึกอีกครั้งเมื่อพร้อม',
          'The member was not saved. This attempt\'s upload was removed; your selected image remains, so you can save again.'
        ))
        return
      }
      setError(payload.operationCommitted
        ? text('ข้อมูลอาจบันทึกสำเร็จแล้ว แต่ยังโหลดผลกลับมาไม่ได้ กดตรวจสอบผลอีกครั้ง', 'The save may have committed, but its result could not be loaded. Check the result again.')
        : payload.error || text('ยังยืนยันผลการบันทึกไม่ได้ กดตรวจสอบหรือลองคำขอเดิม', 'The save result is not confirmed. Check or retry the same request.'))
      if (payload.mediaCleanupFailed) {
        setMessage(text('ระบบยังยืนยันการล้างภาพไม่ได้ จึงเก็บคำขอเดิมไว้ให้ตรวจสอบอย่างปลอดภัย', 'Portrait cleanup is not confirmed, so the original request remains available for safe recovery.'))
      }
      return
    } catch (caught) {
      const recovered = await reconcile(save).catch(() => null)
      if (recovered) {
        acceptReconciled(recovered)
        return
      }
      // A failed response can arrive after the portrait upload. Ask the media
      // endpoint to roll back this attempt; its server-side reference check
      // preserves an image if the member transaction actually committed.
      const cleaned = save.staged.length > 0 && await cleanUpStaged(save)
      if (cleaned) clearPending()
      setError((caught instanceof Error ? `${caught.message} ` : '') + (cleaned
        ? text('ยกเลิกภาพอัปโหลดของรอบนี้แล้ว ภาพที่เลือกยังอยู่ กดบันทึกอีกครั้งเมื่อพร้อม', 'This attempt\'s upload was cleaned up. Your selected image remains; save again when ready.')
        : text('ยังกำหนดผลไม่ได้ กดตรวจสอบหรือลองคำขอเดิมอีกครั้ง ระบบจะไม่สร้างรายการซ้ำ', 'The result remains uncertain. Check or retry the same request; it will not create a duplicate.')))
      if (!cleaned) setMessage(text('ระบบยังยืนยันการล้างภาพไม่ได้ จึงเก็บคำขอเดิมไว้ให้ตรวจสอบอย่างปลอดภัย', 'Portrait cleanup is not confirmed, so the original request remains available for safe recovery.'))
    }
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (locked || busyRef.current || pendingSave) return
    setError('')
    setMessage('')
    if (!validateBeforeUpload()) {
      setError(text('ตรวจสอบช่องที่ระบุก่อนอัปโหลดและบันทึก', 'Correct the highlighted fields before upload and save.'))
      return
    }
    busyRef.current = true
    setBusy(true)
    setSaveStage('')
    const submissionId = crypto.randomUUID()
    const staged: CmsStagedMediaUpload[] = []
    try {
      let imageSrc = form.imageSrc || DEFAULT_PORTRAIT
      if (pendingImage) {
        setSaveStage(text('กำลังอัปโหลดภาพบุคลากร...', 'Uploading portrait...'))
        const data = new FormData()
        data.append('file', pendingImage.file)
        data.append('submissionId', submissionId)
        const uploadResponse = await fetch('/api/cms/team-members/media', { method: 'POST', body: data })
        const uploadPayload = await uploadResponse.json().catch(() => ({})) as { error?: string; staged?: CmsStagedMediaUpload }
        if (handleCmsUnauthorized(uploadResponse)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
        if (!uploadResponse.ok || !uploadPayload.staged) throw new Error(uploadPayload.error || text('อัปโหลดภาพไม่สำเร็จ ภาพที่เลือกยังอยู่', 'Portrait upload failed. Your selected image remains.'))
        staged.push(uploadPayload.staged)
        imageSrc = uploadPayload.staged.asset.src
      }
      const operationId = crypto.randomUUID()
      const input = cleanInput(imageSrc)
      const pending: PendingMemberSave = {
        body: {
          expectedRevision: revision,
          id: editingId || undefined,
          input,
          operationId,
          stagedMedia: staged.map((item) => item.token),
          submissionId,
        },
        method: editingId ? 'PUT' : 'POST',
        operationId,
        staged,
        submissionId,
      }
      await submitSave(pending)
    } catch (caught) {
      const cleanupTarget: PendingMemberSave = { body: {}, method: 'POST', operationId: crypto.randomUUID(), staged, submissionId }
      const cleaned = await cleanUpStaged(cleanupTarget)
      setError(caught instanceof Error ? caught.message : text('เตรียมการบันทึกไม่สำเร็จ กรุณาลองใหม่', 'Could not prepare the save. Please try again.'))
      if (staged.length && !cleaned) setMessage(text('ภาพอัปโหลดที่ไม่ได้ใช้จะถูกตรวจสอบภายหลัง', 'The unused upload will be checked later.'))
    } finally {
      busyRef.current = false
      setBusy(false)
      setSaveStage('')
    }
  }

  async function resolvePending(retry: boolean) {
    if (!pendingSave || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const recovered = await reconcile(pendingSave)
      if (recovered) acceptReconciled(recovered)
      else {
        const age = pendingSavedAt === null ? Number.POSITIVE_INFINITY : Date.now() - pendingSavedAt
        const currentExpiry: PendingRetryExpiry = age > memberSaveRecoveryMaxAgeMs
          ? 'receipt'
          : pendingSave.staged.length && age > stagedPortraitRecoveryMaxAgeMs ? 'media' : null
        if (currentExpiry) setPendingRetryExpiry(currentExpiry)
        if (retry && !currentExpiry) await submitSave(pendingSave)
        else if (currentExpiry === 'media') {
        clearPending()
        setError(text('ไม่พบการบันทึกสำเร็จ ภาพเดิมหมดอายุแล้ว กรุณาเลือกภาพและบันทึกใหม่', 'No committed save was found. The old portrait expired; select it again and make a new save.'))
        } else setError(currentExpiry === 'receipt'
        ? text('ไม่พบใบยืนยันที่ยังใช้งานได้ ตรวจสอบทีมว่าบุคลากรถูกสร้างแล้วหรือไม่ก่อนล้างการกู้คืน', 'No active receipt was found. Check the team for this member before clearing recovery.')
        : text('ยังไม่พบผลยืนยัน กดลองคำขอเดิมอีกครั้งเมื่อการเชื่อมต่อพร้อม', 'No confirmed result was found. Retry the same request when connected.'))
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('ตรวจสอบผลไม่ได้ กรุณาลองใหม่', 'Could not check the result. Try again.'))
    } finally { busyRef.current = false; setBusy(false); setSaveStage('') }
  }

  function discardExpiredRecovery() {
    if (pendingRetryExpiry !== 'receipt') return
    const confirmed = window.confirm(text(
      'ล้างคำขอกู้คืนเฉพาะเมื่อคุณตรวจสอบทีมแล้วว่าไม่มีบุคลากรซ้ำ ต้องการดำเนินการต่อหรือไม่',
      'Clear this recovery only after checking the team for a duplicate member. Continue?'
    ))
    if (confirmed) {
      clearPending()
      setError('')
    }
  }

  async function removeMember() {
    if (!initialItem || !canDelete || deleteBlocked || deleteBusy || deleteConfirmation !== initialItem.name) return
    setDeleteBusy(true)
    setError('')
    const operationId = crypto.randomUUID()
    try {
      const response = await fetch('/api/cms/team-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation, expectedRevision: revision, id: initialItem.id, operationId, teamId: initialItem.teamId }),
      })
      const payload = await response.json().catch(() => ({})) as MutationPayload
      if (handleCmsUnauthorized(response)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.'))
      if (!response.ok) {
        setError(response.status === 409
          ? text('ลบไม่ได้ เพราะข้อมูลเปลี่ยนหรือบุคคลนี้ยังเป็นหัวหน้าทีม โหลดหน้าใหม่แล้วตรวจสอบอีกครั้ง', 'Cannot delete because the directory changed or this person is still the required leader. Reload and check again.')
          : payload.error || text('ลบบุคลากรไม่สำเร็จ', 'Could not delete the member.'))
        deleteDialog.current?.close()
        return
      }
      allowNavigation.current = true
      deleteDialog.current?.close()
      try { localStorage.setItem('sgw-cms-teams-changed', String(Date.now())) } catch { /* Storage is optional. */ }
      router.replace(`/cms/teams/${initialItem.teamId}?memberRemoved=1`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text('การเชื่อมต่อขัดข้อง ยังยืนยันการลบไม่ได้', 'Connection interrupted. Deletion is not confirmed.'))
      deleteDialog.current?.close()
    } finally { setDeleteBusy(false) }
  }

  const previewSrc = pendingImage?.previewUrl || form.imageSrc || DEFAULT_PORTRAIT
  const returnTeamId = initialItem?.teamId || initialTeamId

  return <div className="cms-team-editor-layout">
    <form className="cms-editor cms-team-member-editor" onSubmit={(event) => void save(event)}>
      <header className="cms-editor-header">
        <div><a className="cms-back-link" href={`/cms/teams/${returnTeamId}`}><ArrowLeft aria-hidden="true" />{text('กลับไปหน้าทีม', 'Back to team')}</a><h2>{editingId ? text('ข้อมูลบุคลากร', 'Member details') : text('เพิ่มบุคลากร', 'Add team member')}</h2><p>{text('ข้อมูลภาษาไทยเป็นหลัก ภาพจะเตรียมในเครื่องและอัปโหลดเมื่อกดบันทึกเท่านั้น', 'Thai is primary. The portrait is prepared locally and uploaded only on final Save.')}</p></div><span className="cms-team-live-badge">{text('เผยแพร่ทันที', 'Live on save')}</span>
      </header>

      <div aria-live="polite">{message ? <p className="cms-message">{message}</p> : null}{error ? <p className="cms-error" role="alert">{error}</p> : null}</div>
      {saveStage ? <p className="cms-save-stage"><LoaderCircle className="cms-spin" aria-hidden="true" />{saveStage}</p> : null}
      {pendingSave ? <div className="cms-team-recovery"><p>{text('ผลการบันทึกยังไม่ยืนยัน ระบบเก็บรหัสคำขอและภาพที่อัปโหลดไว้เพื่อป้องกันรายการซ้ำ', 'The result is unconfirmed. The request ID and staged portrait are retained to prevent a duplicate.')}</p><div><button className="cms-button-secondary" type="button" disabled={busy} onClick={() => void resolvePending(false)}>{text('ตรวจสอบผล', 'Check result')}</button><button className="cms-button" type="button" disabled={busy || Boolean(pendingRetryExpiry)} onClick={() => void resolvePending(true)}>{text('ลองคำขอเดิม', 'Retry same request')}</button>{pendingRetryExpiry === 'receipt' ? <button className="cms-button-secondary" type="button" disabled={busy} onClick={discardExpiredRecovery}>{text('ล้างหลังตรวจสอบแล้ว', 'Clear after checking')}</button> : null}</div></div> : null}

      <section className="cms-team-form-section" aria-labelledby="portrait-heading">
        <div className="cms-team-section-heading"><div><h3 id="portrait-heading">{text('ภาพบุคลากร', 'Member portrait')}</h3><p>{text('ไม่มีช่อง URL หากภาพเสียหรือยังไม่เลือก ระบบใช้ภาพสำรองโดยอัตโนมัติ', 'There is no URL field. The system fallback is used when no portrait is selected or an image cannot load.')}</p></div></div>
        <div className="cms-team-portrait-editor">
          <div className="cms-team-portrait-preview"><img src={previewSrc} alt={text('ตัวอย่างภาพบุคลากร', 'Member portrait preview')} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_PORTRAIT }} />{pendingImage ? <span>{text('รอบันทึก', 'Pending save')}</span> : null}</div>
          <div className="cms-team-portrait-controls"><input ref={fileInput} className="cms-sr-only" type="file" tabIndex={-1} accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={locked} onChange={(event) => void choosePortrait(event)} /><div className="cms-team-portrait-buttons"><button className="cms-button-secondary" type="button" disabled={locked} onClick={() => fileInput.current?.click()}><ImagePlus aria-hidden="true" />{pendingImage || form.imageSrc !== DEFAULT_PORTRAIT ? text('เปลี่ยนภาพ', 'Replace portrait') : text('เลือกภาพ', 'Choose portrait')}</button></div>
            {preparing || prepareProgress ? <div className="cms-team-image-progress" aria-live="polite"><div><span>{text('กำลังปรับขนาดภาพในเครื่อง', 'Preparing image locally')}</span><strong>{prepareProgress}%</strong></div><progress max={100} value={prepareProgress} /></div> : null}
            {pendingImage ? <p className="cms-field-help">{pendingImage.originalName} · {formatImageBytes(pendingImage.originalBytes)} → {formatImageBytes(pendingImage.file.size)} · {text('ยังไม่ได้อัปโหลด', 'not uploaded yet')}</p> : <p className="cms-field-help">{form.imageSrc === DEFAULT_PORTRAIT ? text('ยังไม่ได้เลือกภาพ เว็บไซต์จะใช้ภาพสำรองอัตโนมัติ', 'No portrait selected. The website will use its fallback automatically.') : text('ภาพนี้บันทึกอยู่ในระบบแล้ว', 'This portrait is already saved.')}</p>}
            <TeamFieldError errors={fieldErrors} field="imageSrc" />
          </div>
        </div>
      </section>

      <section className="cms-team-form-section" aria-labelledby="member-thai-heading">
        <div className="cms-team-section-heading"><div><h3 id="member-thai-heading">{text('ข้อมูลหลักภาษาไทย', 'Primary Thai content')}</h3><p>{text('ชื่อภาษาไทยจำเป็น ตำแหน่งและใบรับรองเว้นว่างได้', 'Thai name is required. Title and certificates are optional.')}</p></div><span>TH</span></div>
        <div className="cms-form-grid">
          <label className="cms-field"><span className="cms-field-label">{text('ทีม', 'Team')} <span className="cms-required" aria-hidden="true">*</span></span><select {...teamFieldProps('teamId', fieldErrors)} required value={form.teamId} disabled={locked} onChange={(event) => {
            const teamId = event.target.value
            const members = allMembers.filter((member) => member.teamId === teamId && member.id !== editingId)
            setForm((current) => ({ ...current, teamId, order: nextMemberOrder(teamId, allMembers), role: members.some((member) => member.role === 'leader') ? 'member' : 'leader' }))
            setFieldErrors((current) => { const next = { ...current }; delete next.teamId; delete next.role; return next })
          }}>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select><TeamFieldError errors={fieldErrors} field="teamId" /></label>
          <fieldset className="cms-field cms-team-role-field" aria-required="true" aria-invalid={Boolean(fieldErrors.role)} aria-describedby={fieldErrors.role ? 'team-role-error' : 'team-role-help'}><legend className="cms-field-label">{text('บทบาท', 'Role')} <span className="cms-required" aria-hidden="true">*</span></legend><div className="cms-team-role-options"><label><input required type="radio" name="member-role" value="leader" checked={form.role === 'leader'} disabled={locked} onChange={() => set('role', 'leader')} /><span>{text('หัวหน้าทีม', 'Team leader')}</span></label><label><input required type="radio" name="member-role" value="member" checked={form.role === 'member'} disabled={locked || !canBeMember} onChange={() => set('role', 'member')} /><span>{text('สมาชิกทีม', 'Team member')}</span></label></div><span className="cms-field-help" id="team-role-help">{anotherLeader ? (form.role === 'leader' ? text(`เมื่อบันทึก ${anotherLeader.name} จะเปลี่ยนเป็นสมาชิกโดยอัตโนมัติ`, `Saving will change ${anotherLeader.name} to a regular member.`) : text(`หัวหน้าทีมปัจจุบัน: ${anotherLeader.name}`, `Current leader: ${anotherLeader.name}`)) : text('ทีมนี้ยังไม่มีหัวหน้าคนอื่น จึงต้องบันทึกบุคคลนี้เป็นหัวหน้าทีม', 'This team has no other leader, so this person must be the leader.')}</span><TeamFieldError errors={fieldErrors} field="role" /></fieldset>
          {movingProtectedLeader ? <p className="cms-notice cms-field-full">{text('ยังย้ายหัวหน้าทีมคนนี้ไม่ได้ เพราะทีมเดิมมีสมาชิกคนอื่น กรุณาแต่งตั้งหัวหน้าคนใหม่ในทีมเดิมก่อน', 'This leader cannot move while the original team has other members. Assign a new leader there first.')}</p> : null}
          <label className="cms-field"><span className="cms-field-label">{text('ชื่อ–นามสกุล (ไทย)', 'Full name (Thai)')} <span className="cms-required" aria-hidden="true">*</span></span><input {...teamFieldProps('name', fieldErrors)} required lang="th" maxLength={160} value={form.name} disabled={locked} onChange={(event) => set('name', event.target.value)} /><TeamFieldError errors={fieldErrors} field="name" /></label>
          <label className="cms-field"><span className="cms-field-label">{text('ตำแหน่ง / หน้าที่ (ไทย)', 'Title / position (Thai)')}</span><input {...teamFieldProps('title', fieldErrors)} lang="th" maxLength={240} value={form.title} disabled={locked} onChange={(event) => set('title', event.target.value)} /><TeamFieldError errors={fieldErrors} field="title" /></label>
          {certificateEditor(form.certificates)}
        </div>
      </section>

      <section className="cms-team-form-section" aria-labelledby="member-languages-heading">
        <div className="cms-team-section-heading"><div><h3 id="member-languages-heading">{text('ภาษาเพิ่มเติม', 'Additional languages')}</h3><p>{text('แต่ละช่องใช้ภาษาที่เลือกก่อน หากว่างจะใช้ภาษาอังกฤษ แล้วจึงภาษาไทย ใบรับรองที่ว่างทั้งชุดจะใช้ชุดสำรอง', 'Each field uses the selected language, then English, then Thai. An empty certificate list falls back as a whole.')}</p></div></div>
        <div className="cms-team-language-stack">{TEAM_CONTENT_LOCALES.map((language) => {
          const labels = teamContentLocaleLabels[language]
          const value = translation(language)
          return <details className="cms-language-section" key={language}><summary><span><strong>{text(labels.content.th, labels.content.en)}</strong><small>{text(labels.fallback.th, labels.fallback.en)}</small></span><ChevronDown aria-hidden="true" /></summary><div className="cms-language-fields">
            <label className="cms-field"><span className="cms-field-label">{text('ชื่อ–นามสกุล', 'Full name')}</span><input {...teamFieldProps(`translations.${language}.name`, fieldErrors)} lang={labels.htmlLang} maxLength={160} value={value.name} disabled={locked} onChange={(event) => setTranslation(language, { ...value, name: event.target.value })} /><TeamFieldError errors={fieldErrors} field={`translations.${language}.name`} /></label>
            <label className="cms-field"><span className="cms-field-label">{text('ตำแหน่ง / หน้าที่', 'Title / position')}</span><input {...teamFieldProps(`translations.${language}.title`, fieldErrors)} lang={labels.htmlLang} maxLength={240} value={value.title} disabled={locked} onChange={(event) => setTranslation(language, { ...value, title: event.target.value })} /><TeamFieldError errors={fieldErrors} field={`translations.${language}.title`} /></label>
            {certificateEditor(value.certificates, language)}
          </div></details>
        })}</div>
      </section>

      <div className="cms-form-actions cms-team-sticky-actions"><a className="cms-button-secondary" href={`/cms/teams/${returnTeamId}`}>{text('ยกเลิก', 'Cancel')}</a>{canWrite ? <button className="cms-button" type="submit" disabled={locked || !dirty || Boolean(pendingSave)}>{busy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : null}{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึกและแสดงผลทันที', 'Save and publish now')}</button> : <p className="cms-notice">{text('บัญชีนี้ดูข้อมูลได้ แต่ไม่มีสิทธิ์แก้ไข', 'This account can view but cannot edit.')}</p>}</div>
    </form>

    {initialItem && canDelete ? <section className="cms-panel cms-team-danger-zone"><div><h2>{text('ลบบุคลากร', 'Delete member')}</h2><p>{deleteBlocked ? text('ต้องแต่งตั้งหัวหน้าคนใหม่ก่อน จึงจะลบหัวหน้าทีมคนปัจจุบันได้', 'Assign a new leader before deleting the current leader.') : text('การลบมีผลทันทีและไม่สามารถย้อนกลับจาก CMS ได้', 'Deletion is immediate and cannot be undone from the CMS.')}</p></div><button className="cms-button-danger" type="button" disabled={busy || Boolean(pendingSave) || deleteBlocked} onClick={() => { setDeleteConfirmation(''); deleteDialog.current?.showModal() }}><Trash2 aria-hidden="true" />{text('ลบบุคลากรคนนี้', 'Delete this member')}</button></section> : null}

    {initialItem ? <dialog ref={deleteDialog} className="cms-confirm-dialog cms-native-confirm cms-team-delete-dialog" aria-labelledby="delete-member-title" aria-describedby="delete-member-description" onCancel={(event) => { event.preventDefault(); if (!deleteBusy) deleteDialog.current?.close() }}><div className="cms-confirm-header"><span className="cms-confirm-icon"><Trash2 aria-hidden="true" /></span><div><h2 id="delete-member-title">{text('ยืนยันการลบบุคลากร', 'Confirm member deletion')}</h2><p id="delete-member-description">{text('พิมพ์ชื่อภาษาไทยให้ตรงทุกตัวอักษร', 'Type the exact Thai member name.')}</p></div><button className="cms-icon-button" type="button" disabled={deleteBusy} onClick={() => deleteDialog.current?.close()} aria-label={text('ปิด', 'Close')}>×</button></div><div className="cms-confirm-warning"><span>{text('ข้อความที่ต้องพิมพ์', 'Required text')}</span><strong className="cms-confirm-phrase">{initialItem.name}</strong></div><label className="cms-field"><span className="cms-field-label">{text('ชื่อภาษาไทย', 'Thai member name')}</span><input autoComplete="off" value={deleteConfirmation} disabled={deleteBusy} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><div className="cms-confirm-actions"><button className="cms-button-secondary" type="button" disabled={deleteBusy} onClick={() => deleteDialog.current?.close()}>{text('ยกเลิก', 'Cancel')}</button><button className="cms-button-danger" type="button" disabled={deleteBusy || deleteBlocked || deleteConfirmation !== initialItem.name} onClick={() => void removeMember()}>{deleteBusy ? <LoaderCircle className="cms-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}{text('ลบบุคลากรถาวร', 'Delete member')}</button></div></dialog> : null}
  </div>
}
