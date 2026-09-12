'use client'

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, Eye, LoaderCircle, MapPin, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import {
  CMS_PROJECT_CATEGORIES,
  CMS_PROJECT_TRANSLATION_LOCALES,
  CMS_PROJECT_WORK_TYPES,
  type CmsProjectCategory,
  type CmsProjectInput,
  type CmsProjectRecord,
  type CmsProjectTranslation,
  type CmsProjectTranslationLocale,
  type CmsProjectWorkType,
} from '@/types/cms'
import type { CmsStagedMediaUpload } from '@/types/cms-media'
import { cmsProjectCategoryLabel, cmsProjectWorkTypeLabel, localizeCmsFieldErrors } from '@/lib/cms-locale'
import { CMS_PROJECT_MAX_GALLERY_IMAGES, validateProjectForSave, validateProjectInput } from '@/lib/cms-validation'
import { handleCmsUnauthorized } from '@/lib/cms-client'
import { hasRecoverableProjectShape, orderedProjectImages, reconnectProjectImageDescriptions, thaiProjectContentHash, translationCompletion, type RecoverableProjectImage } from '@/lib/cms-project-editor'
import './CmsProjectEditor.css'
import type { PreparedClientImage } from '@/lib/client-image-compression'
import CmsDeferredProjectImages from './CmsDeferredProjectImages'
import { useCmsLanguage } from './CmsLanguage'

type ProjectEditorSource = CmsProjectInput & { updatedAt: string }

type ProjectEditorForm = Omit<ProjectEditorSource, 'translations'> & {
  translations: Record<CmsProjectTranslationLocale, CmsProjectTranslation>
}

const blankProject: ProjectEditorForm = {
  category: ['other'],
  coverImage: '',
  details: [''],
  galleryImages: [],
  lat: null,
  lng: null,
  location: '',
  slug: '',
  status: 'active',
  summary: '',
  title: '',
  translations: {
    en: { details: [''], location: '', summary: '', title: '' },
    ja: { details: [''], location: '', summary: '', title: '' },
    zh: { details: [''], location: '', summary: '', title: '' },
  },
  updatedAt: '',
  workTypes: [],
  year: new Date().getFullYear(),
}

const categoryValues: CmsProjectCategory[] = [...CMS_PROJECT_CATEGORIES]
const workTypeValues: CmsProjectWorkType[] = [...CMS_PROJECT_WORK_TYPES]
const translationLabels: Record<
  CmsProjectTranslationLocale,
  {
    content: { th: string; en: string }
    fallback: { th: string; en: string }
    htmlLang: string
    language: { th: string; en: string }
    section: { th: string; en: string }
  }
