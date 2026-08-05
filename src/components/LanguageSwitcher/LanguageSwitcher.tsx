'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  SITE_LOCALES,
  localeFromPathname,
  localeInfo,
  localePath,
  navigationCopy,
} from '@/i18n/config'

type LanguageSwitcherProps = {
  mobile?: boolean
}

export default function LanguageSwitcher({ mobile = false }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const activeLocale = localeFromPathname(pathname)
  const active = localeInfo[activeLocale]
  const copy = navigationCopy[activeLocale]
  const rootClass = mobile ? 'navbar-mobile-lang' : 'navbar-lang'
  const buttonClass = mobile ? 'navbar-mobile-lang-btn' : 'navbar-lang-btn'
  const menuClass = mobile ? 'navbar-mobile-lang-menu' : 'navbar-lang-menu'
  const itemClass = mobile
    ? 'navbar-mobile-lang-menu-item'
    : 'navbar-lang-menu-item'
  const codeClass = mobile ? 'navbar-mobile-lang-code' : 'navbar-lang-code'
  const menuId = mobile ? 'mobile-language-menu' : 'desktop-language-menu'

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div
      ref={switcherRef}
      className={`${rootClass}${isOpen ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className={buttonClass}
        aria-label={copy.languageLabel}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Image
          src={active.flag}
          alt=""
          width={mobile ? 34 : 30}
          height={mobile ? 23 : 20}
        />
        <span className={codeClass}>{active.code}</span>
      </button>

      {isOpen && (
        <div
          id={menuId}
          className={menuClass}
          role="menu"
          aria-label={copy.languageLabel}
        >
          {SITE_LOCALES.map((locale) => {
            const info = localeInfo[locale]
            return (
              <a
                key={locale}
                href={localePath(pathname, locale)}
                hrefLang={info.htmlLang}
                lang={info.htmlLang}
                className={itemClass}
                role="menuitem"
                aria-current={locale === activeLocale ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src={info.flag}
                  alt=""
                  width={mobile ? 30 : 26}
                  height={mobile ? 20 : 18}
                />
                <span>{info.name}</span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
