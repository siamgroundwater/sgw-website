'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail, Phone, Printer } from 'lucide-react'
import { companyContact, directContactCopy } from '@/lib/company-contact'
import {
  localeFromPathname,
  localePath,
  navigationCopy,
} from '@/i18n/config'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const locale = localeFromPathname(pathname)
  const copy = navigationCopy[locale]
  const directContacts = directContactCopy[locale]

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
                <a href={companyContact.office.href} className="footer-link">
                  {copy.phone} {companyContact.office.value}
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Phone aria-hidden="true" />
                </span>
                <a href={companyContact.wasin.href} className="footer-link">
                  {directContacts.wasin}: {companyContact.wasin.value}
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Phone aria-hidden="true" />
                </span>
                <a href={companyContact.toeng.href} className="footer-link">
                  {directContacts.toeng}: {companyContact.toeng.value}
                </a>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Printer aria-hidden="true" />
                </span>
                <span>{copy.fax} {companyContact.fax}</span>
              </p>
              <p className="footer-contact-line">
                <span className="footer-contact-icon">
                  <Mail aria-hidden="true" />
                </span>
                <span>
                  {copy.email}{' '}
                  <a href={companyContact.email.href} className="footer-link">
                    {companyContact.email.value}
                  </a>
                </span>
              </p>
            </div>

            <div className="footer-social">
              {companyContact.social.map(social => (
                <a
                  key={social.name}
                  href={social.href}
                  className="footer-social-item"
                  aria-label={social.ariaLabel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src={social.image} alt={social.name} width={40} height={40} />
                </a>
              ))}
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
    </footer>
  )
}
