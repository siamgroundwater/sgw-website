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

export default function RouteLoading({ locale, variant = 'public' }: RouteLoadingProps) {
  const copy = variant === 'cms'
    ? cmsCopy[locale === 'th' ? 'th' : 'en']
    : publicCopy[locale]

  return (
    <main
      className={`${styles.loading} ${variant === 'cms' ? styles.cms : styles.public}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <section className={styles.card}>
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.ripple} />
          <span className={styles.rippleDelay} />
          <span className={styles.logoShell}>
            <img src="/images/logo/logo_SGW_white.svg" alt="" />
          </span>
        </div>

        <div className={styles.copy}>
          <strong>{copy.title}</strong>
          <span>{copy.hint}</span>
        </div>

        <span className={styles.progress} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </section>
    </main>
  )
}
