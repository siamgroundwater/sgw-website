'use client'

import Image from 'next/image'
import Script from 'next/script'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LocalizedLocale } from '@/i18n/config'
import styles from './SocialMediaSection.module.css'

const FACEBOOK_URL = 'https://www.facebook.com/siamgroundwater'
const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@siamgroundwater.co'
const TIKTOK_URL = 'https://www.tiktok.com/@siamgroundwater.co?_r=1&_t=ZS-98eQ9HAfCxV'
const facebookHeight = 480

const socialCopy: Record<
  LocalizedLocale,
  {
    ariaLabel: string
    eyebrow: string
    title: string
    text: string
    facebookText: string
    facebookButton: string
    tiktokText: string
    tiktokButton: string
  }
> = {
  th: {
    ariaLabel: 'ช่องทางโซเชียลมีเดียของสยามกราวด์วอเตอร์',
    eyebrow: 'ติดตามเรา',
    title: 'ติดตามข่าวสารและผลงานของเรา',
    text: 'รับชมผลงานภาคสนาม ข่าวสารด้านน้ำบาดาล และติดต่อทีมงานผ่านช่องทางอย่างเป็นทางการ',
    facebookText: 'อัปเดตโครงการสำรวจ เจาะ พัฒนา และดูแลระบบน้ำบาดาลจากทีมงานของเรา',
    facebookButton: 'เปิดเพจ Facebook',
    tiktokText: 'ติดตามวิดีโอการทำงานภาคสนาม ขั้นตอนงานสำรวจ เจาะ และดูแลระบบน้ำบาดาลจากทีมงานของเรา',
    tiktokButton: 'ติดตามบน TikTok',
  },
  en: {
    ariaLabel: 'Siam Groundwater social media channels',
    eyebrow: 'Follow us',
    title: 'News and field updates from our team',
    text: 'See recent groundwater work, technical updates and official ways to contact Siam Groundwater.',
    facebookText: 'Follow our exploration, drilling, development and groundwater-system maintenance projects.',
    facebookButton: 'Open Facebook page',
    tiktokText: 'Watch our field teams survey, drill, develop and maintain groundwater systems across Thailand.',
    tiktokButton: 'Follow us on TikTok',
  },
  zh: {
    ariaLabel: '暹罗地下水社交媒体渠道',
    eyebrow: '关注我们',
    title: '了解最新资讯和现场项目',
    text: '查看地下水项目动态、专业资讯，并通过官方渠道联系我们。',
    facebookText: '关注勘查、钻井、成井及地下水系统维护项目的最新动态。',
    facebookButton: '打开 Facebook 专页',
    tiktokText: '观看团队在泰国各地进行地下水勘查、钻井、成井及系统维护的现场视频。',
    tiktokButton: '在 TikTok 上关注',
  },
  ja: {
    ariaLabel: 'サイアム・グラウンドウォーターのソーシャルメディア',
    eyebrow: '公式アカウント',
    title: '最新情報と現場実績をご覧ください',
    text: '地下水プロジェクト、技術情報、公式のお問い合わせ窓口をご案内します。',
    facebookText: '調査、掘削、井戸開発、地下水設備保守の最新事例を紹介しています。',
    facebookButton: 'Facebookページを開く',
    tiktokText: 'タイ各地で行う地下水調査、掘削、井戸開発、設備保守の現場動画をご覧ください。',
    tiktokButton: 'TikTokをフォロー',
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
    const element = facebookRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShouldLoadFacebook(true)
        observer.disconnect()
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
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

        <article className={`${styles.socialCard} ${styles.tiktokCard}`}>
          <div className={styles.cardHeader}>
            <Image
              alt=""
              className={styles.socialIcon}
              height={96}
              src="/icons/TikTok.png"
              width={96}
            />
            <div>
              <p>TikTok</p>
              <h3>@siamgroundwater.co</h3>
            </div>
          </div>
          <p className={styles.cardText}>{copy.tiktokText}</p>

          <div className={styles.tiktokEmbedWrap}>
            <blockquote
              cite={TIKTOK_PROFILE_URL}
              className={`tiktok-embed ${styles.tiktokEmbed}`}
              data-embed-from="oembed"
              data-embed-type="creator"
              data-unique-id="siamgroundwater.co"
            >
              <section>
                <a
                  href={`${TIKTOK_PROFILE_URL}?refer=creator_embed`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  @siamgroundwater.co
                </a>
              </section>
            </blockquote>
            <Script
              id="tiktok-creator-embed"
              src="https://www.tiktok.com/embed.js"
              strategy="afterInteractive"
            />
          </div>

          <div className={styles.actions}>
            <a
              className={styles.primaryButton}
              href={TIKTOK_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.tiktokButton}
              <ExternalLink aria-hidden="true" strokeWidth={1.9} />
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}
