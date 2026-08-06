import Image from 'next/image'
import { ExternalLink, MapPinned } from 'lucide-react'
import type { LocalizedLocale } from '@/i18n/config'
import styles from './LegacyProjectMapSection.module.css'

type LegacyMapCopy = {
  eyebrow: string
  title: string
  intro: string
  imageAlt: string
  note: string
  action: string
}

const copyByLocale: Record<LocalizedLocale, LegacyMapCopy> = {
  th: {
    eyebrow: 'ผลงานในอดีต',
    title: 'แผนที่ประสบการณ์โครงการทั่วประเทศไทย',
    intro:
      'แผนที่จากเว็บไซต์เดิมรวบรวมสถานที่ตั้งและหน่วยงานจากผลงานที่ผ่านมา ใช้ภาพขนาดเต็มเพื่ออ่านรายละเอียดของแต่ละพื้นที่ได้ชัดเจนยิ่งขึ้น',
    imageAlt: 'แผนที่โครงการและลูกค้าในอดีตของสยามกราวด์วอเตอร์ทั่วประเทศไทย',
    note:
      'ข้อมูลในภาพเป็นบันทึกผลงานในอดีต อาจไม่สะท้อนชื่อหน่วยงาน สถานะโครงการ หรือความร่วมมือในปัจจุบัน',
    action: 'เปิดภาพขนาดเต็ม',
  },
  en: {
    eyebrow: 'Historical portfolio',
    title: 'A nationwide map of project experience',
    intro:
      'Recovered from our previous website, this map records locations and organisations from earlier work. Open the full-resolution image to inspect regional details.',
    imageAlt: 'Map of historical Siam Groundwater customers and projects across Thailand',
    note:
      'This image is an archival project record and may not reflect current organisation names, project status, or partnerships.',
    action: 'Open full-size image',
  },
  zh: {
    eyebrow: '历史项目档案',
    title: '覆盖泰国各地的项目经验地图',
    intro:
      '这张从旧网站整理的地图记录了过往项目的地点与机构。可打开原尺寸图片查看各地区的详细信息。',
    imageAlt: '暹罗地下水在泰国各地的历史客户与项目地图',
    note: '图片为历史项目记录，机构名称、项目状态或合作关系可能与当前情况不同。',
    action: '打开原尺寸图片',
  },
  ja: {
    eyebrow: '過去の実績',
    title: 'タイ全土に広がるプロジェクト経験',
    intro:
      '旧ウェブサイトから復元した、過去のプロジェクト所在地と組織をまとめたマップです。地域ごとの詳細は原寸画像でご確認いただけます。',
    imageAlt: 'タイ全土におけるサイアム・グラウンドウォーターの過去のお客様とプロジェクトの地図',
    note:
      '本画像は過去の実績記録です。組織名、プロジェクト状況、提携関係は現在と異なる場合があります。',
    action: '原寸画像を開く',
  },
}

export default function LegacyProjectMapSection({
  locale = 'th',
}: {
  locale?: LocalizedLocale
}) {
  const copy = copyByLocale[locale]
  const imagePath = '/images/customers/legacy-project-map.jpg'

  return (
    <aside className={styles.section} aria-labelledby="legacy-project-map-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <MapPinned aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h3 id="legacy-project-map-title">{copy.title}</h3>
        <p className={styles.intro}>{copy.intro}</p>
        <p className={styles.note}>{copy.note}</p>
        <a
          href={imagePath}
          target="_blank"
          rel="noreferrer"
          className={styles.action}
        >
          {copy.action}
          <ExternalLink aria-hidden="true" />
        </a>
      </div>

      <a
        href={imagePath}
        target="_blank"
        rel="noreferrer"
        className={styles.mapPanel}
        aria-label={copy.action}
      >
        <Image
          src={imagePath}
          alt={copy.imageAlt}
          width={1808}
          height={2560}
          sizes="(width <= 760px) 88vw, (width <= 1100px) 54vw, 600px"
          className={styles.mapImage}
          priority
        />
      </a>
    </aside>
  )
}
