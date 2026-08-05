import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Construction,
  Droplets,
  FileText,
  Layers3,
  MapPinned,
  MessageCircle,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  SERVICE_KEYS,
  type LocalizedContent,
  type ServiceKey,
} from '@/i18n/localized-content'
import {
  recoveredThaiServiceDetails,
  recoveredThaiServicePromises,
  type ServiceDetailBlock,
} from '@/data/service-page-details'
import './ServiceDetailPage.css'

type ServiceDetailPageProps = {
  locale: LocalizedLocale
  content: LocalizedContent
  serviceKey: ServiceKey
  localized?: boolean
}

type ServiceUiCopy = {
  chooseService: string
  scopeIntro: string
  processIntro: string
  detailsEyebrow: string
  detailsTitle: string
  detailsIntro: string
  galleryEyebrow: string
  galleryTitle: string
  fieldPhoto: string
  ctaEyebrow: string
  ctaTitle: string
  ctaText: string
  allServices: string
}

const serviceUiCopy: Record<LocalizedLocale, ServiceUiCopy> = {
  th: {
    chooseService: 'เลือกบริการ',
    scopeIntro:
      'ขอบเขตงานเชื่อมต่อข้อมูลภาคสนาม การออกแบบ และการใช้งานจริง เพื่อให้ทุกขั้นตอนตรวจสอบและส่งต่อกันได้',
    processIntro:
      'เริ่มจากโจทย์ของพื้นที่ เก็บข้อมูลที่จำเป็น แล้วจึงเลือกวิธีทำงานและเกณฑ์ตรวจรับที่เหมาะสมกับโครงการ',
    detailsEyebrow: 'ความเชี่ยวชาญเฉพาะงาน',
    detailsTitle: 'รายละเอียดบริการ',
    detailsIntro:
      'เรียบเรียงจากข้อมูลบริการเดิมของบริษัท และปรับโครงสร้างให้อ่านง่ายขึ้นโดยคงสาระทางเทคนิคที่สำคัญ',
    galleryEyebrow: 'จากพื้นที่ปฏิบัติงาน',
    galleryTitle: 'ภาพการทำงานจริงของทีมสยามกราวด์วอเตอร์',
    fieldPhoto: 'ภาพจากการปฏิบัติงานของสยามกราวด์วอเตอร์',
    ctaEyebrow: 'เริ่มต้นโครงการ',
    ctaTitle: 'ส่งข้อมูลพื้นที่และความต้องการใช้น้ำให้ทีมงาน',
    ctaText:
      'แจ้งตำแหน่งโครงการ ปริมาณน้ำที่ต้องการ ข้อมูลบ่อเดิม หรืออาการผิดปกติ เพื่อให้ทีมที่เกี่ยวข้องประเมินเบื้องต้น',
    allServices: 'ดูบริการทั้งหมด',
  },
  en: {
    chooseService: 'Choose a service',
    scopeIntro:
      'Field evidence, design decisions and operating needs stay connected, giving each stage a clear purpose and handover.',
    processIntro:
      'We begin with the site objective, collect the evidence that matters, then define a suitable method and measurable acceptance criteria.',
    detailsEyebrow: 'Specialist capability',
    detailsTitle: 'Service details',
    detailsIntro:
      'A clear technical view of the work, decisions and deliverables behind this service.',
    galleryEyebrow: 'From the field',
    galleryTitle: 'Siam Groundwater teams at work',
    fieldPhoto: 'Siam Groundwater field operation',
    ctaEyebrow: 'Start a project',
    ctaTitle: 'Share your site and water requirements with our team',
    ctaText:
      'Send the location, required flow, existing well records or operating symptoms for an initial technical review.',
    allServices: 'View all services',
  },
  zh: {
    chooseService: '选择服务',
    scopeIntro:
      '将现场证据、设计决策与实际运行需求贯通，让每个阶段都有明确目标和可追溯交付。',
    processIntro:
      '从场地目标出发，收集关键资料，再确定合适的工作方法和可衡量的验收标准。',
    detailsEyebrow: '专项能力',
    detailsTitle: '服务详情',
    detailsIntro: '清晰说明该项服务所涉及的技术工作、判断依据与交付内容。',
    galleryEyebrow: '现场实录',
    galleryTitle: '暹罗地下水团队现场工作',
    fieldPhoto: '暹罗地下水现场作业照片',
    ctaEyebrow: '启动项目',
    ctaTitle: '将场地与用水需求发送给我们的团队',
    ctaText: '请提供位置、所需流量、既有井资料或运行异常，以便进行初步技术评估。',
    allServices: '查看全部服务',
  },
  ja: {
    chooseService: 'サービスを選ぶ',
    scopeIntro:
      '現場データ、設計判断、実際の運用条件を一貫してつなぎ、各工程の目的と引渡し内容を明確にします。',
    processIntro:
      '敷地の目的から始め、必要な根拠を集めたうえで、適切な方法と測定可能な検収基準を定めます。',
    detailsEyebrow: '専門技術',
    detailsTitle: 'サービス詳細',
    detailsIntro: 'このサービスを支える技術作業、判断、成果物をわかりやすく説明します。',
    galleryEyebrow: '現場から',
    galleryTitle: 'サイアム・グラウンドウォーターの現場作業',
    fieldPhoto: 'サイアム・グラウンドウォーターの現場作業写真',
    ctaEyebrow: 'プロジェクトを始める',
    ctaTitle: '敷地情報と必要水量をお知らせください',
    ctaText:
      '所在地、必要流量、既存井戸資料、運転上の症状をお送りいただければ、初期技術確認を行います。',
    allServices: 'すべてのサービスを見る',
  },
}

