import { ArrowUpRight, Mail, Phone, Printer } from 'lucide-react'
import { companyContact, directContactCopy } from '@/lib/company-contact'
import styles from './RouteLoading.module.css'

export type RouteLoadingLocale = 'th' | 'en' | 'zh' | 'ja'

type RouteLoadingProps = {
  locale: RouteLoadingLocale
  variant?: 'public' | 'cms'
}

const publicCopy: Record<RouteLoadingLocale, { title: string; hint: string }> = {
  th: { title: 'กำลังเตรียมหน้าให้คุณ', hint: 'เนื้อหาจะพร้อมใช้งานในอีกสักครู่' },
  en: { title: 'Preparing your page', hint: 'Your content will be ready in a moment.' },
  zh: { title: '正在准备页面', hint: '内容即将显示。' },
  ja: { title: 'ページを準備しています', hint: 'まもなくコンテンツが表示されます。' },
}

const cmsCopy = {
  th: { title: 'กำลังเปิดพื้นที่จัดการ', hint: 'ระบบกำลังเตรียมข้อมูล CMS ให้พร้อม' },
  en: { title: 'Opening the CMS workspace', hint: 'The CMS is preparing your data.' },
}

const contactCopy: Record<RouteLoadingLocale, { title: string; hint: string; office: string; email: string; fax: string; newTab: string }> = {
  th: { title: 'ติดต่อสยามกราวด์วอเตอร์', hint: 'ระหว่างรอ เลือกช่องทางติดต่อที่สะดวกได้เลย', office: 'โทรสำนักงาน', email: 'อีเมล', fax: 'แฟกซ์', newTab: 'เปิดในแท็บใหม่' },
  en: { title: 'Contact Siam Groundwater', hint: 'While you wait, reach us through your preferred channel.', office: 'Office phone', email: 'Email', fax: 'Fax', newTab: 'Opens in a new tab' },
  zh: { title: '联系 Siam Groundwater', hint: '等待期间，您可以选择方便的方式联系我们。', office: '办公室电话', email: '电子邮箱', fax: '传真', newTab: '在新标签页中打开' },
  ja: { title: 'Siam Groundwater へのお問い合わせ', hint: 'お待ちの間も、お好きな方法でお問い合わせいただけます。', office: 'オフィス電話', email: 'メール', fax: 'FAX', newTab: '新しいタブで開きます' },
}

export default function RouteLoading({ locale, variant = 'public' }: RouteLoadingProps) {
  const copy = variant === 'cms'
    ? cmsCopy[locale === 'th' ? 'th' : 'en']
    : publicCopy[locale]
  const contact = contactCopy[locale]
  const direct = directContactCopy[locale]
  const phones = [
    { ...companyContact.office, label: contact.office },
    { ...companyContact.wasin, label: direct.wasin },
    { ...companyContact.toeng, label: direct.toeng },
  ]

  return (
    <main
      className={`${styles.loading} ${variant === 'cms' ? styles.cms : styles.public}`}
      data-loading-page={variant}
    >
      <div className={styles.card}>
        <div className={styles.hero}>
          <div className={styles.mark} aria-hidden="true">
            <span className={styles.ripple} />
            <span className={styles.rippleDelay} />
            <span className={styles.logoShell}>
              <img src="/images/logo/logo_SGW_white.svg" alt="" width={88} height={88} />
            </span>
          </div>
          <div className={styles.intro}>
            <p className={styles.brand}>SIAM GROUNDWATER <span>{variant === 'cms' ? 'CMS' : 'SGW'}</span></p>
            <div className={styles.copy} role="status" aria-live="polite" aria-atomic="true" data-loading-status>
              <strong className={styles.statusTitle}>{copy.title}</strong>
              <p>{copy.hint}</p>
            </div>
            <div className={styles.progress} aria-hidden="true"><span /></div>
          </div>
        </div>
        <section className={styles.contact} aria-label={contact.title} data-loading-contact>
          <div className={styles.contactHeading}>
            <h2>{contact.title}</h2>
            <p>{contact.hint}</p>
          </div>
          <div className={styles.phoneGrid}>
            {phones.map(phone => (
              <a key={phone.href} href={phone.href} className={styles.phoneLink}>
                <span className={styles.contactIcon}><Phone aria-hidden="true" /></span>
                <span className={styles.contactText}><span>{phone.label}</span><strong>{phone.value}</strong></span>
                <ArrowUpRight className={styles.linkArrow} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className={styles.details}>
            <a href={companyContact.email.href} className={styles.email}>
              <Mail aria-hidden="true" />
              <span><span className={styles.detailLabel}>{contact.email}</span><span>{companyContact.email.value}</span></span>
              <ArrowUpRight className={styles.linkArrow} aria-hidden="true" />
            </a>
            <p className={styles.fax}>
              <Printer aria-hidden="true" />
              <span><span className={styles.detailLabel}>{contact.fax}</span><span>{companyContact.fax}</span></span>
            </p>
          </div>
          <div className={styles.social}>
            {companyContact.social.map(social => (
              <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.name} — ${contact.newTab}`}>
                <img src={social.image} alt="" width={28} height={28} />
                <span>{social.name}</span>
                <ArrowUpRight className={styles.linkArrow} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
