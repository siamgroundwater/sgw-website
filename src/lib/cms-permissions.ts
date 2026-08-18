import type { CmsUserRole } from '@/server/db/types'

export const cmsRoleValues = ['admin', 'editor', 'viewer'] as const satisfies readonly CmsUserRole[]

export type CmsPermission =
  | 'audit:view'
  | 'dashboard:view'
  | 'imports:manage'
  | 'learning:view'
  | 'learning:write'
  | 'learning:delete'
  | 'media:write'
  | 'projects:view'
  | 'projects:write'
  | 'projects:delete'
  | 'services:view'
  | 'services:write'
  | 'services:delete'
  | 'users:manage'

export const cmsRoleLabels: Record<CmsUserRole, string> = {
  admin: 'Administrator',
  editor: 'Content editor',
  viewer: 'Viewer',
}

export const cmsRoleDescriptions: Record<CmsUserRole, string> = {
  admin: 'Full CMS access, including users, imports, and audit history.',
  editor: 'Create and update SGW content. Destructive actions are restricted.',
  viewer: 'Read-only access to CMS content and dashboard summaries.',
}

export const cmsRolePermissions: Record<CmsUserRole, readonly CmsPermission[]> = {
  admin: [
    'audit:view',
    'dashboard:view',
    'imports:manage',
    'learning:view',
    'learning:write',
    'learning:delete',
    'media:write',
    'projects:view',
    'projects:write',
    'projects:delete',
    'services:view',
    'services:write',
    'services:delete',
    'users:manage',
  ],
  editor: [
    'dashboard:view',
    'learning:view',
    'learning:write',
    'media:write',
    'projects:view',
    'projects:write',
    'services:view',
    'services:write',
  ],
  viewer: [
    'dashboard:view',
    'learning:view',
    'projects:view',
    'services:view',
  ],
}

export function isCmsRole(value: unknown): value is CmsUserRole {
  return typeof value === 'string' && cmsRoleValues.includes(value as CmsUserRole)
}

export function canCmsRole(role: string | undefined, permission: CmsPermission) {
  return isCmsRole(role) && cmsRolePermissions[role].includes(permission)
}
