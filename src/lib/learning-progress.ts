// IDs describe evidence, never its translated wording or array position. If the
// meaning of a checklist changes, change its revision and review the IDs together.
export const learningChecklistDefinitions = {
  basics: { revision: 1, ids: ['water-balance', 'nearby-well-data', 'site-access-risks', 'permits-responsibility', 'well-records', 'pumping-test', 'water-analysis', 'care-plan'] },
  law: { revision: 1, ids: ['site-rights', 'demand-purpose', 'well-design', 'qualifications', 'application-documents', 'pollution-plan', 'meter-reporting', 'renewal-calendar'] },
  owner: { revision: 1, ids: ['demand-service', 'site-records', 'permits-responsibility', 'survey-construction', 'test-analysis', 'system-design', 'handover-operation'] },
} as const

export type LearningChecklist = keyof typeof learningChecklistDefinitions
export type ProgressStatus = 'loading' | 'session' | 'saved' | 'unavailable' | 'forgotten' | 'forget-error' | 'external-change'
export type ProgressSnapshot = { checked: readonly string[]; saveOnDevice: boolean; ready: boolean; status: ProgressStatus }
type ProgressStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function learningProgressKey(checklist: LearningChecklist) {
  return `sgw:learning-progress:${checklist}:v1`
}

export function parseLearningProgress(raw: string | null, checklist: LearningChecklist): string[] | null {
  if (!raw || raw.length > 4096) return null
  try {
    const record = JSON.parse(raw)
    const definition = learningChecklistDefinitions[checklist]
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || record.version !== 1 || record.revision !== definition.revision
      || record.checklist !== checklist || record.optedIn !== true
      || !Array.isArray(record.checked) || record.checked.length > definition.ids.length
      || Object.keys(record).some((key) => !['version', 'revision', 'checklist', 'optedIn', 'checked'].includes(key))) return null
    const known = new Set<string>(definition.ids)
    if (record.checked.some((id: unknown) => typeof id !== 'string' || !known.has(id))
      || new Set(record.checked).size !== record.checked.length) return null
    return definition.ids.filter((id) => record.checked.includes(id))
  } catch {
    return null
  }
}

// Browser storage is acquired only after subscribing, so server rendering and
// the first hydration render always show the same empty, unsaved checklist.
export function createLearningProgressStore(checklist: LearningChecklist, getStorage: () => ProgressStorage) {
  const initial: ProgressSnapshot = { checked: [], saveOnDevice: false, ready: false, status: 'loading' }
  let snapshot = initial
  let initialized = false
  let lastSaved: string | null = null
  const listeners = new Set<() => void>()
  const key = learningProgressKey(checklist)
  const definition = learningChecklistDefinitions[checklist]
  const publish = (next: ProgressSnapshot) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  const fingerprint = (checked: readonly string[]) => JSON.stringify(checked)
  const persist = (checked: readonly string[], explicitOptIn = false): Pick<ProgressSnapshot, 'status' | 'saveOnDevice'> => {
    try {
      // Recheck before automatic writes as a storage event can still be queued.
      // Never recreate a record forgotten by another tab or replace newer data.
      if (!explicitOptIn) {
        const current = parseLearningProgress(getStorage().getItem(key), checklist)
        if (current === null || fingerprint(current) !== lastSaved) return { status: 'external-change', saveOnDevice: false }
      }
      getStorage().setItem(key, JSON.stringify({ version: 1, revision: definition.revision, checklist, optedIn: true, checked }))
      lastSaved = fingerprint(checked)
      return { status: 'saved', saveOnDevice: true }
    } catch {
      return { status: 'unavailable', saveOnDevice: true }
    }
  }
  const setChecked = (checked: readonly string[]) => {
    const result = snapshot.saveOnDevice ? persist(checked) : { saveOnDevice: false, status: snapshot.status === 'forget-error' || snapshot.status === 'external-change' ? snapshot.status : 'session' as ProgressStatus }
    publish({ ...snapshot, checked, ...result })
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      if (!initialized) {
        initialized = true
        try {
          const checked = parseLearningProgress(getStorage().getItem(key), checklist)
          lastSaved = checked === null ? null : fingerprint(checked)
          publish({ checked: checked ?? [], saveOnDevice: checked !== null, ready: true, status: checked === null ? 'session' : 'saved' })
        } catch {
          publish({ checked: [], saveOnDevice: false, ready: true, status: 'unavailable' })
        }
      }
      return () => { listeners.delete(listener) }
    },
    syncFromStorage: (changedKey: string | null) => {
      if (!snapshot.ready || (changedKey !== null && changedKey !== key) || !snapshot.saveOnDevice) return
      try {
        // Read current storage rather than trusting a possibly delayed event's payload.
        const checked = parseLearningProgress(getStorage().getItem(key), checklist)
        if (checked === null || (snapshot.status !== 'saved' && fingerprint(checked) !== lastSaved)) {
          publish({ ...snapshot, saveOnDevice: false, status: 'external-change' })
        } else if (snapshot.status === 'saved') {
          lastSaved = fingerprint(checked)
          publish({ ...snapshot, checked })
        }
      } catch {
        publish({ ...snapshot, status: 'unavailable' })
      }
    },
    toggle: (id: string) => {
      if (!snapshot.ready || !(definition.ids as readonly string[]).includes(id)) return
      const next = new Set(snapshot.checked)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setChecked(definition.ids.filter((item) => next.has(item)))
    },
    setSaving: (enabled: boolean) => {
      if (!snapshot.ready) return
      if (enabled) publish({ ...snapshot, ...persist(snapshot.checked, true) })
      else {
        try {
          getStorage().removeItem(key)
          publish({ ...snapshot, saveOnDevice: false, status: 'session' })
        } catch {
          publish({ ...snapshot, saveOnDevice: false, status: 'forget-error' })
        }
      }
    },
    reset: () => { if (snapshot.ready) setChecked([]) },
    forget: () => {
      if (!snapshot.ready) return
      try {
        getStorage().removeItem(key)
        publish({ checked: [], saveOnDevice: false, ready: true, status: 'forgotten' })
      } catch {
        // Keep current checks if deletion fails and explain that old data may remain.
        publish({ ...snapshot, saveOnDevice: false, status: 'forget-error' })
      }
    },
  }
}
