import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, History } from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import styles from './CustomerHistorySection.module.css'

type CustomerHistoryCopy = {
  eyebrow: string
  title: string
  intro: string
  imageAlt: string
  note: string
  action: string
}

const copyByLocale: Record<LocalizedLocale, CustomerHistoryCopy> = {
  th: {
    eyebrow: 'ประสบการณ์ที่สั่งสม',
    title: 'ส่วนหนึ่งของลูกค้าและโครงการที่ผ่านมา',
    intro:
      'ตัวอย่างหน่วยงานและองค์กรที่บริษัทเคยให้บริการหรือมีผลงานร่วมในอดีต สะท้อนประสบการณ์งานน้ำบาดาลในหลายภาคธุรกิจทั่วประเทศ',
    imageAlt: 'เครื่องหมายของลูกค้าและองค์กรจากผลงานในอดีตของสยามกราวด์วอเตอร์',
    note:
      'เครื่องหมายการค้าเป็นทรัพย์สินของเจ้าของแต่ละราย และการนำเสนอในส่วนนี้ไม่ได้หมายถึงความร่วมมือในปัจจุบัน',
    action: 'ดูผลงานทั้งหมด',
  },
  en: {
    eyebrow: 'Experience built over time',
    title: 'Selected past customers and projects',
    intro:
      'A selection of organisations we have previously served or worked with, reflecting groundwater experience across industries throughout Thailand.',
    imageAlt: 'Logos of selected past Siam Groundwater customers and project organisations',
    note:
      'All trademarks belong to their respective owners. Their inclusion here does not imply a current partnership or endorsement.',
    action: 'Explore all projects',
  },
  zh: {
    eyebrow: '长期积累的经验',
    title: '部分过往客户与项目',
    intro:
      '展示我们曾服务或合作过的部分机构，体现暹罗地下水在泰国各行业积累的地下水项目经验。',
    imageAlt: '暹罗地下水部分过往客户与项目机构标志',
    note: '所有商标均归各自所有者所有；在此展示不代表目前仍存在合作或背书关系。',
    action: '查看全部项目',
  },
  ja: {
    eyebrow: '積み重ねてきた経験',
    title: 'これまでのお客様とプロジェクトの一例',
    intro:
      '過去にサービスを提供、またはプロジェクトをご一緒した組織の一例です。タイ各地の幅広い業種で培った地下水事業の経験をご紹介します。',
    imageAlt: 'サイアム・グラウンドウォーターの過去のお客様とプロジェクト組織のロゴ',
    note:
      '各商標はそれぞれの所有者に帰属します。掲載は現在の提携や推奨を示すものではありません。',
    action: '施工実績を見る',
  },
}

export default function CustomerHistorySection({
  locale,
}: {
  locale?: LocalizedLocale
} = {}) {
  const resolvedLocale = locale ?? 'th'
  const copy = copyByLocale[resolvedLocale]
  const projectsHref = locale ? localePath('/projects', locale) : '/projects'

  return (
    <section className={styles.section} aria-labelledby="customer-history-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>
          <History aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h2 id="customer-history-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>

      <div className={styles.logoPanel}>
        <Image
          src="/images/customers/legacy-customer-logos.png"
          alt={copy.imageAlt}
          width={4400}
          height={1663}
          sizes="(width <= 760px) 94vw, 1160px"
          className={styles.logoImage}
          loading="lazy"
        />
      </div>

      <div className={styles.footer}>
        <Link href={projectsHref} className={styles.action}>
          {copy.action}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
