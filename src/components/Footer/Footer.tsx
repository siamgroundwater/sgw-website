'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUp, Mail, Phone, Printer } from 'lucide-react'
import {
  localeFromPathname,
  localePath,
  navigationCopy,
} from '@/i18n/config'
import './Footer.css'

const directContactCopy = {
  th: { wasin: 'โทร (คุณวศิน)', toeng: 'โทร (คุณเติ้ง)' },
  en: { wasin: 'Tel (Wasin)', toeng: 'Tel (Toeng)' },
  zh: { wasin: '电话（Wasin）', toeng: '电话（Toeng）' },
  ja: { wasin: '電話（Wasin）', toeng: '電話（Toeng）' },
}

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const locale = localeFromPathname(pathname)
  const copy = navigationCopy[locale]
  const directContacts = directContactCopy[locale]

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer
      className="footer"
      role="contentinfo"
      itemScope
      itemType="https://schema.org/WPFooter"
    >
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href={localePath('/', locale)} className="footer-logo">
              <Image
                src="/images/logo/logo_SGW_white.svg"
                alt="Siam Groundwater logo"
                width={104}
                height={104}
              />
            </Link>

            <div className="footer-brand-copy">
              <strong>{copy.company}</strong>
              <address>{copy.address}</address>
            </div>
          </div>

          <div className="footer-contact-area">
            <div className="footer-contact">
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Phone aria-hidden="true" />
                </span>
                <a href="tel:027350789" className="footer-link">
                  {copy.phone} 0-2735-0789
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Phone aria-hidden="true" />
                </span>
                <a href="tel:0898954757" className="footer-link">
                  {directContacts.wasin}: 0898954757
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Phone aria-hidden="true" />
                </span>
                <a href="tel:0827447582" className="footer-link">
                  {directContacts.toeng}: 0827447582
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Printer aria-hidden="true" />
                </span>
                <span>{copy.fax} 0-2375-0791-2</span>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Mail aria-hidden="true" />
                </span>
                <span>
                  {copy.email}{' '}
                  <a href="mailto:sgw_th@outlook.com" className="footer-link">
                    sgw_th@outlook.com
                  </a>
                </span>
              </p>
            </div>

            <div className="footer-social">
              <a
                href="https://line.me/R/ti/p/@sgw_th?from=page&searchId=sgw_th"
                className="footer-social-item"
                aria-label="Add LINE: sgw_th"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/logo/contact/LINE_icon.png"
                  alt="LINE"
                  width={40}
                  height={40}
                />
              </a>

              <a
                href="https://www.facebook.com/siamgroundwater"
                className="footer-social-item"
                aria-label="Visit Siam Groundwater on Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/logo/contact/Facebook_icon.png"
                  alt="Facebook"
                  width={40}
                  height={40}
                />
              </a>

              <a
                href="https://www.tiktok.com/@siamgroundwater.co"
                className="footer-social-item"
                aria-label="Visit Siam Groundwater on TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/icons/TikTok.png"
                  alt="TikTok"
                  width={40}
                  height={40}
                />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} SIAMGROUNDWATER CO., LTD.</p>
          <Link href={localePath('/privacy', locale)} className="footer-link">
            {copy.privacy}
          </Link>
        </div>
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="footer-back-to-top"
          onClick={handleBackToTop}
          aria-label={copy.backToTop}
        >
          <span className="sr-only">{copy.backToTop}</span>
          <ArrowUp aria-hidden="true" className="footer-back-to-top-icon" />
        </button>
      )}
    </footer>
  )
}
