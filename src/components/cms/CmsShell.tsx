'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  FolderKanban,
  Gauge,
  Globe2,
  LogOut,
  Menu,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { canCmsRole, type CmsPermission } from '@/lib/cms-permissions'
import { logoutCmsSession } from '@/lib/cms-client'
import { cmsRoleLabel } from '@/lib/cms-locale'
import type { CmsSession } from '@/types/cms'
import { CmsLanguageSwitcher, useCmsLanguage } from './CmsLanguage'

type NavItem = {
  href: string
  icon: LucideIcon
  label: { th: string; en: string }
  permission?: CmsPermission
}

const navItems: NavItem[] = [
  { href: '/cms/dashboard', icon: Gauge, label: { th: 'ภาพรวม', en: 'Dashboard' }, permission: 'dashboard:view' },
  { href: '/cms/projects', icon: FolderKanban, label: { th: 'ผลงาน', en: 'Projects' }, permission: 'projects:view' },
  { href: '/cms/users', icon: Users, label: { th: 'ผู้ใช้', en: 'Users' }, permission: 'users:manage' },
  { href: '/cms/audit-logs', icon: Activity, label: { th: 'ประวัติการใช้งาน', en: 'Audit logs' }, permission: 'audit:view' },
  { href: '/', icon: Globe2, label: { th: 'เปิดเว็บไซต์', en: 'Open website' } },
]

export default function CmsShell({
  children,
  eyebrow,
  session,
  title,
}: {
  children: ReactNode
  eyebrow: string
  session: CmsSession
  title: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useCmsLanguage()
  const [open, setOpen] = useState(false)
  const copy = locale === 'th' ? {
    closeNavigation: 'ปิดเมนู CMS',
    contentWorkspace: 'พื้นที่จัดการเนื้อหา',
    navigation: 'เมนู CMS',
    openNavigation: 'เปิดเมนู CMS',
    signOut: 'ออกจากระบบ',
  } : {
    closeNavigation: 'Close CMS navigation',
    contentWorkspace: 'Content workspace',
    navigation: 'CMS navigation',
    openNavigation: 'Open CMS navigation',
    signOut: 'Sign out',
  }

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function signOut() {
    await logoutCmsSession()
    router.replace('/cms/login')
    router.refresh()
  }

  return (
    <main className="cms-shell">
      <aside className="cms-sidebar" data-open={open} aria-label={copy.navigation}>
        <button className="cms-icon-button cms-mobile-close" type="button" onClick={() => setOpen(false)} aria-label={copy.closeNavigation}>
          <X aria-hidden="true" />
        </button>
        <a className="cms-sidebar-brand" href="/cms/dashboard">
          {/* Using a normal image keeps the private CMS independent from frontend image settings. */}
          <img src="/images/logo/logo_SGW_white.svg" alt="Siam Groundwater" />
          <span><strong>SGW CMS</strong></span>
        </a>

        <nav className="cms-nav">
          {navItems.map((item) => {
            if (item.permission && !canCmsRole(session.role, item.permission)) return null
            const active = pathname === item.href || (item.href !== '/cms/dashboard' && pathname.startsWith(`${item.href}/`))
            const Icon = item.icon
            const external = item.href === '/'
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label[locale]}
              </a>
            )
          })}
        </nav>

        <div className="cms-sidebar-footer">
          <CmsLanguageSwitcher />
          <div className="cms-sidebar-user">
            <strong>{session.displayName}</strong>
            <span>{cmsRoleLabel(locale, session.role)}</span>
            <span>@{session.username}</span>
          </div>
          <button className="cms-button-secondary cms-sidebar-signout" type="button" onClick={signOut}>
            <LogOut aria-hidden="true" />{copy.signOut}
          </button>
        </div>
      </aside>
      {open ? <button className="cms-drawer-scrim" type="button" onClick={() => setOpen(false)} aria-label={copy.closeNavigation} /> : null}

      <section className="cms-main">
        <header className="cms-topbar">
          <div className="cms-topbar-copy">
            <p className="cms-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="cms-topbar-actions">
            <button className="cms-icon-button cms-mobile-toggle" type="button" onClick={() => setOpen(true)} aria-label={copy.openNavigation}>
              <Menu aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="cms-content">{children}</div>
      </section>
    </main>
  )
}