const serviceIcons: Record<ServiceKey, LucideIcon> = {
  survey: ScanSearch,
  drilling: Construction,
  maintenance: Wrench,
  consult: Stethoscope,
}

const scopeIcons: LucideIcon[] = [
  MapPinned,
  Droplets,
  CircleGauge,
  ClipboardCheck,
]

const serviceAssets: Record<
  ServiceKey,
  { hero: string; gallery: [string, string, string] }
> = {
  survey: {
    hero: '/images/services/survey/legacy-01.jpg',
    gallery: [
      '/images/services/survey/legacy-01.jpg',
      '/images/services/survey/legacy-02.jpg',
      '/images/services/survey/legacy-03.jpg',
    ],
  },
  drilling: {
    hero: '/images/services/drilling/legacy-01.jpg',
    gallery: [
      '/images/services/drilling/legacy-01.jpg',
      '/images/services/drilling/legacy-02.jpg',
      '/images/services/drilling/legacy-03.jpg',
    ],
  },
  maintenance: {
    hero: '/images/services/maintenance/legacy-01.jpg',
    gallery: [
      '/images/services/maintenance/legacy-01.jpg',
      '/images/services/maintenance/legacy-02.jpg',
      '/images/services/maintenance/legacy-03.jpg',
    ],
  },
  consult: {
    hero: '/images/services/consult/legacy-03.jpg',
    gallery: [
      '/images/services/consult/legacy-03.jpg',
      '/images/services/consult/legacy-02.jpg',
      '/images/services/consult/legacy-01.jpg',
    ],
  },
}

function buildLocalizedDetails(
  service: LocalizedContent['services']['items'][ServiceKey]
): ServiceDetailBlock[] {
  return service.highlights.map((title, index) => ({
    title,
    text: index === 0 ? service.intro : service.short,
    bullets: service.process[index] ? [service.process[index]] : undefined,
  }))
}

