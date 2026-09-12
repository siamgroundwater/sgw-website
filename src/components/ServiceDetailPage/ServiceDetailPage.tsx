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
  MapPinned,
  MessageCircle,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import ServiceGallery from './ServiceGallery'
import ServiceProjectSelector from './ServiceProjectSelector'
import ServiceTabs from './ServiceTabs'
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
import { toProjectSummary } from '@/lib/project-summaries'
import { selectServiceProjects } from '@/lib/service-projects'
import { listPublicProjects } from '@/server/public-projects'
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
  galleryEyebrow: string
  galleryTitle: string
  projectsEyebrow: string
  projectsTitle: string
  noMatchingProjects: string
  fieldPhoto: string
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
    galleryEyebrow: 'จากพื้นที่ปฏิบัติงาน',
    galleryTitle: 'ภาพการทำงานจริงของทีมสยามกราวด์วอเตอร์',
    projectsEyebrow: 'โครงการตัวอย่าง',
    projectsTitle: 'ผลงานที่เกี่ยวข้องกับบริการนี้',
    noMatchingProjects: 'ยังไม่มีโครงการตัวอย่างที่เผยแพร่สำหรับบริการนี้',
    fieldPhoto: 'ภาพจากการปฏิบัติงานของสยามกราวด์วอเตอร์',
  },
  en: {
    chooseService: 'Choose a service',
    scopeIntro:
      'Field evidence, design decisions and operating needs stay connected, giving each stage a clear purpose and handover.',
    processIntro:
      'We begin with the site objective, collect the evidence that matters, then define a suitable method and measurable acceptance criteria.',
    detailsEyebrow: 'Specialist capability',
    detailsTitle: 'Service details',
    galleryEyebrow: 'From the field',
    galleryTitle: 'Siam Groundwater teams at work',
    projectsEyebrow: 'Example projects',
    projectsTitle: 'Projects related to this service',
    noMatchingProjects: 'No published example projects are available for this service yet.',
    fieldPhoto: 'Siam Groundwater field operation',
  },
  zh: {
    chooseService: '选择服务',
    scopeIntro:
      '将现场证据、设计决策与实际运行需求贯通，让每个阶段都有明确目标和可追溯交付。',
    processIntro:
      '从场地目标出发，收集关键资料，再确定合适的工作方法和可衡量的验收标准。',
    detailsEyebrow: '专项能力',
    detailsTitle: '服务详情',
    galleryEyebrow: '现场实录',
    galleryTitle: '暹罗地下水团队现场工作',
    projectsEyebrow: '项目案例',
    projectsTitle: '与此服务相关的项目',
    noMatchingProjects: '此服务目前还没有已发布的项目案例。',
    fieldPhoto: '暹罗地下水现场作业照片',
  },
  ja: {
    chooseService: 'サービスを選ぶ',
    scopeIntro:
      '現場データ、設計判断、実際の運用条件を一貫してつなぎ、各工程の目的と引渡し内容を明確にします。',
    processIntro:
      '敷地の目的から始め、必要な根拠を集めたうえで、適切な方法と測定可能な検収基準を定めます。',
    detailsEyebrow: '専門技術',
    detailsTitle: 'サービス詳細',
    galleryEyebrow: '現場から',
    galleryTitle: 'サイアム・グラウンドウォーターの現場作業',
    projectsEyebrow: 'プロジェクト事例',
    projectsTitle: 'このサービスに関連する実績',
    noMatchingProjects: 'このサービスの公開済み事例はまだありません。',
    fieldPhoto: 'サイアム・グラウンドウォーターの現場作業写真',
  },
}

const serviceIcons: Record<ServiceKey, LucideIcon> = {
  survey: ScanSearch,
  drilling: Construction,
  maintenance: Wrench,
  consult: Stethoscope,
}

const serviceTabTitles: Record<
  LocalizedLocale,
  Record<ServiceKey, string>
