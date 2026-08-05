'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Play } from 'lucide-react'
import type { LocalizedLocale } from '@/i18n/config'
import styles from './CompanyVideoSection.module.css'

const VIDEO_ID = 'oGMta6GCx5A'

const copy: Record<LocalizedLocale, {
  eyebrow: string
  title: string
  text: string
  play: string
  youtube: string
}> = {
  th: {
    eyebrow: 'ทีมงานและงานภาคสนาม',
    title: 'รู้จักสยามกราวด์วอเตอร์',
    text: 'ชมภาพการทำงานจริงของทีมสำรวจ เจาะ ซ่อม และพัฒนาระบบน้ำบาดาลของเรา',
    play: 'ชมวิดีโอแนะนำบริษัท',
    youtube: 'เปิดใน YouTube',
  },
  en: {
    eyebrow: 'Our people and field work',
    title: 'Meet Siam Groundwater',
    text: 'See our survey, drilling, maintenance and groundwater development teams at work.',
    play: 'Play company video',
    youtube: 'Open in YouTube',
  },
  zh: {
    eyebrow: '团队与现场工作',
    title: '了解暹罗地下水',
    text: '观看我们的勘察、钻井、维护与地下水开发团队如何开展现场工作。',
    play: '播放公司介绍视频',
    youtube: '在 YouTube 中打开',
  },
  ja: {
    eyebrow: 'チームと現場作業',
    title: 'サイアム・グラウンドウォーターを知る',
    text: '調査、掘削、保守、地下水開発に取り組む現場チームの様子をご覧ください。',
    play: '会社紹介動画を見る',
    youtube: 'YouTubeで開く',
  },
}

export default function CompanyVideoSection({ locale }: { locale: LocalizedLocale }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const content = copy[locale]

  return (
    <section id="company-video" className={styles.section} aria-labelledby="company-video-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{content.eyebrow}</p>
        <h2 id="company-video-title">{content.title}</h2>
        <p className={styles.text}>{content.text}</p>
        <a
          className={styles.youtubeLink}
          href={`https://www.youtube.com/watch?v=${VIDEO_ID}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content.youtube}
          <ExternalLink aria-hidden="true" />
        </a>
      </div>

      <div className={styles.videoFrame}>
        {isPlaying ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
            title={content.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className={styles.videoButton}
            onClick={() => setIsPlaying(true)}
            aria-label={content.play}
          >
            <Image
              src={`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
              alt=""
              fill
              loading="lazy"
              sizes="(width <= 900px) 100vw, 58vw"
            />
            <span className={styles.overlay} aria-hidden="true" />
            <span className={styles.playIcon} aria-hidden="true"><Play fill="currentColor" /></span>
            <span className={styles.playLabel}>{content.play}</span>
          </button>
        )}
      </div>
    </section>
  )
}
