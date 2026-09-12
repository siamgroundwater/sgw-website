'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Printer,
  ReceiptText,
} from 'lucide-react'
import type { LocalizedLocale } from '@/i18n/config'
import './ContactDetails.css'

type ContactDetailsProps = {
  locale?: LocalizedLocale
  officeAddress: string
  phoneTitle: string
  emailTitle: string
  contactTitle: string
  locationTitle: string
  locationAction: string
}

type ContactMethod = {
  id: string
  href?: string
  title: string
  detail: string
  copyValue: string
  icon: ReactNode
  external?: boolean
}

const uiCopy: Record<
  LocalizedLocale,
  {
    copy: string
    copied: string
    mapEyebrow: string
    mapTitle: string
    mapDescription: string
    mapLoading: string
    copyAddress: string
    taxId: string
  }
> = {
  th: {
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    mapEyebrow: 'แผนที่สำนักงาน',
    mapTitle: 'วางแผนเส้นทางก่อนเดินทาง',
    mapDescription: 'ซูมและเลื่อนแผนที่เพื่อดูตำแหน่งสำนักงาน หรือเปิด Google Maps สำหรับการนำทางแบบเรียลไทม์',
    mapLoading: 'กำลังโหลดแผนที่สำนักงาน',
    copyAddress: 'คัดลอกที่อยู่',
    taxId: 'เลขประจำตัวผู้เสียภาษี',
  },
  en: {
    copy: 'Copy',
    copied: 'Copied',
    mapEyebrow: 'Office map',
    mapTitle: 'Plan your route before visiting',
    mapDescription: 'Zoom and move the map to inspect our location, or open Google Maps for live navigation.',
    mapLoading: 'Loading office map',
    copyAddress: 'Copy address',
    taxId: 'Tax ID',
  },
  zh: {
    copy: '复制',
    copied: '已复制',
    mapEyebrow: '办公室地图',
    mapTitle: '到访前规划路线',
    mapDescription: '可缩放和移动地图查看办公室位置，或打开Google Maps进行实时导航。',
    mapLoading: '正在加载办公室地图',
    copyAddress: '复制地址',
    taxId: '税务登记号',
  },
  ja: {
    copy: 'コピー',
    copied: 'コピー済み',
    mapEyebrow: 'オフィスマップ',
    mapTitle: 'ご来社前にルートを確認',
    mapDescription: '地図を拡大・移動して所在地を確認するか、Google Mapsでナビゲーションを開始できます。',
    mapLoading: 'オフィスマップを読み込み中',
    copyAddress: '住所をコピー',
    taxId: '納税者番号',
  },
}

const officeMapUrl =
  'https://www.openstreetmap.org/export/embed.html?bbox=100.6425%2C13.755%2C100.6569%2C13.768&layer=mapnik&marker=13.761439%2C100.649723'
const googleMapUrl =
  'https://www.google.com/maps/search/?api=1&query=13.761439%2C100.649723'