> = {
  th: {
    survey: 'สำรวจศึกษา',
    drilling: 'เจาะ ก่อสร้าง',
    maintenance: 'ซ่อมบำรุง',
    consult: 'แก้ไขปัญหา',
  },
  en: {
    survey: 'Survey & study',
    drilling: 'Drilling & construction',
    maintenance: 'Maintenance',
    consult: 'Troubleshooting',
  },
  zh: {
    survey: '勘探研究',
    drilling: '钻井施工',
    maintenance: '维护保养',
    consult: '问题解决',
  },
  ja: {
    survey: '調査・検討',
    drilling: '掘削・施工',
    maintenance: '保守・整備',
    consult: '問題解決',
  },
}

const scopeIcons: LucideIcon[] = [
  MapPinned,
  Droplets,
  CircleGauge,
  ClipboardCheck,
]

const serviceScopeCopy: Record<
  LocalizedLocale,
  Record<ServiceKey, string[]>
> = {
  th: {
    survey: [
      'ทบทวนข้อมูลพื้นที่และความต้องการใช้น้ำ',
      'ประเมินธรณีวิทยาและความเสี่ยงของพื้นที่',
      'สำรวจภาคสนามและประเมินจุดเจาะ',
      'จัดลำดับจุดเจาะและจัดทำรายงานโครงการ',
    ],
    drilling: [
      'ยืนยันจุดเจาะและทางเข้าพื้นที่',
      'ออกแบบโครงสร้างบ่อและเกณฑ์ตรวจรับ',
      'เจาะบ่อ บันทึกชั้นดิน และก่อสร้างบ่อ',
      'พัฒนาบ่อ สูบทดสอบ และส่งมอบเอกสาร',
    ],
    maintenance: [
      'ตรวจประวัติและอาการผิดปกติของบ่อ',
      'ล้างบ่อและตรวจซ่อมเครื่องสูบ',
      'ปรับระดับเครื่องสูบและระบบควบคุม',
      'ทดสอบประสิทธิภาพและวางแผนติดตาม',
    ],
    consult: [
      'ตรวจสาเหตุอัตราสูบต่ำและระดับน้ำลด',
      'วิเคราะห์ทราย ความขุ่น และความเสียหายของบ่อ',
      'ตรวจความเค็ม ความเป็นกรด และการปนเปื้อน',
      'วางแผนซ่อม เปลี่ยน หรือปรับการใช้งาน',
    ],
  },
  en: {
    survey: [
      'Review site records and water demand',
      'Assess geology and site risks',
      'Survey the site and evaluate drilling points',
      'Rank drilling points and deliver the report',
    ],
    drilling: [
      'Confirm the drilling point and site access',
      'Define the well design and acceptance criteria',
      'Drill, log the geology and construct the well',
      'Develop, pump-test and document the well',
    ],
    maintenance: [
      'Review the well history and symptoms',
      'Clean the well and inspect or repair the pump',
      'Adjust the pump depth and control system',
      'Retest performance and plan monitoring',
    ],
    consult: [
      'Diagnose low flow and falling water levels',
      'Check sand, turbidity and well damage',
      'Trace salinity, acidity and contamination',
      'Plan repairs, replacement or operating changes',
    ],
  },
  zh: {
    survey: [
      '审查场地资料与用水需求',
      '评估地质条件与场地风险',
      '开展现场调查并评估井位',
      '排定井位并提交项目报告',
    ],
    drilling: [
      '确认井位与施工通道',
      '确定井身结构与验收标准',
      '钻进、记录地层并完成成井',
      '洗井、抽水试验并提交资料',
    ],
    maintenance: [
      '审查井史与异常现象',
      '洗井并检查或维修水泵',
      '调整水泵深度与控制系统',
      '复测性能并制定监测计划',
    ],
    consult: [
      '诊断低流量与水位下降',
      '检查出砂、浑浊与井体损坏',
      '追查盐分、酸性与污染来源',
      '制定修复、更换或运行调整方案',
    ],
  },
  ja: {
    survey: [
      '敷地資料と必要水量を確認',
      '地質条件と敷地リスクを評価',
      '現地調査と掘削候補地点の評価',
      '候補地点を順位付けして報告書を作成',
    ],
    drilling: [
      '掘削地点と搬入経路を確認',
      '井戸構造と検収基準を設定',
      '掘削・地層記録・井戸施工',
      '井戸開発・揚水試験・資料引渡し',
    ],
    maintenance: [
      '井戸履歴と異常症状を確認',
      '井戸洗浄とポンプ点検・修理',
      'ポンプ深度と制御設備を調整',
      '性能を再試験して監視計画を作成',
    ],
    consult: [
      '流量低下と水位低下の原因を診断',
      '砂・濁り・井戸損傷を確認',
      '塩分・酸性・汚染経路を調査',
      '修理・交換・運転変更を計画',
    ],
  },
}

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

