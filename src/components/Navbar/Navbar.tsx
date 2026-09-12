'use client'

import { useState, type MouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'
import {
  getNavigation,
  localeFromPathname,
  localePath,
  navigationCopy,
} from '@/i18n/config'
import './Navbar.css'

export default function Navbar() {
  const [dismissedSubnav, setDismissedSubnav] = useState<string | null>(null)
  const pathname = usePathname()
  const locale = localeFromPathname(pathname)
  const navItems = getNavigation(locale)
  const copy = navigationCopy[locale]
  const homePath = localePath('/', locale)
  const isPathActive = (href: string) =>
    pathname === href || (href !== homePath && pathname.startsWith(`${href}/`))
  const dismissSubnav = (href: string, event: MouseEvent<HTMLAnchorElement>) => {
    setDismissedSubnav(href)
    event.currentTarget.blur()
  }

  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* Logo */}
        <Link
          href={localePath('/', locale)}
          className="navbar-logo"
          aria-label="Siam Groundwater"
        >
          <Image
            src="/images/logo/logo_SGW_white.svg"
            alt="Siam Groundwater"
            width={72}
            height={72}
          />
        </Link>

        {/* Center nav items + sub nav */}
        <nav className="navbar-nav" aria-label={copy.primaryLabel}>
          {navItems.map((item) => {
            const isActive =
              isPathActive(item.href) ||
              (item.subNav?.some((sub) => isPathActive(sub.href)) ?? false)
            const isExactPage = pathname === item.href

            return (
              <div
                key={item.label}
                className={`navbar-item ${item.subNav ? 'has-subnav' : ''}${dismissedSubnav === item.href ? ' is-subnav-dismissed' : ''}`}
                onPointerLeave={item.subNav ? (event) => {
                  if (event.pointerType !== 'mouse') return
                  setDismissedSubnav((current) => current === item.href ? null : current)
                } : undefined}
              >
                <Link
                  href={item.href}
                  className={`navbar-link${isActive ? ' is-active' : ''}`}
                  aria-haspopup={item.subNav ? 'true' : undefined}
                  aria-current={isExactPage ? 'page' : undefined}
                  onClick={item.subNav ? (event) => dismissSubnav(item.href, event) : undefined}
                  onFocus={item.subNav ? () => setDismissedSubnav(null) : undefined}
                >
                  <span className="navbar-text">{item.label}</span>
                </Link>

                {item.subNav && (
                  <div className="navbar-subnav">
                    {item.subNav.map((sub) => {
                      const isSubActive = isPathActive(sub.href)
                      return (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          className={`navbar-subnav-link${isSubActive ? ' is-active' : ''}`}
                          aria-current={isSubActive ? 'page' : undefined}
                          onClick={(event) => dismissSubnav(item.href, event)}
                        >
                          <span className="navbar-text">{sub.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  )
}
