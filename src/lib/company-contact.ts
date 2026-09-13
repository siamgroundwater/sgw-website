import type { LocalizedLocale } from '@/i18n/config'

// Shared by the footer and route loading screens; no provider request is needed.
export const companyContact = {
  office: { href: 'tel:027350789', value: '0-2735-0789' },
  wasin: { href: 'tel:0898954757', value: '0898954757' },
  toeng: { href: 'tel:0827447582', value: '0827447582' },
  fax: '0-2375-0791-2',
  email: { href: 'mailto:sgw_th@outlook.com', value: 'sgw_th@outlook.com' },
  social: [
    { name: 'LINE', href: 'https://line.me/R/ti/p/@sgw_th?from=page&searchId=sgw_th', image: '/images/logo/contact/LINE_icon.png', ariaLabel: 'Add LINE: sgw_th' },
    { name: 'Facebook', href: 'https://www.facebook.com/siamgroundwater', image: '/images/logo/contact/Facebook_icon.png', ariaLabel: 'Visit Siam Groundwater on Facebook' },
    { name: 'TikTok', href: 'https://www.tiktok.com/@siamgroundwater.co', image: '/icons/TikTok.png', ariaLabel: 'Visit Siam Groundwater on TikTok' },
  ],
} as const

export const directContactCopy: Record<LocalizedLocale, { wasin: string; toeng: string }> = {
  th: { wasin: 'โทร (คุณวศิน)', toeng: 'โทร (คุณเติ้ง)' },
  en: { wasin: 'Tel (Wasin)', toeng: 'Tel (Toeng)' },
  zh: { wasin: '电话（Wasin）', toeng: '电话（Toeng）' },
  ja: { wasin: '電話（Wasin）', toeng: '電話（Toeng）' },
}