> = {
  en: {
    content: { th: 'เนื้อหาภาษาอังกฤษ', en: 'English content' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่าง เว็บไซต์จะแสดงภาษาไทย', en: 'Optional. Empty fields fall back to Thai.' },
    htmlLang: 'en',
    language: { th: 'อังกฤษ', en: 'English' },
    section: { th: 'ส่วนภาษาอังกฤษ', en: 'English section' },
  },
  zh: {
    content: { th: 'เนื้อหาภาษาจีนตัวย่อ', en: 'Simplified Chinese content' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่าง เว็บไซต์จะแสดงภาษาอังกฤษ แล้วจึงภาษาไทย', en: 'Optional. Empty fields fall back to English, then Thai.' },
    htmlLang: 'zh-CN',
    language: { th: 'จีนตัวย่อ', en: 'Simplified Chinese' },
    section: { th: 'ส่วนภาษาจีนตัวย่อ', en: 'Simplified Chinese section' },
  },
  ja: {
    content: { th: 'เนื้อหาภาษาญี่ปุ่น', en: 'Japanese content' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่าง เว็บไซต์จะแสดงภาษาอังกฤษ แล้วจึงภาษาไทย', en: 'Optional. Empty fields fall back to English, then Thai.' },
    htmlLang: 'ja',
    language: { th: 'ญี่ปุ่น', en: 'Japanese' },
    section: { th: 'ส่วนภาษาญี่ปุ่น', en: 'Japanese section' },
  },
}

function withDefaultTranslation(translation?: CmsProjectTranslation): CmsProjectTranslation {
  return {
    details: Array.isArray(translation?.details) && translation.details.length ? translation.details : [''],
    location: translation?.location || '',
    summary: translation?.summary || '',
    title: translation?.title || '',
  }
}

function withDefaultDetailSections(item: ProjectEditorSource): ProjectEditorForm {
  return {
    ...item,
    galleryImages: Array.from(new Set(item.galleryImages)),
    details: item.details.length ? item.details : [''],
    translations: {
      en: withDefaultTranslation(item.translations.en),
      ja: withDefaultTranslation(item.translations.ja),
      zh: withDefaultTranslation(item.translations.zh),
    },
  }
}

function slugify(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '-').replace(/[/?#\\]/g, '').replace(/-+/g, '-')
}

function DetailedSectionsEditor({
  addLabel,
  disabled,
  emptyLabel,
  idPrefix,
  label,
  language,
  onChange,
  removeLabel,
  sectionLabel,
  values,
}: {
  addLabel: string
  disabled: boolean
  emptyLabel: string
  idPrefix: string
  label: string
  language?: string
  onChange: (values: string[]) => void
  removeLabel: string
  sectionLabel: string
  values: string[]
}) {
  function updateSection(index: number, value: string) {
    onChange(values.map((section, sectionIndex) => sectionIndex === index ? value : section))
  }

  function removeSection(index: number) {
    onChange(values.filter((_, sectionIndex) => sectionIndex !== index))
  }

  return (
    <fieldset className="cms-field cms-field-full cms-detail-sections">
      <legend>{label}</legend>
      <span className="cms-field-counter">{values.length}/80</span>
      {values.length ? <div className="cms-detail-section-list">{values.map((value, index) => (
        <div className="cms-detail-section" key={index}>
          <div className="cms-detail-section-header">
            <label htmlFor={`${idPrefix}-${index}`}>{sectionLabel} {index + 1}</label>
            <button className="cms-detail-section-remove" type="button" onClick={() => removeSection(index)} disabled={disabled} aria-label={`${removeLabel} ${index + 1}`}>
              <Trash2 aria-hidden="true" />{removeLabel}
            </button>
          </div>
          <textarea id={`${idPrefix}-${index}`} lang={language} maxLength={6000} value={value} onChange={(event) => updateSection(index, event.target.value)} disabled={disabled} />
          <span className="cms-field-counter">{value.length}/6000</span>
        </div>
      ))}</div> : <p className="cms-detail-sections-empty">{emptyLabel}</p>}
      <button className="cms-button-secondary cms-add-section" type="button" onClick={() => onChange([...values, ''])} disabled={disabled || values.length >= 80}>
        <Plus aria-hidden="true" />{addLabel}
      </button>
    </fieldset>
  )
}

function PillMultiSelect<T extends string>({
  disabled,
  error,
  exclusiveValue,
  label,
  onChange,
  options,
  optionLabel,
  required = false,
  values,
}: {
  disabled: boolean
  error?: string
  exclusiveValue?: T
  label: string
  onChange: (values: T[]) => void
  options: readonly T[]
  optionLabel: (option: T) => string
  required?: boolean
  values: T[]
}) {
  const errorId = useId()
  function toggle(option: T) {
    if (exclusiveValue && option === exclusiveValue) {
      onChange(values.includes(option) ? [] : [option])
      return
    }
    const withoutExclusive = exclusiveValue ? values.filter((value) => value !== exclusiveValue) : values
    onChange(withoutExclusive.includes(option)
      ? withoutExclusive.filter((value) => value !== option)
      : [...withoutExclusive, option])
  }

  return (
    <fieldset className="cms-field cms-pill-field" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>
      <legend>{label}{required ? <span className="cms-required" aria-hidden="true">*</span> : null}</legend>
      <div className="cms-pill-options">
        {options.map((option) => {
          const selected = values.includes(option)
          return <button className={`cms-select-pill${selected ? ' is-selected' : ''}`} type="button" key={option} aria-pressed={selected} onClick={() => toggle(option)} disabled={disabled}>{optionLabel(option)}</button>
        })}
      </div>
      {error ? <span id={errorId} className="cms-field-error">{error}</span> : null}
    </fieldset>
  )
}

const LocationMap = dynamic(() => import('./CmsProjectLocationMap'), { ssr: false })

type SaveRequest = CmsProjectInput & {
  id?: string
  expectedUpdatedAt?: string
  operationId: string
  sourceProjectId?: string
  submissionId: string
  stagedMedia: string[]
}
type PendingSave = { request: SaveRequest; staged: CmsStagedMediaUpload[]; method: 'POST' | 'PUT' }
type Recovery = { form: ProjectEditorForm; galleryOrder?: string[]; previousEdits?: ProjectEditorForm | null; pendingImages?: RecoverableProjectImage[]; pendingNames: string[]; savedAt: number; pendingSave: PendingSave | null }
type SavePayload = { error?: string; fields?: Record<string, string>; item?: CmsProjectRecord | null; publicRefreshPending?: boolean }

export default function CmsProjectEditor({
  canWrite,
  initialItem,
  sourceItem,
  userId,
  initialMessage = '',
}: {
  canWrite: boolean
  initialItem?: CmsProjectRecord
  sourceItem?: CmsProjectRecord
  userId: string
  initialMessage?: string
}) {
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const th = locale === 'th'
  const text = useCallback((thai: string, english: string) => th ? thai : english, [th])
  const initialForm = () => withDefaultDetailSections(initialItem || (sourceItem ? { ...sourceItem, slug: sourceItem.slug + '-copy', status: 'active', updatedAt: '' } : blankProject))
  const [editingId, setEditingId] = useState(initialItem?.id || null)
  const [form, setForm] = useState<ProjectEditorForm>(initialForm)
  const [savedForm, setSavedForm] = useState(() => JSON.stringify(initialForm()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [coverPending, setCoverPending] = useState<PreparedClientImage[]>([])
  const [galleryPending, setGalleryPending] = useState<PreparedClientImage[]>([])
  const [galleryOrder, setGalleryOrder] = useState<string[]>([])
  const [recoveredImages, setRecoveredImages] = useState<RecoverableProjectImage[]>([])
  const [preparingCount, setPreparingCount] = useState(0)
  const [saveStage, setSaveStage] = useState('')
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null)
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [conflict, setConflict] = useState(false)
  const [previousEdits, setPreviousEdits] = useState<ProjectEditorForm | null>(null)
  const [showMap, setShowMap] = useState(false)
  const formElement = useRef<HTMLFormElement>(null)
  const busyRef = useRef(false)
  const allowNavigation = useRef(false)
  const pendingImages = useRef<PreparedClientImage[]>([])
  const latestRecovery = useRef<Recovery | null>(null)
  const recoveryKey = 'sgw-cms-edit-recovery:' + userId + ':' + (editingId || (sourceItem ? 'copy-' + sourceItem.id : 'new'))
  const orderedGallery = orderedProjectImages(form.galleryImages, galleryPending.map((item) => item.id), galleryOrder)
  const dirty = JSON.stringify(form) !== savedForm || coverPending.length > 0 || galleryPending.length > 0 || recoveredImages.length > 0 || JSON.stringify(orderedGallery) !== JSON.stringify(form.galleryImages)
  const locked = !canWrite || !recoveryReady || busy || preparingCount > 0 || Boolean(pendingSave) || Boolean(recovery)
  const thaiHash = thaiProjectContentHash(form)
  const captureRecovery = useCallback((): Recovery => {
    const describe = (image: PreparedClientImage, kind: RecoverableProjectImage['kind']): RecoverableProjectImage => ({ id: image.id, name: image.originalName, originalBytes: image.originalBytes, kind, metadata: form.mediaMetadata?.[image.id] || { alt: '', caption: '' } })
    const images = [...recoveredImages, ...coverPending.map((image) => describe(image, 'cover')), ...galleryPending.map((image) => describe(image, 'gallery'))]
    const completeGalleryOrder = orderedProjectImages(form.galleryImages, images.filter((image) => image.kind === 'gallery').map((image) => image.id), galleryOrder)
    return { form, galleryOrder: completeGalleryOrder, previousEdits, pendingImages: images, pendingNames: images.map((image) => image.name), pendingSave, savedAt: Date.now() }
  }, [coverPending, form, galleryOrder, galleryPending, pendingSave, previousEdits, recoveredImages])

  useEffect(() => {
    pendingImages.current = [...coverPending, ...galleryPending]
    latestRecovery.current = captureRecovery()
  }, [captureRecovery, coverPending, galleryPending])
  useEffect(() => () => {
    for (const image of pendingImages.current) URL.revokeObjectURL(image.previewUrl)
  }, [])

  useEffect(() => {
    let recovered: Recovery | null = null
    let available = true
    try {
      const raw = sessionStorage.getItem(recoveryKey)
      if (raw) {
        const value = JSON.parse(raw) as Recovery
        if (hasRecoverableProjectShape(value.form) && typeof value.savedAt === 'number') {
          if (Date.now() - value.savedAt < 7 * 86400000) recovered = value
          else sessionStorage.removeItem(recoveryKey)
        }
      }
    } catch { available = false }
    queueMicrotask(() => {
      setRecovery(recovered)
      setStorageAvailable(available)
      setRecoveryReady(true)
    })
  }, [recoveryKey])

  useEffect(() => {
    if (!recoveryReady || recovery || !canWrite) return
    const timer = window.setTimeout(() => {
      try {
        if (dirty || pendingSave || previousEdits) sessionStorage.setItem(recoveryKey, JSON.stringify(captureRecovery()))
        else sessionStorage.removeItem(recoveryKey)
      } catch { setStorageAvailable(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [canWrite, captureRecovery, dirty, pendingSave, previousEdits, recovery, recoveryKey, recoveryReady])

  useEffect(() => {
    if (!dirty && !pendingSave && !busy && preparingCount === 0) return
    const confirmLeave = () => {
      if (allowNavigation.current) return true
      if (busyRef.current || preparingCount > 0) {
        window.alert(text('กรุณารอให้เตรียมภาพหรือบันทึกเสร็จก่อน', 'Please wait for image preparation or saving to finish.'))
        return false
      }
      return window.confirm(text('มีการแก้ไขที่ยังไม่บันทึก ต้องการออกจากหน้านี้หรือไม่?', 'You have unsaved changes. Leave this page?'))
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!allowNavigation.current) {
        try { if (latestRecovery.current) sessionStorage.setItem(recoveryKey, JSON.stringify(latestRecovery.current)) } catch { /* Best-effort recovery when browser storage is unavailable. */ }
        event.preventDefault(); event.returnValue = ''
      }
    }
    const beforeLeave = (event: Event) => { if (!confirmLeave()) event.preventDefault() }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    const traverse = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType === 'traverse' && event.cancelable && !confirmLeave()) event.preventDefault()
    }
    const click = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a')
      if (!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const url = new URL(link.href, location.href)
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return
      if (!confirmLeave()) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('sgw-cms-before-leave', beforeLeave)
    document.addEventListener('click', click, true)
    navigation?.addEventListener('navigate', traverse)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('sgw-cms-before-leave', beforeLeave)
      document.removeEventListener('click', click, true)
      navigation?.removeEventListener('navigate', traverse)
    }
  }, [busy, dirty, pendingSave, preparingCount, recoveryKey, text])

  function set<K extends keyof CmsProjectInput>(key: K, value: CmsProjectInput[K]) {
    if (locked) return
    setForm((previous) => ({ ...previous, [key]: value }))
    setFieldErrors((previous) => ({ ...previous, [key]: '' }))
  }

  function setTranslation<K extends keyof CmsProjectTranslation>(language: CmsProjectTranslationLocale, key: K, value: CmsProjectTranslation[K]) {
    if (locked) return
    setForm((previous) => ({
      ...previous,
      translations: { ...previous.translations, [language]: { ...previous.translations[language], [key]: value } },
      translationSourceHash: { ...previous.translationSourceHash, [language]: '' },
    }))
  }

  function metadataChange(key: string, value: { alt: string; caption: string }) {
    setForm((previous) => ({ ...previous, mediaMetadata: { ...previous.mediaMetadata, [key]: value } }))
  }

  function setPreparing(preparing: boolean) {
    setPreparingCount((previous) => Math.max(0, previous + (preparing ? 1 : -1)))
  }

  function acceptPendingImages(kind: RecoverableProjectImage['kind'], images: PreparedClientImage[]) {
    const existingIds = new Set([...coverPending, ...galleryPending].map((image) => image.id))
    const reconnected = reconnectProjectImageDescriptions(images.filter((image) => !existingIds.has(image.id)), recoveredImages, kind)
    if (Object.keys(reconnected.metadata).length) {
      setForm((previous) => ({ ...previous, mediaMetadata: { ...previous.mediaMetadata, ...reconnected.metadata } }))
      setGalleryOrder((previous) => previous.map((id) => reconnected.restoredIds[id] || id))
      setRecoveredImages(reconnected.remaining)
    }
    if (kind === 'cover') setCoverPending(images)
    else setGalleryPending(images)
  }

  function useAsCover(image: string | PreparedClientImage) {
    if (locked) return
    for (const previous of coverPending) URL.revokeObjectURL(previous.previewUrl)
    if (typeof image === 'string') {
      setCoverPending([])
      setForm((previous) => ({ ...previous, coverImage: image }))
    } else {
      setCoverPending([image])
      setGalleryPending((previous) => previous.filter((item) => item.id !== image.id))
    }
  }

  function showFieldErrors(fields: Record<string, string>) {
    setFieldErrors(localizeCmsFieldErrors(locale, fields))
    requestAnimationFrame(() => {
      const firstKey = Object.keys(fields)[0]
      const target = formElement.current?.querySelector<HTMLElement>('[name="' + firstKey + '"], [data-field="' + firstKey + '"] button, [aria-invalid="true"] button, [aria-invalid="true"]')
      target?.focus()
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  function acceptSaved(item: CmsProjectRecord, refreshPending = false) {
    const next = withDefaultDetailSections(item)
    for (const image of [...coverPending, ...galleryPending]) URL.revokeObjectURL(image.previewUrl)
    setCoverPending([])
    setGalleryPending([])
    setGalleryOrder([])
    setRecoveredImages([])
    setPendingSave(null)
    setPreviousEdits(null)
    setRecovery(null)
    setConflict(false)
    setFieldErrors({})
    setError('')
    setForm(next)
    setSavedForm(JSON.stringify(next))
    setEditingId(item.id)
    setMessage(refreshPending
      ? text('บันทึกข้อมูลแล้ว แต่การรีเฟรชหน้าเว็บไซต์ยังไม่สำเร็จ กรุณาตรวจสอบหน้าผลงานอีกครั้ง', 'Project saved, but refreshing public pages is delayed. Check the public project page again.')
      : text('บันทึกแล้ว เว็บไซต์อัปเดตข้อมูลนี้ทันที', 'Saved. This content is now live on the website.'))
    try {
      sessionStorage.removeItem(recoveryKey)
      sessionStorage.removeItem('sgw-cms-edit-recovery:' + userId + ':' + item.id)
      localStorage.setItem('sgw-cms-projects-changed', String(Date.now()))
    } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event('sgw-cms-projects-changed'))
    if (!editingId) {
      allowNavigation.current = true
      router.replace('/cms/projects/' + item.id + '?created=1')
    }
    router.refresh()
  }

  async function reconcile(save: PendingSave) {
    const response = await fetch('/api/cms/projects?operationId=' + encodeURIComponent(save.request.operationId), { cache: 'no-store' })
    if (handleCmsUnauthorized(response)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง แล้วตรวจสอบการบันทึก', 'Your session expired. Sign in again, then check the save.'))
    if (!response.ok) return null
    const payload = await response.json() as SavePayload
    return payload.item || null
  }

  async function cleanUpStaged(save: PendingSave) {
    if (!save.staged.length) return true
    try {
      const response = await fetch('/api/cms/projects/media', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: save.request.submissionId, tokens: save.staged.map((item) => item.token) }),
      })
      handleCmsUnauthorized(response)
      return response.ok
    } catch { return false }
  }

  async function submitSave(save: PendingSave) {
    // Retain this exact request until its outcome is known. A retry never creates another project.
    setPendingSave(save)
    try {
      sessionStorage.setItem(recoveryKey, JSON.stringify({ ...captureRecovery(), pendingSave: save }))
    } catch { setStorageAvailable(false) }
    try {
      setSaveStage(text('กำลังบันทึกผลงาน...', 'Saving project...'))
      const response = await fetch('/api/cms/projects', { method: save.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(save.request) })
      const payload = await response.json().catch(() => ({})) as SavePayload
      if (response.ok && payload.item) { acceptSaved(payload.item, payload.publicRefreshPending); return }
      const unauthorized = handleCmsUnauthorized(response)
      if (response.status >= 400 && response.status < 500 && !unauthorized) {
        const saved = await reconcile(save).catch(() => null)
        if (saved) { acceptSaved(saved); return }
        const cleaned = await cleanUpStaged(save)
        setPendingSave(null)
        const versionConflict = Boolean(editingId && (response.status === 428 || (response.status === 409 && !payload.fields)))
        setConflict(versionConflict)
        if (payload.fields) showFieldErrors(payload.fields)
        setError(versionConflict
          ? text('ผลงานนี้ถูกแก้ไขในอีกแท็บ ข้อมูลของคุณยังอยู่ โหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง', 'This project changed in another tab. Your edits are preserved. Load the latest record before saving again.')
          : (payload.fields ? text('กรุณาแก้ไขช่องที่ระบุแล้วบันทึกอีกครั้ง', 'Correct the highlighted fields and save again.')
            : response.status === 403 ? text('บัญชีนี้ไม่มีสิทธิ์บันทึกผลงาน การแก้ไขของคุณยังอยู่ กรุณาติดต่อผู้ดูแล', 'This account cannot save projects. Your edits are retained; contact an administrator.')
              : payload.error || text('ไม่สามารถบันทึกได้ กรุณาลองใหม่', 'Could not save. Please try again.')))
        if (!cleaned) setMessage(text('ยังยืนยันการล้างภาพใหม่ไม่ได้ ระบบจะตรวจสอบภาพที่ไม่ได้ใช้ให้ภายหลัง', 'New image cleanup is not confirmed. Unused staged images remain queued for cleanup.'))
        return
      }
      throw new Error(unauthorized ? text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'Your session expired. Sign in again.') : text('ยังยืนยันผลการบันทึกไม่ได้', 'The save result is not confirmed.'))
    } catch (caught) {
      const saved = await reconcile(save).catch(() => null)
      if (saved) { acceptSaved(saved); return }
      setError((caught instanceof Error ? caught.message + ' ' : '') + text('ข้อมูลและคำขอบันทึกยังอยู่ กดตรวจสอบหรือลองบันทึกเดิมอีกครั้ง ระบบจะไม่สร้างรายการซ้ำ', 'Your edits and save request are retained. Check or retry the same save; it will not create a duplicate.'))
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked || busyRef.current || conflict || recoveredImages.length > 0) return
    setError('')
    setMessage('')
    setFieldErrors({})
    const existingMedia = new Set([...(coverPending.length ? [] : [form.coverImage]), ...form.galleryImages])
    const preflightMetadata = Object.fromEntries(Object.entries(form.mediaMetadata || {}).filter(([key]) => existingMedia.has(key)))
    const preflight = validateProjectInput({ ...form, mediaMetadata: preflightMetadata, status: 'active', coverImage: coverPending.length ? 'https://pending.invalid/cover' : form.coverImage })
    if (preflight.errors) {
      showFieldErrors(preflight.errors)
      setError(text('กรุณาแก้ไขช่องที่ระบุ ก่อนอัปโหลดภาพ', 'Correct the highlighted fields before uploading images.'))
      return
    }
    const additional: Record<string, string> = validateProjectForSave(preflight.data) || {}
    if (form.galleryImages.length + galleryPending.length > CMS_PROJECT_MAX_GALLERY_IMAGES) additional.galleryImages = 'Use at most 120 gallery images.'
    if (Object.keys(additional).length) {
      showFieldErrors(additional)
      setError(text('กรอกข้อมูลภาษาไทยและภาพปกให้ครบก่อนบันทึก', 'Complete the Thai content and cover image before saving.'))
      return
    }
    busyRef.current = true
    setBusy(true)
    const submissionId = crypto.randomUUID()
    const staged: CmsStagedMediaUpload[] = []
    const allPending = [...coverPending, ...galleryPending]
    try {
      for (let index = 0; index < allPending.length; index += 1) {
        setSaveStage(text('กำลังอัปโหลดภาพ ' + (index + 1) + ' จาก ' + allPending.length, 'Uploading image ' + (index + 1) + ' of ' + allPending.length))
        const data = new FormData()
        data.append('file', allPending[index].file)
        data.append('submissionId', submissionId)
        data.append('slug', form.slug.trim())
        const response = await fetch('/api/cms/projects/media', { body: data, method: 'POST' })
        const payload = await response.json().catch(() => ({})) as { error?: string; staged?: CmsStagedMediaUpload }
        if (handleCmsUnauthorized(response)) throw new Error(text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งแล้วบันทึก', 'Your session expired. Sign in again and save.'))
        if (!response.ok || !payload.staged) throw new Error(payload.error || text('อัปโหลดภาพไม่สำเร็จ ภาพที่เลือกยังอยู่ กรุณาลองใหม่', 'Image upload failed. Your selected images are retained; please retry.'))
        staged.push(payload.staged)
      }
      const metadata = { ...form.mediaMetadata }
      allPending.forEach((image, index) => {
        if (metadata[image.id]) { metadata[staged[index].asset.src] = metadata[image.id]; delete metadata[image.id] }
      })
      const uploadedSources = new Map(allPending.map((image, index) => [image.id, staged[index].asset.src]))
      const galleryImages = orderedGallery.map((key) => uploadedSources.get(key) || key)
      const coverImage = coverPending.length ? staged[0].asset.src : form.coverImage
      const keptMedia = new Set([coverImage, ...galleryImages])
      const request: SaveRequest = {
        ...preflight.data,
        coverImage,
        galleryImages: Array.from(new Set(galleryImages)),
        mediaMetadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => keptMedia.has(key))),
        translationSourceHash: form.translationSourceHash,
        id: editingId || undefined,
        expectedUpdatedAt: form.updatedAt || undefined,
        operationId: crypto.randomUUID(),
        sourceProjectId: !editingId ? sourceItem?.id : undefined,
        submissionId,
        stagedMedia: staged.map((item) => item.token),
      }
      await submitSave({ method: editingId ? 'PUT' : 'POST', request, staged })
    } catch (caught) {
      // No project request was sent: only this attempt's staged uploads may be cleaned.
      const cleaned = await cleanUpStaged({ request: { submissionId } as SaveRequest, staged, method: 'POST' })
      setError(caught instanceof Error ? caught.message : text('เตรียมการบันทึกไม่สำเร็จ กรุณาลองใหม่', 'Could not prepare the save. Please retry.'))
      if (!cleaned) setMessage(text('ภาพอัปโหลดที่ไม่ได้ใช้จะถูกตรวจสอบและล้างภายหลัง', 'Unused staged uploads will be checked and cleaned later.'))
    } finally { busyRef.current = false; setBusy(false); setSaveStage('') }
  }

  async function resolveSave(retry: boolean) {
    if (!pendingSave || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const item = await reconcile(pendingSave)
      if (item) { acceptSaved(item); return }
      if (retry) await submitSave(pendingSave)
      else setError(text('ยังไม่พบผลการบันทึกที่ยืนยันแล้ว กดลองบันทึกเดิมอีกครั้งเมื่อเชื่อมต่อได้', 'No confirmed save found yet. Retry the same save when connected.'))
    } catch (caught) { setError(caught instanceof Error ? caught.message : text('ตรวจสอบไม่ได้ กรุณาลองใหม่', 'Could not check. Please retry.')) }
    finally { busyRef.current = false; setBusy(false); setSaveStage('') }
  }

  async function loadLatest() {
    if (!editingId || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const response = await fetch('/api/cms/projects?id=' + editingId, { cache: 'no-store' })
      if (handleCmsUnauthorized(response)) throw new Error(text('กรุณาเข้าสู่ระบบอีกครั้งก่อนโหลดข้อมูล', 'Sign in again before loading the record.'))
      const payload = await response.json() as SavePayload
      if (!response.ok || !payload.item) throw new Error(payload.error || text('โหลดข้อมูลล่าสุดไม่สำเร็จ', 'Could not load the latest record.'))
      setPreviousEdits(form)
      const next = withDefaultDetailSections(payload.item)
      const pendingIds = new Set([...coverPending, ...galleryPending].map((item) => item.id))
      const pendingMetadata = Object.fromEntries(Object.entries(form.mediaMetadata || {}).filter(([key]) => pendingIds.has(key)))
      setForm({ ...next, mediaMetadata: { ...next.mediaMetadata, ...pendingMetadata } })
      setGalleryOrder([])
      setSavedForm(JSON.stringify(next))
      setConflict(false)
      setError('')
      setMessage(text('โหลดข้อมูลล่าสุดแล้ว สามารถนำข้อความเดิมของคุณกลับมาเปรียบเทียบได้ ภาพที่เลือกยังอยู่', 'Latest record loaded. You can reapply your previous text to compare. Selected images are retained.'))
    } catch (caught) { setError(caught instanceof Error ? caught.message : text('โหลดไม่สำเร็จ', 'Could not load.')) }
    finally { busyRef.current = false; setBusy(false) }
  }

  function restoreRecovery() {
    if (!recovery) return
    setForm(withDefaultDetailSections({ ...recovery.form, status: 'active' }))
    setGalleryOrder(recovery.galleryOrder || [])
    setPreviousEdits(recovery.previousEdits && hasRecoverableProjectShape(recovery.previousEdits) ? withDefaultDetailSections(recovery.previousEdits) : null)
    setRecoveredImages(Array.isArray(recovery.pendingImages) ? recovery.pendingImages.filter((image) => image && typeof image.id === 'string' && typeof image.name === 'string' && typeof image.originalBytes === 'number' && (image.kind === 'cover' || image.kind === 'gallery') && typeof image.metadata?.alt === 'string' && typeof image.metadata?.caption === 'string') : [])
    setPendingSave(recovery.pendingSave || null)
    setConflict(Boolean(initialItem && recovery.form.updatedAt !== initialItem.updatedAt && !recovery.pendingSave))
    setMessage(recovery.pendingNames?.length
      ? text('กู้คืนข้อความแล้ว กรุณาเลือกภาพที่ยังไม่ได้บันทึกใหม่: ', 'Text recovered. Reselect images that were not saved: ') + recovery.pendingNames.join(', ')
      : text('กู้คืนการแก้ไขที่ยังไม่บันทึกแล้ว กรุณาตรวจสอบก่อนบันทึก', 'Unsaved edits recovered. Review them before saving.'))
    setRecovery(null)
  }

  function field(name: 'title' | 'slug' | 'location' | 'year' | 'lat' | 'lng' | 'summary', label: string, options: { required?: boolean; maxLength?: number; type?: string; lang?: string; min?: number; max?: number; help?: string } = {}) {
    const id = 'project-' + name
    const props = {
      id, name, disabled: locked, required: options.required, lang: options.lang, maxLength: options.maxLength,
      value: form[name] ?? '', 'aria-invalid': Boolean(fieldErrors[name]),
      'aria-describedby': fieldErrors[name] || options.help ? id + '-help' : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (name === 'year' || name === 'lat' || name === 'lng') set(name, event.target.value === '' ? null : Number(event.target.value))
        else set(name, event.target.value)
      },
    }
    return <label className="cms-field" htmlFor={id}><span>{label}{options.required ? <span className="cms-required" aria-hidden="true">*</span> : null}</span>
      {name === 'summary' ? <textarea {...props} /> : <input {...props} type={options.type || 'text'} step={name === 'year' ? 1 : 'any'} min={options.min} max={options.max} onBlur={name === 'title' ? () => { if (!form.slug) set('slug', slugify(form.title)) } : undefined} />}
      {fieldErrors[name] || options.help ? <span className={fieldErrors[name] ? 'cms-field-error' : 'cms-field-help'} id={id + '-help'}>{fieldErrors[name] || options.help}</span> : null}
      {options.maxLength ? <span className="cms-field-counter">{String(form[name] ?? '').length}/{options.maxLength}</span> : null}
    </label>
  }

  return <section className="cms-editor cms-project-editor" aria-labelledby="project-editor-title">
    <header className="cms-editor-header"><div>
      <a className="cms-back-link" href="/cms/projects"><ArrowLeft aria-hidden="true" />{text('กลับไปที่ผลงาน', 'Back to projects')}</a>
      <h2 id="project-editor-title">{editingId ? form.title || text('แก้ไขผลงาน', 'Edit project') : text('เพิ่มผลงาน', 'Add project')}</h2>
      <p>{canWrite ? text('กดบันทึกเมื่อพร้อม ข้อมูลจะแสดงบนเว็บไซต์ทันที', 'Save when ready. Changes appear on the website immediately.') : text('มุมมองผลงานแบบอ่านอย่างเดียว', 'Read-only project view.')}</p>
      {editingId ? <p className="cms-field-help">{text('บันทึกล่าสุด: ', 'Last saved: ')}{form.updatedAt ? new Intl.DateTimeFormat(th ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(form.updatedAt)) : '—'}{dirty ? ' · ' + text('มีการแก้ไขที่ยังไม่บันทึก', 'Unsaved changes') : ''}</p> : null}
      {sourceItem && !editingId ? <p className="cms-message">{text('สำเนาจาก: ', 'Copy of: ')}{sourceItem.title} · {text('ตรวจสอบข้อมูลและเปลี่ยน Slug ก่อนบันทึก', 'Review the content and change the slug before saving.')}</p> : null}
    </div></header>

    {recovery ? <aside className="cms-editor-notice" role="status"><strong>{text('พบการแก้ไขที่ยังไม่บันทึกในแท็บนี้', 'Unsaved edits found in this tab')}</strong><p>{text('กู้คืนเพื่อทำต่อ หรือทิ้งข้อมูลที่ค้างไว้แล้วใช้ข้อมูลบนเว็บไซต์', 'Recover to continue, or discard these edits and use the saved website record.')}</p><div className="cms-form-actions"><button className="cms-button" type="button" onClick={restoreRecovery}><RotateCcw aria-hidden="true" />{text('กู้คืนการแก้ไข', 'Recover edits')}</button>{!recovery.pendingSave ? <button className="cms-button-secondary" type="button" onClick={() => { sessionStorage.removeItem(recoveryKey); setRecovery(null) }}>{text('ทิ้งการแก้ไขที่ค้างไว้', 'Discard recovered edits')}</button> : null}</div></aside> : null}
    {!storageAvailable ? <p className="cms-field-help" role="status">{text('เบราว์เซอร์ไม่อนุญาตให้เก็บข้อความกู้คืน กรุณาบันทึกก่อนปิดหน้านี้', 'Browser recovery storage is unavailable. Save before closing this page.')}</p> : null}
    {recoveredImages.length && !pendingSave ? <aside className="cms-editor-notice" role="status"><strong>{text('เลือกภาพเหล่านี้อีกครั้งก่อนบันทึก', 'Reselect these images before saving')}</strong><p>{recoveredImages.map((image) => image.name).join(', ')}</p><p className="cms-field-help">{text('คำอธิบายภาพและลำดับยังอยู่ เมื่อเลือกไฟล์เดิม ระบบจะนำข้อมูลกลับมาให้', 'Image descriptions and order are retained and will reconnect when you select the same files.')}</p><button className="cms-button-secondary" type="button" disabled={locked} onClick={() => { setRecoveredImages([]); setMessage(text('ยกเลิกภาพที่ยังไม่ได้เลือกใหม่แล้ว กรุณาตรวจสอบภาพก่อนบันทึก', 'Missing image selections dismissed. Review your images before saving.')) }}>{text('ทำต่อโดยไม่ใช้ภาพเหล่านี้', 'Continue without these images')}</button></aside> : null}

    <form ref={formElement} className="cms-form" noValidate onSubmit={save} aria-busy={!recoveryReady || busy || preparingCount > 0}>
      <div className="cms-form-grid">
        {field('title', text('ชื่อผลงาน (ไทย)', 'Project title (Thai)'), { required: true, lang: 'th', maxLength: 180 })}
        {field('slug', 'Slug', { required: true, maxLength: 180, help: text('ห้ามมีช่องว่างหรือเครื่องหมายทับ', 'No spaces or slashes.') })}
        <div data-field="category"><PillMultiSelect disabled={locked} error={fieldErrors.category} exclusiveValue="other" label={text('หมวดหมู่', 'Category')} onChange={(values) => set('category', values)} options={categoryValues} optionLabel={(category) => cmsProjectCategoryLabel(locale, category)} required values={form.category} /></div>
        <div data-field="workTypes"><PillMultiSelect disabled={locked} error={fieldErrors.workTypes} label={text('ประเภทงาน', 'Work types')} onChange={(values) => set('workTypes', values)} options={workTypeValues} optionLabel={(workType) => cmsProjectWorkTypeLabel(locale, workType)} values={form.workTypes} /></div>
        {field('year', text('ปี', 'Year'), { type: 'number', min: 1900, max: new Date().getFullYear() + 5 })}
        {field('location', text('สถานที่ (ไทย)', 'Location (Thai)'), { required: true, lang: 'th', maxLength: 300 })}
        <div className="cms-project-coordinates">{field('lat', text('ละติจูด', 'Latitude'), { type: 'number', min: -90, max: 90 })}{field('lng', text('ลองจิจูด', 'Longitude'), { type: 'number', min: -180, max: 180 })}</div>
        <div className="cms-project-map-picker"><button className="cms-button-secondary" type="button" onClick={() => setShowMap((previous) => !previous)} aria-expanded={showMap}><MapPin aria-hidden="true" />{showMap ? text('ซ่อนแผนที่', 'Hide map') : text('เลือกตำแหน่งบนแผนที่', 'Choose location on map')}</button>
          {showMap ? <><p className="cms-field-help">{text('แตะหรือคลิกตำแหน่งโครงการ ไม่ใช่ตำแหน่งอุปกรณ์ของคุณ หรือกรอกพิกัดด้านบน', 'Tap or click the project location, or enter coordinates above. This does not use your device location.')}</p><LocationMap lat={form.lat !== null && Math.abs(form.lat) <= 90 && form.lng !== null && Math.abs(form.lng) <= 180 ? form.lat : null} lng={form.lng !== null && Math.abs(form.lng) <= 180 && form.lat !== null && Math.abs(form.lat) <= 90 ? form.lng : null} disabled={locked} onChange={(lat, lng) => setForm((previous) => ({ ...previous, lat, lng }))} /></> : null}
        </div>
        {field('summary', text('สรุป (ไทย)', 'Summary (Thai)'), { required: true, lang: 'th', maxLength: 12000 })}
        <DetailedSectionsEditor addLabel={text('เพิ่มรายละเอียด', 'Add detailed section')} disabled={locked} emptyLabel={text('ยังไม่มีรายละเอียด กดปุ่มด้านล่างเพื่อเพิ่ม', 'No detailed sections yet. Use the button below to add one.')} idPrefix="project-detail-th" label={text('รายละเอียด (ไทย)', 'Detailed sections (Thai)')} language="th" onChange={(values) => set('details', values)} removeLabel={text('ลบ', 'Remove section')} sectionLabel={text('ส่วนที่', 'Section')} values={form.details} />

        {CMS_PROJECT_TRANSLATION_LOCALES.map((language) => {
          const labels = translationLabels[language]
          const translation = form.translations[language]
          const complete = translationCompletion(translation)
          const reviewed = form.translationSourceHash?.[language] === thaiHash
          return <details className="cms-language-section cms-field-full" key={language}><summary><span><strong>{text(labels.content.th, labels.content.en)}</strong><small>{text(labels.fallback.th, labels.fallback.en)}</small><small className="cms-translation-status">{complete}/4 {text('ช่องมีคำแปล', 'fields translated')}{complete ? ' · ' + (reviewed ? text('ตรวจสอบตรงกับภาษาไทยแล้ว', 'Reviewed against current Thai') : text('ควรตรวจสอบกับภาษาไทยล่าสุด', 'Review against current Thai')) : ''}</small></span><ChevronDown aria-hidden="true" /></summary>
            <div className="cms-language-fields">
              <div className="cms-translation-fallbacks">{(['title', 'location', 'summary', 'details'] as const).map((key) => {
                const value = translation[key]
                const hasValue = Array.isArray(value) ? value.some((part) => part.trim()) : Boolean(value.trim())
                if (hasValue) return null
                const english = form.translations.en[key]
                const hasEnglish = Array.isArray(english) ? english.some((part) => part.trim()) : Boolean(english.trim())
                const source = language !== 'en' && hasEnglish ? text('อังกฤษ', 'English') : text('ไทย', 'Thai')
                const fieldLabel = { title: text('ชื่อผลงาน', 'Title'), location: text('สถานที่', 'Location'), summary: text('สรุป', 'Summary'), details: text('รายละเอียด', 'Details') }[key]
                return <span key={key}>{fieldLabel} → {source}</span>
              })}</div>
              <label className="cms-field"><span>{text('ชื่อผลงาน', 'Project title')}</span><input lang={labels.htmlLang} maxLength={180} value={translation.title} onChange={(event) => setTranslation(language, 'title', event.target.value)} disabled={locked} /></label>
              <label className="cms-field"><span>{text('สถานที่', 'Location')}</span><input lang={labels.htmlLang} maxLength={300} value={translation.location} onChange={(event) => setTranslation(language, 'location', event.target.value)} disabled={locked} /></label>
              <label className="cms-field"><span>{text('สรุป', 'Summary')}</span><textarea lang={labels.htmlLang} maxLength={12000} value={translation.summary} onChange={(event) => setTranslation(language, 'summary', event.target.value)} disabled={locked} /></label>
              <DetailedSectionsEditor addLabel={text('เพิ่มรายละเอียด', 'Add detailed section')} disabled={locked} emptyLabel={text('ยังไม่มีรายละเอียด', 'No detailed sections yet.')} idPrefix={'project-detail-' + language} label={text('รายละเอียด', 'Detailed sections')} language={labels.htmlLang} onChange={(values) => setTranslation(language, 'details', values)} removeLabel={text('ลบ', 'Remove section')} sectionLabel={text(labels.section.th, labels.section.en)} values={translation.details} />
              <button className="cms-button-secondary" type="button" disabled={locked || !complete || reviewed} onClick={() => set('translationSourceHash', { ...form.translationSourceHash, [language]: thaiHash })}><Check aria-hidden="true" />{text('ตรวจสอบกับภาษาไทยแล้ว', 'Mark reviewed against Thai')}</button>
            </div>
          </details>
        })}
        <CmsDeferredProjectImages required label={text('ภาพปก', 'Cover image')} values={form.coverImage ? [form.coverImage] : []} pending={coverPending} onChange={(values) => set('coverImage', values[0] || '')} onPendingChange={(images) => acceptPendingImages('cover', images)} onPreparingChange={setPreparing} disabled={locked} error={fieldErrors.coverImage} metadata={form.mediaMetadata} onMetadataChange={metadataChange} />
        <CmsDeferredProjectImages label={text('ภาพแกลเลอรี', 'Gallery images')} values={form.galleryImages} pending={galleryPending} order={galleryOrder} onOrderChange={setGalleryOrder} onChange={(values) => set('galleryImages', values)} onPendingChange={(images) => acceptPendingImages('gallery', images)} onPreparingChange={setPreparing} disabled={locked} error={fieldErrors.galleryImages} onUseAsCover={useAsCover} metadata={form.mediaMetadata} onMetadataChange={metadataChange} multiple />
      </div>

      <div aria-live="polite">{saveStage || preparingCount > 0 ? <p className="cms-save-stage"><LoaderCircle className="cms-spin" aria-hidden="true" />{saveStage || text('กำลังเตรียมภาพ กรุณารอสักครู่...', 'Preparing images. Please wait...')}</p> : null}{error ? <p className="cms-error" role="alert">{error}</p> : null}{message ? <p className="cms-message">{message}</p> : null}</div>
      {pendingSave ? <div className="cms-editor-notice"><strong>{text('กำลังรอยืนยันผลการบันทึก', 'Save confirmation needed')}</strong><div className="cms-form-actions"><button type="button" className="cms-button-secondary" disabled={busy} onClick={() => resolveSave(false)}>{text('ตรวจสอบผลการบันทึก', 'Check save result')}</button><button type="button" className="cms-button" disabled={busy} onClick={() => resolveSave(true)}>{text('ลองบันทึกเดิมอีกครั้ง', 'Retry same save')}</button></div></div> : null}
      {conflict ? <button type="button" className="cms-button-secondary" disabled={busy || Boolean(pendingSave)} onClick={loadLatest}><RotateCcw aria-hidden="true" />{text('โหลดข้อมูลล่าสุดและเก็บข้อความของฉันไว้', 'Load latest and keep my text')}</button> : null}
      {previousEdits ? <div className="cms-editor-notice"><p>{text('ข้อความก่อนโหลดข้อมูลล่าสุดยังอยู่ กดด้านล่างเพื่อนำกลับมาแล้วตรวจสอบก่อนบันทึก', 'Your previous text is retained. Reapply it, then review before saving.')}</p><button className="cms-button-secondary" type="button" disabled={locked} onClick={() => { setForm((latest) => ({ ...previousEdits, updatedAt: latest.updatedAt, coverImage: latest.coverImage, galleryImages: latest.galleryImages, mediaMetadata: latest.mediaMetadata })); setPreviousEdits(null) }}>{text('นำข้อความของฉันกลับมา', 'Reapply my text')}</button></div> : null}
      <div className="cms-form-actions">
        <a className="cms-button-secondary" href="/cms/projects">{text('กลับไปที่ผลงาน', 'Back to projects')}</a>
        {editingId ? <a className="cms-button-secondary" href={'/cms/projects/' + editingId + '/preview?locale=' + locale} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" />{text('ดูฉบับที่บันทึกแล้ว', 'View saved version')}</a> : null}
        {canWrite ? <button className="cms-button" type="submit" disabled={locked || conflict || recoveredImages.length > 0}><Save aria-hidden="true" />{busy ? text('กำลังบันทึก...', 'Saving...') : text('บันทึก', 'Save')}</button> : null}
      </div>
      {dirty && editingId ? <p className="cms-field-help">{text('หน้าตัวอย่างจะแสดงฉบับที่บันทึกแล้ว กดบันทึกก่อนดูการเปลี่ยนแปลงล่าสุด', 'The preview shows the saved version. Save first to see your latest changes there.')}</p> : null}
    </form>

  </section>
}
