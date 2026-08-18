import 'server-only'

import { redirect } from 'next/navigation'
import { canCmsRole, type CmsPermission } from '@/lib/cms-permissions'
import { getCurrentCmsUser } from './guards'

export async function requireCmsPage(permission: CmsPermission) {
  const user = await getCurrentCmsUser()
  if (!user) redirect('/cms/login')
  if (!canCmsRole(user.role, permission)) redirect('/cms/dashboard')
  return user
}
