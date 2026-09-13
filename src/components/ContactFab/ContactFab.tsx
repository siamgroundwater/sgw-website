'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { localePath, type SiteLocale } from '@/i18n/config'
import { companyContact } from '@/lib/company-contact'
import styles from './ContactFab.module.css'

const copy: Record<SiteLocale, { open: string; close: string; line: string; office: string; wasin: string; toeng: string; email: string; location: string; newTab: string }> = {
  th: { open: 'เปิดช่องทางติดต่อ', close: 'ปิดช่องทางติดต่อ', line: 'LINE', office: 'สำนักงาน', wasin: 'คุณวศิน', toeng: 'คุณเติ้ง', email: 'อีเมล', location: 'ตำแหน่งที่ตั้ง', newTab: 'เปิดในแท็บใหม่' },
  en: { open: 'Open quick contact', close: 'Close quick contact', line: 'LINE', office: 'Office', wasin: 'Wasin', toeng: 'Toeng', email: 'Email', location: 'Location', newTab: 'Opens in a new tab' },
  zh: { open: '打开快捷联系方式', close: '关闭快捷联系方式', line: 'LINE', office: '办公室', wasin: 'Wasin', toeng: 'Toeng', email: '电子邮箱', location: '位置', newTab: '在新标签页中打开' },
  ja: { open: 'お問い合わせメニューを開く', close: 'お問い合わせメニューを閉じる', line: 'LINE', office: 'オフィス', wasin: 'Wasin', toeng: 'Toeng', email: 'メール', location: '所在地', newTab: '新しいタブで開きます' },
}

type ContactAction = { href: string; label: string; image: string; detail?: string; paddedIcon?: boolean; compactLabel?: boolean; external?: boolean; internal?: boolean }

function ContactFabMenu({ locale }: { locale: SiteLocale }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const text = copy[locale]
  const line = companyContact.social[0]
  const phones = [
    { ...companyContact.office, label: text.office },
    { ...companyContact.wasin, label: text.wasin },
    { ...companyContact.toeng, label: text.toeng },
  ]
  const actions: ContactAction[] = [
    { href: line.href, label: text.line, detail: '@SGW_TH', image: line.image, external: true },
    ...phones.map(phone => ({ href: phone.href, label: phone.label, detail: phone.value, image: '/icons/Phone-2.png' })),
    { href: companyContact.email.href, label: text.email, detail: companyContact.email.value, image: '/icons/Email.png', paddedIcon: true, compactLabel: true },
    { href: localePath('/contact', locale), label: text.location, image: '/icons/Location.png', paddedIcon: true, internal: true },
  ]

  function closeAndFocus() {
    setOpen(false)
    toggleRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.scrollTop = 0
      panelRef.current?.querySelector('a')?.focus({ preventScroll: true })
    })
    function outsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        toggleRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', outsidePointer, true)
    document.addEventListener('keydown', escape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', outsidePointer, true)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-contact-fab
      data-open={open}
      onBlur={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-label={open ? text.close : text.open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(current => !current)}
        data-contact-fab-toggle
      >
        <Image src={open ? '/icons/Call-end.png' : '/icons/Call-start.png'} width={64} height={64} alt="" loading="eager" />
      </button>

      <nav
        ref={panelRef}
        id={panelId}
        aria-label={text.open}
        className={styles.panel}
        hidden={!open}
        inert={!open}
        data-contact-fab-panel
      >
        {actions.map(action => {
          const content = <>
            <span className={`${styles.label}${action.compactLabel ? ` ${styles.emailLabel}` : ''}`}>{action.label}:{action.detail ? ` ${action.detail}` : ''}</span>
            <span className={`${styles.icon}${action.paddedIcon ? ` ${styles.iconPadded}` : ''}`} aria-hidden="true"><Image src={action.image} width={56} height={56} alt="" /></span>
          </>
          const actionProps = {
            className: styles.item,
            onClick: closeAndFocus,
            'aria-label': `${action.label}${action.detail ? `: ${action.detail}` : ''}${action.external ? ` — ${text.newTab}` : ''}`,
          }
          return action.internal
            ? <Link key={action.href} href={action.href} {...actionProps}>{content}</Link>
            : <a key={action.href} href={action.href} target={action.external ? '_blank' : undefined} rel="noopener noreferrer" {...actionProps}>{content}</a>
        })}
      </nav>
    </div>
  )
}

export default function ContactFab({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname()
  // Remount closed on navigation, without a stale open panel or delayed reset.
  return <ContactFabMenu key={pathname} locale={locale} />
}
