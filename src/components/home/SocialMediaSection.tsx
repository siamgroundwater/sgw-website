'use client'

import Image from 'next/image'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import styles from './SocialMediaSection.module.css'

const FACEBOOK_URL = 'https://www.facebook.com/siamgroundwater'
const LINE_URL = 'https://line.me/R/ti/p/@sgw_th?from=page&searchId=sgw_th'
const facebookHeight = 620

const socialCopy: Record<
  LocalizedLocale,
  {
    ariaLabel: string
    eyebrow: string
    title: string
    text: string
    facebookText: string
    facebookButton: string
    lineText: string
    lineButton: string
    contactButton: string
  }
> = {
  th: {
    ariaLabel: 'ช่องทางโซเชียลมีเดียของสยามกราวด์วอเตอร์',
    eyebrow: 'ติดตามเรา',
    title: 'ติดตามข่าวสารและผลงานของเรา',
    text: 'รับชมผลงานภาคสนาม ข่าวสารด้านน้ำบาดาล และติดต่อทีมงานผ่านช่องทางอย่างเป็นทางการ',
    facebookText: 'อัปเดตโครงการสำรวจ เจาะ พัฒนา และดูแลระบบน้ำบาดาลจากทีมงานของเรา',
    facebookButton: 'เปิดเพจ Facebook',
    lineText: 'เพิ่มเพื่อนเพื่อสอบถามบริการ ส่งตำแหน่งโครงการ หรือพูดคุยกับทีมงานโดยตรง',
    lineButton: 'เพิ่มเพื่อนทาง LINE',
    contactButton: 'ติดต่อเรา',
  },
  en: {
    ariaLabel: 'Siam Groundwater social media channels',
    eyebrow: 'Follow us',
    title: 'News and field updates from our team',
    text: 'See recent groundwater work, technical updates and official ways to contact Siam Groundwater.',
    facebookText: 'Follow our exploration, drilling, development and groundwater-system maintenance projects.',
    facebookButton: 'Open Facebook page',
    lineText: 'Add our official account to ask about services, share a project location or contact the team.',
    lineButton: 'Add us on LINE',
    contactButton: 'Contact us',
  },
  zh: {
    ariaLabel: '暹罗地下水社交媒体渠道',
    eyebrow: '关注我们',
    title: '了解最新资讯和现场项目',
    text: '查看地下水项目动态、专业资讯，并通过官方渠道联系我们。',
    facebookText: '关注勘查、钻井、成井及地下水系统维护项目的最新动态。',
    facebookButton: '打开 Facebook 专页',
    lineText: '添加官方账号，咨询服务、发送项目位置或直接联系团队。',
    lineButton: '添加 LINE 好友',
    contactButton: '联系我们',
  },
  ja: {
    ariaLabel: 'サイアム・グラウンドウォーターのソーシャルメディア',
    eyebrow: '公式アカウント',
    title: '最新情報と現場実績をご覧ください',
    text: '地下水プロジェクト、技術情報、公式のお問い合わせ窓口をご案内します。',
    facebookText: '調査、掘削、井戸開発、地下水設備保守の最新事例を紹介しています。',
    facebookButton: 'Facebookページを開く',
    lineText: '公式アカウントを友だち追加して、サービスや事業所在地についてご相談ください。',
    lineButton: 'LINEで友だち追加',
    contactButton: 'お問い合わせ',
  },
}

export default function SocialMediaSection({
  locale = 'th',
}: {
  locale?: LocalizedLocale
}) {
  const facebookRef = useRef<HTMLDivElement | null>(null)
  const [facebookWidth, setFacebookWidth] = useState(420)
  const [shouldLoadFacebook, setShouldLoadFacebook] = useState(false)
  const copy = socialCopy[locale]

  useEffect(() => {
    const element = facebookRef.current
    if (!element) return

    const updateWidth = () => {
      setFacebookWidth(
        Math.max(280, Math.min(500, Math.floor(element.clientWidth)))
      )
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const loadFacebook = () => setShouldLoadFacebook(true)
    if (document.readyState === 'complete') {
      loadFacebook()
      return
    }

    window.addEventListener('load', loadFacebook, { once: true })
    return () => window.removeEventListener('load', loadFacebook)
  }, [])

  const facebookEmbedSrc = useMemo(() => {
    const href = encodeURIComponent(FACEBOOK_URL)
    return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=${facebookWidth}&height=${facebookHeight}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`
  }, [facebookWidth])

  return (
    <section className={styles.socialSection} aria-label={copy.ariaLabel}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
      </div>

      <div className={styles.socialGrid}>
        <article className={styles.socialCard}>
          <div className={styles.cardHeader}>
            <Image
              alt=""
              className={styles.socialIcon}
              height={96}
              src="/images/logo/contact/Facebook_icon.png"
              width={96}
            />
            <div>
              <p>Facebook</p>
              <h3>Siam Groundwater</h3>
            </div>
          </div>
          <p className={styles.cardText}>{copy.facebookText}</p>

          <div ref={facebookRef} className={styles.embedWrap}>
            {shouldLoadFacebook ? (
              <iframe
                key={facebookEmbedSrc}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className={styles.facebookFrame}
                height={facebookHeight}
                loading="lazy"
                src={facebookEmbedSrc}
                title="Siam Groundwater Facebook"
                width={facebookWidth}
              />
            ) : (
              <div className={styles.socialPlaceholder} aria-hidden="true">
                <MessageCircle strokeWidth={1.8} />
                <span>Facebook</span>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <a
              className={styles.primaryButton}
              href={FACEBOOK_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.facebookButton}
              <ExternalLink aria-hidden="true" strokeWidth={1.9} />
            </a>
          </div>
        </article>

        <article className={`${styles.socialCard} ${styles.lineCard}`}>
          <div className={styles.cardHeader}>
            <Image
              alt=""
              className={styles.socialIcon}
              height={96}
              src="/images/logo/contact/LINE_icon.png"
              width={96}
            />
            <div>
              <p>LINE Official</p>
              <h3>@SGW_TH</h3>
            </div>
          </div>
          <p className={styles.cardText}>{copy.lineText}</p>

          <div className={styles.linePanel}>
            <Image
              alt="LINE Official"
              height={96}
              src="/images/logo/contact/LINE_icon.png"
              width={96}
            />
            <span>LINE OA ID</span>
            <strong>@SGW_TH</strong>
          </div>

          <div className={styles.actions}>
            <a
              className={styles.primaryButton}
              href={LINE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.lineButton}
              <ExternalLink aria-hidden="true" strokeWidth={1.9} />
            </a>
            <a
              className={styles.secondaryButton}
              href={localePath('/contact', locale)}
            >
              {copy.contactButton}
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}