export default function ServiceDetailPage({
  locale,
  content,
  serviceKey,
  localized = false,
}: ServiceDetailPageProps) {
  const service = content.services.items[serviceKey]
  const ui = serviceUiCopy[locale]
  const assets = serviceAssets[serviceKey]
  const ServiceIcon = serviceIcons[serviceKey]
  const details =
    locale === 'th'
      ? recoveredThaiServiceDetails[serviceKey]
      : buildLocalizedDetails(service)
  const promise =
    locale === 'th' ? recoveredThaiServicePromises[serviceKey] : service.short
  const href = (pathname: string) =>
    localized ? localePath(pathname, locale) : pathname
  const pagePath = href(`/services/${serviceKey}`)
  const pageUrl = `https://siamgroundwater.com${pagePath}`

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: content.common.home,
        item: `https://siamgroundwater.com${href('/home')}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: content.services.title,
        item: `https://siamgroundwater.com${href('/services')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: service.title,
        item: pageUrl,
      },
    ],
  }

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.intro,
    serviceType: service.highlights,
    provider: {
      '@type': 'Organization',
      name: 'Siam Groundwater',
      url: 'https://siamgroundwater.com',
    },
    areaServed: { '@type': 'Country', name: 'Thailand' },
    url: pageUrl,
  }

  return (
    <main className={`service-detail service-detail--${serviceKey}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />

      <div className="service-detail-shell">
        <nav
          className="service-detail-breadcrumb"
          aria-label={content.common.breadcrumbLabel}
        >
          <Link href={href('/home')}>{content.common.home}</Link>
          <ChevronRight aria-hidden="true" />
          <Link href={href('/services')}>{content.services.title}</Link>
          <ChevronRight aria-hidden="true" />
          <span aria-current="page">{service.title}</span>
        </nav>

        <nav className="service-detail-tabs" aria-label={ui.chooseService}>
          <span className="service-detail-tabs-label">
            <Layers3 aria-hidden="true" />
            {ui.chooseService}
          </span>
          <div className="service-detail-tabs-list">
            {SERVICE_KEYS.map((key) => {
              const TabIcon = serviceIcons[key]
              const isActive = key === serviceKey

              return (
                <Link
                  key={key}
                  href={href(`/services/${key}`)}
                  className={isActive ? 'is-active' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <TabIcon aria-hidden="true" />
                  {content.services.items[key].title}
                </Link>
              )
            })}
          </div>
        </nav>

        <header className="service-detail-hero">
          <div className="service-detail-hero-copy">
            <p className="service-detail-eyebrow">
              <ServiceIcon aria-hidden="true" />
              {content.services.eyebrow}
            </p>
            <h1>{service.title}</h1>
            <p className="service-detail-lead">{service.intro}</p>

            <div className="service-detail-actions">
              <Link
                href={href('/contact')}
                className="service-detail-button service-detail-button--primary"
              >
                <MessageCircle aria-hidden="true" />
                {content.common.contactTeam}
              </Link>
              <Link
                href={href('/projects')}
                className="service-detail-button service-detail-button--secondary"
              >
                {content.common.viewProjects}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <ul className="service-detail-hero-points">
              {service.highlights.slice(0, 3).map((item) => (
                <li key={item}>
                  <CheckCircle2 aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <figure className="service-detail-hero-media">
            <Image
              src={assets.hero}
              alt={`${ui.fieldPhoto}: ${service.title}`}
              fill
              priority
              sizes="(width <= 900px) 100vw, 48vw"
            />
            <figcaption>
              <ShieldCheck aria-hidden="true" />
              <span>{promise}</span>
            </figcaption>
          </figure>
        </header>

        <section className="service-detail-section" aria-labelledby="service-scope">
          <div className="service-detail-section-heading">
            <p>01 / {content.services.highlightsTitle}</p>
            <h2 id="service-scope">{content.services.highlightsTitle}</h2>
            <span>{ui.scopeIntro}</span>
          </div>

          <div className="service-detail-scope-grid">
            {service.highlights.map((item, index) => {
              const ScopeIcon = scopeIcons[index % scopeIcons.length]

              return (
                <article key={item}>
                  <div className="service-detail-card-icon">
                    <ScopeIcon aria-hidden="true" />
                  </div>
                  <span className="service-detail-card-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{item}</h3>
                  <p>{service.process[index] ?? service.short}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section
          className="service-detail-process"
          aria-labelledby="service-process"
        >
          <div className="service-detail-process-media">
            <figure className="service-detail-process-image service-detail-process-image--large">
              <Image
                src={assets.gallery[1]}
                alt={`${ui.fieldPhoto}: ${service.highlights[0]}`}
                fill
                sizes="(width <= 900px) 100vw, 42vw"
              />
            </figure>
            <figure className="service-detail-process-image service-detail-process-image--small">
              <Image
                src={assets.gallery[2]}
                alt={`${ui.fieldPhoto}: ${service.highlights[1] ?? service.title}`}
                fill
                sizes="(width <= 900px) 45vw, 18vw"
              />
            </figure>
            <div className="service-detail-process-badge" aria-hidden="true">
              <ChartNoAxesColumnIncreasing />
            </div>
          </div>

          <div className="service-detail-process-copy">
            <p className="service-detail-kicker">
              02 / {content.services.processTitle}
            </p>
            <h2 id="service-process">{content.services.processTitle}</h2>
            <p className="service-detail-section-lead">{ui.processIntro}</p>

            <ol>
              {service.process.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{item}</h3>
                    <p>
                      {service.highlights[index] ?? service.short}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="service-detail-section service-detail-section--details"
          aria-labelledby="service-details"
        >
          <div className="service-detail-section-heading">
            <p>03 / {ui.detailsEyebrow}</p>
            <h2 id="service-details">{ui.detailsTitle}</h2>
            <span>{ui.detailsIntro}</span>
          </div>

          <div className="service-detail-details-grid">
            {details.map((detail) => (
              <article key={detail.title}>
                <FileText aria-hidden="true" />
                <h3>{detail.title}</h3>
                <p>{detail.text}</p>
                {detail.bullets && (
                  <ul>
                    {detail.bullets.map((item) => (
                      <li key={item}>
                        <CheckCircle2 aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        <section
          className="service-detail-gallery"
          aria-labelledby="service-gallery"
        >
          <div className="service-detail-gallery-heading">
            <div>
              <p className="service-detail-kicker">04 / {ui.galleryEyebrow}</p>
              <h2 id="service-gallery">{ui.galleryTitle}</h2>
            </div>
            <Link href={href('/projects')}>
              {content.common.viewProjects}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="service-detail-gallery-grid">
            {assets.gallery.map((src, index) => (
              <figure key={src}>
                <Image
                  src={src}
                  alt={`${ui.fieldPhoto} ${index + 1}: ${service.title}`}
                  fill
                  sizes="(width <= 700px) 100vw, 33vw"
                />
              </figure>
            ))}
          </div>
        </section>

        <aside className="service-detail-cta" aria-label={ui.ctaTitle}>
          <div className="service-detail-cta-icon">
            <ServiceIcon aria-hidden="true" />
          </div>
          <div>
            <p>{ui.ctaEyebrow}</p>
            <h2>{ui.ctaTitle}</h2>
            <span>{ui.ctaText}</span>
          </div>
          <div className="service-detail-cta-actions">
            <Link
              href={href('/contact')}
              className="service-detail-button service-detail-button--primary"
            >
              <MessageCircle aria-hidden="true" />
              {content.common.contactTeam}
            </Link>
            <Link
              href={href('/services')}
              className="service-detail-button service-detail-button--secondary"
            >
              {ui.allServices}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