export default function ContactDetails({
  locale = 'th',
  officeAddress,
  phoneTitle,
  emailTitle,
  contactTitle,
  locationTitle,
  locationAction,
}: ContactDetailsProps) {
  const copy = uiCopy[locale]
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const methods: ContactMethod[] = [
    {
      id: 'office-phone',
      href: 'tel:027350789',
      title: phoneTitle,
      detail: '0-2735-0789',
      copyValue: '0-2735-0789',
      icon: <Phone aria-hidden="true" />,
    },
    {
      id: 'fax',
      title: 'FAX',
      detail: '0-2375-0791-2',
      copyValue: '0-2375-0791-2',
      icon: <Printer aria-hidden="true" />,
    },
    {
      id: 'email',
      href: 'mailto:sgw_th@outlook.com',
      title: emailTitle,
      detail: 'sgw_th@outlook.com',
      copyValue: 'sgw_th@outlook.com',
      icon: <Mail aria-hidden="true" />,
    },
    {
      id: 'direct-phone',
      href: 'tel:0898954757',
      title: contactTitle,
      detail: '089-895-4757',
      copyValue: '089-895-4757',
      icon: <Phone aria-hidden="true" />,
    },
    {
      id: 'tax-id',
      title: copy.taxId,
      detail: '0105530015432',
      copyValue: '0105530015432',
      icon: <ReceiptText aria-hidden="true" />,
    },
    {
      id: 'facebook',
      href: 'https://www.facebook.com/siamgroundwater',
      title: 'Facebook',
      detail: 'Siam Groundwater',
      copyValue: 'https://www.facebook.com/siamgroundwater',
      icon: <Image src="/images/logo/contact/Facebook_icon.png" alt="" width={52} height={52} />,
      external: true,
    },
    {
      id: 'line',
      href: 'https://line.me/R/ti/p/@sgw_th?from=page&searchId=sgw_th',
      title: 'LINE Official',
      detail: '@SGW_TH',
      copyValue: '@SGW_TH',
      icon: <Image src="/images/logo/contact/LINE_icon.png" alt="" width={52} height={52} />,
      external: true,
    },
    {
      id: 'tiktok',
      href: 'https://www.tiktok.com/@siamgroundwater.co',
      title: 'TikTok',
      detail: '@siamgroundwater.co',
      copyValue: 'https://www.tiktok.com/@siamgroundwater.co',
      icon: <Image src="/icons/TikTok.png" alt="" width={52} height={52} />,
      external: true,
    },
  ]

  const copyText = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const input = document.createElement('textarea')
      input.value = value
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600)
  }

  return (
    <section className="contact-main">
      <div className="contact-layout">
        <div className="contact-methods">
          {methods.map((method) => {
            const isCopied = copiedId === method.id
            const cardContent = (
              <>
                <span className="contact-card-icon">{method.icon}</span>
                <span className="contact-card-text">
                  <strong className="contact-card-title">{method.title}</strong>
                  <span className="contact-card-detail">{method.detail}</span>
                </span>
              </>
            )
            return (
              <article className={`contact-card${method.external ? ' contact-card--social' : ''}`} key={method.id}>
                {method.href ? (
                  <a
                    href={method.href}
                    className="contact-card-link"
                    target={method.external ? '_blank' : undefined}
                    rel={method.external ? 'noopener noreferrer' : undefined}
                  >
                    {cardContent}
                  </a>
                ) : <div className="contact-card-link">{cardContent}</div>}
                <button
                  type="button"
                  className={`contact-copy-button${isCopied ? ' is-copied' : ''}`}
                  aria-label={`${copy.copy} ${method.title}: ${method.detail}`}
                  onClick={() => copyText(method.id, method.copyValue)}
                >
                  {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
              </article>
            )
          })}
        </div>

        <section className="contact-map-panel" aria-labelledby="contact-map-title">
          <div className="contact-map-heading">
            <div>
              <p className="contact-map-kicker">{copy.mapEyebrow}</p>
              <h2 id="contact-map-title">{copy.mapTitle}</h2>
              <p>{copy.mapDescription}</p>
            </div>
            <a href={googleMapUrl} target="_blank" rel="noopener noreferrer">
              <Navigation aria-hidden="true" />
              {locationAction}
              <ExternalLink aria-hidden="true" />
            </a>
          </div>

          <div className="contact-map-frame">
            <iframe
              src={officeMapUrl}
              title={`${locationTitle} — OpenStreetMap`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              aria-label={copy.mapLoading}
            />
          </div>

          <div className="contact-map-address">
            <MapPin aria-hidden="true" />
            <div>
              <strong>{locationTitle}</strong>
              <span>{officeAddress}</span>
            </div>
            <button
              type="button"
              className={copiedId === 'address' ? 'is-copied' : ''}
              onClick={() => copyText('address', officeAddress)}
            >
              {copiedId === 'address' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copiedId === 'address' ? copy.copied : copy.copyAddress}
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}