export default async function ServiceDetailPage({
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
  const scopeCards = serviceScopeCopy[locale][serviceKey]
  const exampleProjects = selectServiceProjects(
    await listPublicProjects(),
    serviceKey,
    'all'
  ).map((project) => toProjectSummary(project, locale))
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

        <ServiceTabs
          activeKey={serviceKey}
          label={ui.chooseService}
          tabs={SERVICE_KEYS.map((key) => ({
            key,
            href: href(`/services/${key}`),
            title: serviceTabTitles[locale][key],
          }))}
        />

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
              quality={90}
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
            <p>{content.services.highlightsTitle}</p>
            <h2 id="service-scope">{content.services.highlightsTitle}</h2>
            <span>{ui.scopeIntro}</span>
          </div>

          <div className="service-detail-scope-grid">
            {scopeCards.map((item, index) => {
              const ScopeIcon = scopeIcons[index % scopeIcons.length]

              return (
                <article key={item}>
                  <div className="service-detail-card-icon">
                    <ScopeIcon aria-hidden="true" />
                  </div>
                  <div className="service-detail-card-copy">
                    <h3>{item}</h3>
                  </div>
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
                quality={90}
                sizes="(width <= 900px) 100vw, 42vw"
              />
            </figure>
            <figure className="service-detail-process-image service-detail-process-image--small">
              <Image
                src={assets.gallery[2]}
                alt={`${ui.fieldPhoto}: ${service.highlights[1] ?? service.title}`}
                fill
                quality={90}
                sizes="(width <= 900px) 45vw, 18vw"
              />
            </figure>
            <div className="service-detail-process-badge" aria-hidden="true">
              <ChartNoAxesColumnIncreasing />
            </div>
          </div>

          <div className="service-detail-process-copy">
            <p className="service-detail-kicker">
              {content.services.processTitle}
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
            <p>{ui.detailsEyebrow}</p>
            <h2 id="service-details">{ui.detailsTitle}</h2>
          </div>

          <div className="service-detail-details-grid">
            {details.map((detail) => (
              <article key={detail.title}>
                <div className="service-detail-card-heading">
                  <FileText aria-hidden="true" />
                  <h3>{detail.title}</h3>
                </div>
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
              <p className="service-detail-kicker">{ui.galleryEyebrow}</p>
              <h2 id="service-gallery">{ui.galleryTitle}</h2>
            </div>
          </div>

          <ServiceGallery
            images={assets.gallery}
            label={ui.fieldPhoto}
            serviceTitle={service.title}
          />
        </section>

        <section
          className="service-detail-projects"
          aria-labelledby="service-projects"
        >
          <div className="service-detail-gallery-heading">
            <div>
              <p className="service-detail-kicker">{ui.projectsEyebrow}</p>
              <h2 id="service-projects">{ui.projectsTitle}</h2>
            </div>
            <Link href={href('/projects')}>
              {content.common.viewProjects}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {exampleProjects.length > 0 ? (
            <ServiceProjectSelector
              projects={exampleProjects}
              locale={locale}
              copy={content.projects}
            />
          ) : (
            <p className="service-detail-projects-empty">
              {ui.noMatchingProjects}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
