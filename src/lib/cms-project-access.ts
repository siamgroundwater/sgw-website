import type { CmsPermission } from './cms-permissions'

export function cmsProjectReadPermission(view: string | null | undefined): CmsPermission {
  return view === 'trash' ? 'projects:delete' : 'projects:view'
}
