'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  FolderKanban,
  Gauge,
  Globe2,
  LogOut,
  Menu,
  Users,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { canCmsRole, type CmsPermission } from '@/lib/cms-permissions'
import { CMS_SESSION_EXPIRED_EVENT, fetchCmsSession, logoutCmsSession } from '@/lib/cms-client'
import { cmsLoginHref } from '@/lib/cms-access'
import { cmsRoleLabel } from '@/lib/cms-locale'
import type { CmsSession } from '@/types/cms'
import { CmsLanguageSwitcher, useCmsLanguage } from './CmsLanguage'
import './CmsAccessImprovements.css'

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
  { href: '/cms/account', icon: UserRound, label: { th: 'บัญชีของฉัน', en: 'My account' } },
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
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [expiresAt, setExpiresAt] = useState(session.expiresAt)
  const [sessionWarning, setSessionWarning] = useState<'soon' | 'expired' | 'different' | null>(null)
  const [sessionRestored, setSessionRestored] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const navigationDrawerRef = useRef<HTMLElement>(null)
  const copy = locale === 'th' ? {
    closeNavigation: 'ปิดเมนู',
    navigation: 'เมนู CMS',
    openNavigation: 'เปิดเมนู',
    signOut: 'ออกจากระบบ',
  } : {
    closeNavigation: 'Close navigation',
    navigation: 'CMS navigation',
    openNavigation: 'Open navigation',
    signOut: 'Sign out',
  }

  useEffect(() => {
    let active = true
    let checking = false
    const checkSession = async () => {
      if (checking) return
      checking = true
      try {
        const current = await fetchCmsSession()
        if (!active) return
        if (!current) {
          setSessionWarning('expired')
          setSessionRestored(false)
        } else if (current.userId !== session.userId) {
          setSessionWarning('different')
          setSessionRestored(false)
        } else {
          setExpiresAt(current.expiresAt)
          const warning = current.expiresAt && current.expiresAt - Date.now() <= 300_000 ? 'soon' : null
          setSessionWarning(warning)
          if (current.expiresAt && session.expiresAt && current.expiresAt > session.expiresAt) setSessionRestored(true)
        }
      } catch { /* A network interruption alone does not mean the session expired. */ }
      finally { checking = false }
    }
    const markExpired = () => { setSessionWarning('expired'); setSessionRestored(false) }
    const tick = () => {
      if (expiresAt && expiresAt <= Date.now()) markExpired()
      else if (expiresAt && expiresAt - Date.now() <= 300_000) setSessionWarning((previous) => previous === 'different' || previous === 'expired' ? previous : 'soon')
    }
    const timer = window.setInterval(tick, 15_000)
    const verifyTimer = window.setInterval(() => { if (document.visibilityState === 'visible') void checkSession() }, 60_000)
    window.addEventListener('focus', checkSession)
    window.addEventListener(CMS_SESSION_EXPIRED_EVENT, markExpired)
    void checkSession()
    return () => {
      active = false
      window.clearInterval(timer)
      window.clearInterval(verifyTimer)
      window.removeEventListener('focus', checkSession)
      window.removeEventListener(CMS_SESSION_EXPIRED_EVENT, markExpired)
    }
  }, [expiresAt, session.expiresAt, session.userId])

  useEffect(() => {
    if (!navigationOpen) return

    const previousOverflow = document.body.style.overflow
    const menuButton = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNavigationOpen(false)
        return
      }

      if (event.key !== 'Tab' || !navigationDrawerRef.current) return
      const focusable = Array.from(
        navigationDrawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      menuButton?.focus()
    }
  }, [navigationOpen])

  function closeNavigation() {
    setNavigationOpen(false)
  }

  function renderNavigation(onNavigate?: () => void) {
    return (
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
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" />
              {item.label[locale]}
            </a>
          )
        })}
      </nav>
    )
  }

  function renderSidebarFooter() {
    return (
      <div className="cms-sidebar-footer">
        <CmsLanguageSwitcher />
        <div className="cms-sidebar-user">
          <strong>{session.displayName}</strong>
          <span>{cmsRoleLabel(locale, session.role)}</span>
          <span>@{session.username}</span>
        </div>
      </div>
    )
  }

  async function signOut() {
    if (signingOut || !window.dispatchEvent(new CustomEvent('sgw-cms-before-leave', { cancelable: true }))) return
    setSigningOut(true)
    setSignOutError('')
    setNavigationOpen(false)
    try {
      await logoutCmsSession()
      router.replace('/cms/login')
      router.refresh()
    } catch {
      setSignOutError(locale === 'th' ? 'ออกจากระบบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่' : 'Could not sign out. Check your connection and try again.')
      setSigningOut(false)
    }
  }

  return (
    <main className="cms-shell">
      <header className="cms-navbar" inert={navigationOpen}>
        <button
          ref={menuButtonRef}
          className="cms-icon-button cms-navbar-menu-button"
          type="button"
          aria-label={copy.openNavigation}
          aria-controls="cms-navigation-drawer"
          aria-expanded={navigationOpen}
          onClick={() => setNavigationOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>
        <a className="cms-navbar-logo" href="/cms/dashboard" aria-label="SGW CMS">
          <img src="/images/logo/logo_SGW_white.svg" alt="" />
        </a>
        <button
          className="cms-icon-button cms-navbar-signout"
          type="button"
          aria-label={copy.signOut}
          title={copy.signOut}
          onClick={signOut}
          disabled={signingOut}
        >
          <LogOut aria-hidden="true" />
        </button>
      </header>

      <div
        className="cms-sidebar-layer"
        data-open={navigationOpen ? 'true' : 'false'}
        aria-hidden={!navigationOpen}
      >
        <button
          className="cms-drawer-scrim"
          type="button"
          aria-label={copy.closeNavigation}
          onClick={closeNavigation}
          tabIndex={navigationOpen ? 0 : -1}
        />
        <aside
          ref={navigationDrawerRef}
          id="cms-navigation-drawer"
          className="cms-sidebar cms-navigation-drawer"
          aria-label={copy.navigation}
          aria-modal="true"
          role="dialog"
        >
          <div className="cms-navigation-drawer-header">
            <a className="cms-sidebar-brand" href="/cms/dashboard" onClick={closeNavigation}>
              {/* Using a normal image keeps the private CMS independent from frontend image settings. */}
              <img src="/images/logo/logo_SGW_white.svg" alt="Siam Groundwater" />
              <span><strong>SGW CMS</strong></span>
            </a>
            <button
              ref={closeButtonRef}
              className="cms-icon-button cms-navigation-close"
              type="button"
              aria-label={copy.closeNavigation}
              onClick={closeNavigation}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          {renderNavigation(closeNavigation)}
          {renderSidebarFooter()}
        </aside>
      </div>

      <section className="cms-main" inert={navigationOpen}>
        <header className="cms-topbar">
          <div className="cms-topbar-copy">
            <p className="cms-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {expiresAt ? <p className="cms-session-time">{locale === 'th' ? 'เซสชันถึง' : 'Session until'} <time dateTime={new Date(expiresAt).toISOString()}>{new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(expiresAt))}</time> · {locale === 'th' ? 'เวลาไทย' : 'Bangkok time'}</p> : null}
          </div>
        </header>
        <div className="cms-content">
          <div aria-live="polite">
            {signOutError ? <p className="cms-error">{signOutError}</p> : null}
            {sessionWarning ? <div className="cms-session-banner" role="status">
              <p>{sessionWarning === 'different'
                ? (locale === 'th' ? 'แท็บอื่นเข้าสู่ระบบด้วยบัญชีอื่น กรุณากลับเข้าสู่ระบบด้วยบัญชีเดิมเพื่อทำงานต่อ' : 'Another tab signed in with a different account. Sign in with your original account to continue.')
                : sessionWarning === 'expired'
                  ? (locale === 'th' ? 'เซสชันหมดอายุแล้ว งานในหน้านี้ยังอยู่ เข้าสู่ระบบในแท็บใหม่แล้วกลับมาบันทึก' : 'Your session expired. This page is still open. Sign in in a new tab, then return here to save.')
                  : (locale === 'th' ? 'เซสชันจะหมดอายุในอีกไม่กี่นาที เข้าสู่ระบบในแท็บใหม่เพื่อทำงานต่อ' : 'Your session expires in a few minutes. Sign in in a new tab to continue working.')}</p>
              <a className="cms-button-secondary" href={`${cmsLoginHref('/cms/dashboard')}&reauth=1`} target="_blank" rel="noopener noreferrer">{locale === 'th' ? 'เข้าสู่ระบบในแท็บใหม่' : 'Sign in in a new tab'}</a>
            </div> : sessionRestored ? <p className="cms-message">{locale === 'th' ? 'เข้าสู่ระบบอีกครั้งแล้ว คุณสามารถบันทึกงานต่อได้' : 'Session restored. You can continue saving your work.'}</p> : null}
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
