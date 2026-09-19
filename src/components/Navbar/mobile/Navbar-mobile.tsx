'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Building2,
  ChevronDown,
  FolderKanban,
  House,
  Menu,
  Phone,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'
import {
  getNavigation,
  localeFromPathname,
  localePath,
  navigationCopy,
} from '@/i18n/config'
import './Navbar-mobile.css'

const navIcons = [
  House,
  Building2,
  Wrench,
  FolderKanban,
  ShieldCheck,
  BookOpen,
  Phone,
]

const subscribeToClient = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export default function NavbarMobile() {
  const isMounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  )
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const isMenuOpen = menuOpenPath === pathname
  const locale = localeFromPathname(pathname)
  const navItems = getNavigation(locale)
  const copy = navigationCopy[locale]
  const homePath = localePath('/', locale)
  const isPathActive = (href: string) =>
    pathname === href || (href !== homePath && pathname.startsWith(`${href}/`))

  useEffect(() => {
    if (!isMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpenPath(null)
        menuButtonRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
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

    const handleResize = () => {
      if (window.innerWidth > 1024) setMenuOpenPath(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMenuOpen])

  const openMenu = () => {
    const activeParent = navItems.find((item) =>
      item.subNav?.some((sub) => isPathActive(sub.href))
    )
    setExpandedMenus(activeParent ? [activeParent.href] : [])
    setMenuOpenPath(pathname)
  }

  const closeMenu = (restoreFocus = false) => {
    setMenuOpenPath(null)
    if (restoreFocus) window.requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  const toggleSubmenu = (href: string) => {
    setExpandedMenus((current) =>
      current.includes(href)
        ? current.filter((item) => item !== href)
        : [...current, href]
    )
  }

  const drawer = (
    <div
      className={`navbar-mobile-drawer-root${isMenuOpen ? ' is-open' : ''}`}
      aria-hidden={!isMenuOpen}
    >
      <button
        type="button"
        className="navbar-mobile-overlay"
        aria-label={copy.menuClose}
        tabIndex={-1}
        onClick={() => closeMenu(true)}
      />
      <aside
        ref={drawerRef}
        className="navbar-mobile-drawer"
        id="mobile-primary-menu"
        role="dialog"
        aria-modal="true"
        aria-label={copy.mobileLabel}
        inert={!isMenuOpen}
      >
        <div className="navbar-mobile-drawer-header">
          <Link
            href={localePath('/', locale)}
            className="navbar-mobile-drawer-brand"
            onClick={() => closeMenu()}
          >
            <Image
              src="/images/logo/logo_SGW_white.svg"
              alt=""
              width={52}
              height={52}
            />
            <span>
              <strong>Siam Groundwater</strong>
              <small>WE KNOW GROUNDWATER</small>
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="navbar-mobile-close"
            aria-label={copy.menuClose}
            onClick={() => closeMenu(true)}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="navbar-mobile-drawer-body">
          <p className="navbar-mobile-drawer-label">{copy.mobileLabel}</p>
          <nav aria-label={copy.mobileLabel}>
            <ul className="navbar-mobile-list">
              {navItems.map((item, index) => {
                const Icon = navIcons[index]
                const hasSubnav = Boolean(item.subNav?.length)
                const isExpanded = expandedMenus.includes(item.href)
                const isActive =
                  isPathActive(item.href) ||
                  (item.subNav?.some((sub) => isPathActive(sub.href)) ?? false)
                const isExactPage = pathname === item.href
                const submenuId = `mobile-submenu-${index}`

                return (
                  <li key={item.href} className={isActive ? 'is-active' : ''}>
                    <div className="navbar-mobile-item-row">
                      <Link
                        href={item.href}
                        className="navbar-mobile-link"
                        aria-current={isExactPage ? 'page' : undefined}
                        onClick={() => closeMenu()}
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                      {hasSubnav && (
                        <button
                          type="button"
                          className="navbar-mobile-submenu-toggle"
                          aria-label={`${isExpanded ? copy.menuClose : copy.menuOpen}: ${item.label}`}
                          aria-expanded={isExpanded}
                          aria-controls={submenuId}
                          onClick={() => toggleSubmenu(item.href)}
                        >
                          <ChevronDown aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {hasSubnav && (
                      <div
                        className="navbar-mobile-subnav-wrap"
                        id={submenuId}
                        hidden={!isExpanded}
                      >
                        <ul className="navbar-mobile-subnav">
                          {item.subNav?.map((sub) => {
                            const isSubActive = isPathActive(sub.href)
                            return (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  className={`navbar-mobile-subnav-link${isSubActive ? ' is-active' : ''}`}
                                  aria-current={isSubActive ? 'page' : undefined}
                                  onClick={() => closeMenu()}
                                >
                                  <span aria-hidden="true" />
                                  {sub.label}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

      </aside>
    </div>
  )

  return (
    <header className="navbar-mobile">
      <div className="navbar-mobile-bar">
        <Link
          href={localePath('/', locale)}
          className="navbar-mobile-logo"
          aria-label="Siam Groundwater"
        >
          <Image
            src="/images/logo/logo_SGW_white.svg"
            alt="Siam Groundwater"
            width={56}
            height={56}
          />
        </Link>

        <div className="navbar-mobile-actions">
          <LanguageSwitcher mobile />
          <span className="navbar-mobile-divider" aria-hidden="true" />
          <button
            ref={menuButtonRef}
            type="button"
            className="navbar-mobile-toggle"
            onClick={isMenuOpen ? () => closeMenu(true) : openMenu}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-primary-menu"
            aria-label={isMenuOpen ? copy.menuClose : copy.menuOpen}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </div>
      {isMounted && createPortal(drawer, document.body)}
    </header>
  )
}
