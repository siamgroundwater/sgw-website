'use client'

import { useEffect, type MutableRefObject } from 'react'

export const TEAM_CONTENT_LOCALES = ['en', 'zh', 'ja'] as const

type StoredTeamSave<T> = {
  savedAt: number
  value: T
}

export type TeamEditorLocale = (typeof TEAM_CONTENT_LOCALES)[number]

export function readStoredTeamSave<T>(key: string, validate: (value: unknown) => value is T) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTeamSave<unknown>>
    if (!Number.isFinite(parsed.savedAt) || !validate(parsed.value)) {
      sessionStorage.removeItem(key)
      return null
    }
    return { savedAt: parsed.savedAt as number, value: parsed.value }
  } catch {
    try { sessionStorage.removeItem(key) } catch { /* Storage is optional. */ }
    return null
  }
}

export function storeTeamSave<T>(key: string, value: T) {
  try {
    const current = sessionStorage.getItem(key)
    let parsed: Partial<StoredTeamSave<{ operationId?: unknown }>> | null = null
    if (current) {
      try { parsed = JSON.parse(current) as Partial<StoredTeamSave<{ operationId?: unknown }>> } catch { /* Replace malformed tab data. */ }
    }
    const operationId = value && typeof value === 'object' && 'operationId' in value
      ? (value as { operationId?: unknown }).operationId
      : undefined
    const savedAt = parsed && Number.isFinite(parsed.savedAt) && parsed.value?.operationId === operationId
      ? parsed.savedAt as number
      : Date.now()
    sessionStorage.setItem(key, JSON.stringify({ savedAt, value } satisfies StoredTeamSave<T>))
    return savedAt
  } catch {
    // Recovery still works for the life of this tab when storage is unavailable.
    return Date.now()
  }
}

export function clearStoredTeamSave(key: string) {
  try { sessionStorage.removeItem(key) } catch { /* Storage is optional. */ }
}

export const teamContentLocaleLabels: Record<TeamEditorLocale, {
  content: { th: string; en: string }
  fallback: { th: string; en: string }
  htmlLang: string
}> = {
  en: {
    content: { th: 'ภาษาอังกฤษ', en: 'English' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่างจะแสดงภาษาไทย', en: 'Optional. Empty fields fall back to Thai.' },
    htmlLang: 'en',
  },
  zh: {
    content: { th: 'ภาษาจีน', en: 'Chinese' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่างจะแสดงภาษาอังกฤษ แล้วจึงภาษาไทย', en: 'Optional. Empty fields fall back to English, then Thai.' },
    htmlLang: 'zh',
  },
  ja: {
    content: { th: 'ภาษาญี่ปุ่น', en: 'Japanese' },
    fallback: { th: 'ไม่บังคับ หากเว้นว่างจะแสดงภาษาอังกฤษ แล้วจึงภาษาไทย', en: 'Optional. Empty fields fall back to English, then Thai.' },
    htmlLang: 'ja',
  },
}

export function useCmsTeamDirtyGuard({
  allowNavigation,
  busy,
  dirty,
  message,
}: {
  allowNavigation: MutableRefObject<boolean>
  busy: boolean
  dirty: boolean
  message: string
}) {
  useEffect(() => {
    if (!dirty && !busy) return

    const confirmLeave = () => {
      if (allowNavigation.current) return true
      if (busy) {
        window.alert(message)
        return false
      }
      return window.confirm(message)
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigation.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const beforeLeave = (event: Event) => {
      if (!confirmLeave()) event.preventDefault()
    }
    const navigate = (event: Event) => {
      const navigationEvent = event as Event & { navigationType?: string }
      if (navigationEvent.navigationType === 'traverse' && event.cancelable && !confirmLeave()) {
        event.preventDefault()
      }
    }
    const click = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a')
      if (!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const url = new URL(link.href, window.location.href)
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return
      if (!confirmLeave()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('sgw-cms-before-leave', beforeLeave)
    document.addEventListener('click', click, true)
    navigation?.addEventListener('navigate', navigate)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('sgw-cms-before-leave', beforeLeave)
      document.removeEventListener('click', click, true)
      navigation?.removeEventListener('navigate', navigate)
    }
  }, [allowNavigation, busy, dirty, message])
}

export function teamFieldProps(field: string, errors: Record<string, string>) {
  const invalid = Boolean(errors[field])
  return {
    'aria-describedby': invalid ? `team-${field.replaceAll('.', '-')}-error` : undefined,
    'aria-invalid': invalid || undefined,
    name: field,
  }
}

export function TeamFieldError({ errors, field }: { errors: Record<string, string>; field: string }) {
  const error = errors[field]
  return error ? <span className="cms-field-error" id={`team-${field.replaceAll('.', '-')}-error`}>{error}</span> : null
}
