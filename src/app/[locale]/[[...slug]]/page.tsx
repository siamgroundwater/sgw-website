import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  MapPin,
  MessageCircle,
  PlayCircle,
} from 'lucide-react'
import ContactDetails from '@/components/ContactDetails/ContactDetails'
import GroundwaterCalculator from '@/components/GroundwaterCalculator/GroundwaterCalculator'
import GroundwaterBasics from '@/components/GroundwaterBasics/GroundwaterBasics'
import GroundwaterCaseStudies from '@/components/GroundwaterCaseStudies/GroundwaterCaseStudies'
import GroundwaterLawGuide from '@/components/GroundwaterLawGuide/GroundwaterLawGuide'
import GroundwaterFaq from '@/components/GroundwaterFaq/GroundwaterFaq'
import GroundwaterOwnerGuide from '@/components/GroundwaterOwnerGuide/GroundwaterOwnerGuide'
import LearningCenterPage from '@/components/LearningCenterPage/LearningCenterPage'
import ProjectMediaSlider from '@/components/ProjectMediaSlider/ProjectMediaSlider'
import ServiceDetailPage from '@/components/ServiceDetailPage/ServiceDetailPage'
import SocialMediaSection from '@/components/home/SocialMediaSection'
import CustomerHistorySection from '@/components/home/CustomerHistorySection'
import CompanyVideoSection from '@/components/home/CompanyVideoSection'
import Hero from '@/app/(site)/home/hero'
import Services from '@/app/(site)/services/services'
import HomeMap from '@/app/(site)/home/map/map'
import ProjectsSection from '@/app/(site)/home/projects/projects'
import HomeTeam from '@/app/(site)/about/teams/teams'
import HeroSlide from '@/app/(site)/about/hero-slide/HeroSlide'
import {
  LOCALIZED_LOCALES,
  isLocalizedLocale,
  languageAlternates,
  localeInfo,
  localePath,
  type LocalizedLocale,
} from '@/i18n/config'
import {
  LEARNING_SLUGS,
  SERVICE_KEYS,
  getLocalizedContent,
  isLearningSlug,
  isServiceKey,
  type LearningSlug,
  type LocalizedContent,
  type ServiceKey,
} from '@/i18n/localized-content'
import { getLocalizedProjectPresentation } from '@/i18n/projects'
import { getProjectById, getProjectMapUrl, projects } from '@/lib/projects'
import '@/app/(site)/home/page.css'
import '@/app/(site)/about/page.css'
import '@/app/(site)/contact/page.css'
import '@/app/(site)/governance/page.css'
import '@/app/(site)/groundwater-learning/page.css'
import '@/app/(site)/learn/[slug]/page.css'
import '@/app/(site)/privacy/page.css'
import '@/app/(site)/projects/[id]/page.css'

type LocalizedPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>
}

const staticRouteSegments: string[][] = [
  [],
  ['home'],
  ['about'],
  ['services'],
  ...SERVICE_KEYS.map((key) => ['services', key]),
  ['projects'],
  ['governance'],
  ['groundwater-learning'],
  ['contact'],
  ['privacy'],
  ...LEARNING_SLUGS.map((slug) => ['learn', slug]),
  ...projects.map((project) => ['projects', String(project._id)]),
]

const aboutVideoLabel: Record<LocalizedLocale, string> = {
  th: 'ชมวิดีโอแนะนำบริษัท',
  en: 'Watch our company video',
  zh: '观看公司介绍视频',
  ja: '会社紹介動画を見る',
}

const aboutAwardLabels: Record<LocalizedLocale, [string, string, string]> = {
  th: [
    'รางวัลคุณภาพยอดเยี่ยม',
    'รางวัลสถานประกอบการดีเด่น',
    'รางวัลคุณภาพยอดเยี่ยม',
  ],
  en: [
    'Outstanding Quality Award',
    'Outstanding Establishment Award',
    'Outstanding Quality Award',
  ],
  zh: ['卓越质量奖', '优秀企业奖', '卓越质量奖'],
  ja: ['優秀品質賞', '優良事業所賞', '優秀品質賞'],
}

export const dynamicParams = false

export function generateStaticParams() {
  return LOCALIZED_LOCALES.flatMap((locale) =>
    staticRouteSegments.map((slug) => ({ locale, slug }))
  )
}

function routePath(slug: string[]) {
  if (slug.length === 0 || (slug.length === 1 && slug[0] === 'home')) return '/'
  return `/${slug.join('/')}`
}

function pageMetadata(
  locale: LocalizedLocale,
  slug: string[],
  content: LocalizedContent
) {
  const first = slug[0]
  const second = slug[1]
  let title = content.siteTitle
  let description = content.metaDescription

  if (first === 'about') {
    title = `${content.about.title} | Siam Groundwater`
    description = content.about.intro
  } else if (first === 'services' && second && isServiceKey(second)) {
    title = `${content.services.items[second].title} | Siam Groundwater`
    description = content.services.items[second].intro
  } else if (first === 'services') {
    title = `${content.services.title} | Siam Groundwater`
    description = content.services.intro
  } else if (first === 'projects' && second) {
    const project = getProjectById(second)
    if (project) {
      title = `${project.title} | Siam Groundwater`
      description = content.projects.registryNote
    }
  } else if (first === 'projects') {
    title = `${content.projects.title} | Siam Groundwater`
    description = content.projects.intro
  } else if (first === 'governance') {
    title = `${content.governance.title} | Siam Groundwater`
    description = content.governance.intro
  } else if (first === 'groundwater-learning') {
    title = `${content.learning.title} | Siam Groundwater`
    description = content.learning.intro
  } else if (first === 'learn' && second && isLearningSlug(second)) {
    const article = content.learning.articles[second]
    title = `${article.title} | Siam Groundwater`
    description = article.description
  } else if (first === 'contact') {
    title = `${content.contact.title} | Siam Groundwater`
    description = content.contact.intro
  } else if (first === 'privacy') {
    title = `${content.privacy.title} | Siam Groundwater`
    description = content.privacy.intro
  }

  return { title, description }
}

export async function generateMetadata({
  params,
}: LocalizedPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug = [] } = await params
  if (!isLocalizedLocale(rawLocale)) return {}
  const content = getLocalizedContent(rawLocale)
  const { title, description } = pageMetadata(rawLocale, slug, content)
  const basePath = routePath(slug)
  const canonical = localePath(basePath, rawLocale)

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(basePath),
    },
    openGraph: {
      type: 'website',
      locale: localeInfo[rawLocale].htmlLang,
      siteName: 'Siam Groundwater',
      title,
      description,
      url: canonical,
      images: [
        {
          url: '/og.png',
          width: 1200,
          height: 630,
          alt: 'Siam Groundwater — WE KNOW GROUNDWATER',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
  }
}

function LocalizedHome({
  locale,
  content,
}: {
  locale: LocalizedLocale
  content: LocalizedContent
}) {
  return (
    <main className="page-content">
      <Hero
        locale={locale}
        copy={{
          title: content.home.eyebrow,
          tagline: content.home.title,
          motto: content.home.motto,
          body: [content.home.summary, content.home.assurance],
          company: content.contact.officeTitle,
        }}
      />
      <Services locale={locale} copy={content} />
      <CompanyVideoSection locale={locale} />
      <HomeMap
        locale={locale}
        title={content.home.projectsTitle}
        projectCopy={content.projects}
      />
      <ProjectsSection locale={locale} copy={content.projects} featured />
      <CustomerHistorySection locale={locale} />
      <SocialMediaSection locale={locale} />
    </main>
  )
}

function LocalizedAbout({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  const awards = [
    { src: '/images/about/award/award-1.png', width: 138, height: 328 },
    { src: '/images/about/award/award-2.png', width: 358, height: 326 },
    { src: '/images/about/award/award-3.png', width: 244, height: 344 },
  ]
  const awardLabels = aboutAwardLabels[locale]

  return (
    <main className="about-container">
      <section className="about-hero">
        <p className="about-eyebrow">{content.about.eyebrow}</p>
        <h1 className="about-title">{content.about.title}</h1>
        <p className="about-hero-intro">{content.about.intro}</p>
        <div className="about-hero-actions">
          <Link href={localePath('/services', locale)}>
            {content.services.title}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href={`${localePath('/', locale)}#company-video`}>
            <PlayCircle aria-hidden="true" />
            {aboutVideoLabel[locale]}
          </Link>
        </div>
      </section>

      <HeroSlide />

      <section className="about-content">
        <div className="about-content-Introduction">
          <h2>{content.about.storyTitle}</h2>
          {content.about.story.map((paragraph) => (
            <p className="text-indent" key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <section className="about-awards" aria-label={content.about.principlesTitle}>
          <div className="about-awards-slider-track">
            {awards.map((award, index) => {
              const awardLabel = awardLabels[index]
              return (
                <article key={award.src} className="about-award-card">
                  <div className="about-award-image-wrapper">
                    <Image
                      src={award.src}
                      alt={awardLabel}
                      width={award.width}
                      height={award.height}
                      className="about-award-image"
                      loading="lazy"
                    />
                  </div>
                  <p className="about-award-caption">{awardLabel}</p>
                </article>
              )
            })}
          </div>
        </section>

        <div className="about-founder">
          <div className="about-founder-image-wrapper">
            <Image src="/images/personnel/MD.jpg" alt={content.about.teamTitle} width={320} height={400} className="about-founder-image" loading="lazy" />
          </div>
          <div className="about-founder-text">
            <h2 className="about-founder-header">{content.about.principlesTitle}</h2>
            <p className="text-indent">{content.about.teamIntro}</p>
            {content.about.principles.map((principle) => (
              <p className="text-indent" key={principle.title}><strong>{principle.title}:</strong> {principle.description}</p>
            ))}
          </div>
        </div>

        <HomeTeam title={content.about.teamTitle} locale={locale} />
      </section>
    </main>
  )
}

function LocalizedServices({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  return (
    <main style={{ marginTop: '4rem' }}>
      <Services locale={locale} copy={content} headingLevel="h1" />
    </main>
  )
}

function LocalizedServiceDetail({
  locale,
  content,
  serviceKey,
}: {
  locale: LocalizedLocale
  content: LocalizedContent
  serviceKey: ServiceKey
}) {
  return (
    <ServiceDetailPage
      locale={locale}
      content={content}
      serviceKey={serviceKey}
      localized
    />
  )
}


function LocalizedProjects({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  return (
    <main className="projects-page" style={{ padding: '1rem' }}>
      <ProjectsSection locale={locale} copy={content.projects} showHistoryMap headingLevel="h1" />
    </main>
  )
}

function LocalizedProjectDetail({ locale, content, id }: { locale: LocalizedLocale; content: LocalizedContent; id: string }) {
  const project = getProjectById(id)
  if (!project) notFound()
  const presentation = getLocalizedProjectPresentation(project, content.projects)
  const mapUrl = getProjectMapUrl(project)
  return (
    <main className="project-detail-page">
      <nav
        className="project-detail-breadcrumb"
        aria-label={content.common.breadcrumbLabel}
      >
        <Link href={localePath('/', locale)}>{content.common.home}</Link>
        <span aria-hidden="true">/</span>
        <Link href={localePath('/projects', locale)}>
          {content.projects.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{project.title}</span>
      </nav>
      <article className="project-detail-card">
        <div className="project-detail-content">
          <h1>{project.title}</h1>
          <p className="project-detail-lead">{project.location}</p>

          <dl className="project-detail-facts">
            {project.year && (
              <div>
                <dt>{content.projects.yearLabel}</dt>
                <dd>{project.year}</dd>
              </div>
            )}
            <div>
              <dt>{content.projects.location}</dt>
              <dd>{project.location}</dd>
            </div>
            <div>
              <dt>{content.projects.typeLabel}</dt>
              <dd>{presentation.typeLabel}</dd>
            </div>
            <div>
              <dt>{content.projects.categoryLabel}</dt>
              <dd>{presentation.categoryLabel}</dd>
            </div>
            {project.workTypes.length > 0 && (
              <div>
                <dt>{content.projects.workScopeLabel}</dt>
                <dd>{project.workTypes.join(' • ')}</dd>
              </div>
            )}
            {project.businessTypes.length > 0 && (
              <div>
                <dt>{content.projects.businessTypeLabel}</dt>
                <dd>{project.businessTypes.join(' • ')}</dd>
              </div>
            )}
          </dl>

          <section className="project-detail-record">
            <h2>{content.projects.projectStoryTitle}</h2>
            <p className="project-detail-story">{project.summary}</p>
            <p className="project-detail-source">
              {content.projects.recoveredRecordNote}
            </p>
          </section>

          <div className="project-detail-actions">
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-detail-primary"
              >
                <MapPin aria-hidden="true" />
                {content.projects.mapCta}
              </a>
            )}
            <Link
              href={localePath('/contact', locale)}
              className="project-detail-secondary"
            >
              <MessageCircle aria-hidden="true" />
              {content.projects.enquiryCta}
            </Link>
          </div>
        </div>

        <ProjectMediaSlider
          images={project.localGalleryImages}
          locale={locale}
          projectNumber={project._id}
          title={project.title}
        />
      </article>
    </main>
  )
}

function LocalizedGovernance({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  const downloadLabel: Record<LocalizedLocale, string> = {
    th: 'ดาวน์โหลดโปสเตอร์',
    en: 'Download poster',
    zh: '下载海报',
    ja: 'ポスターをダウンロード',
  }

  return (
    <main className="governance-page">
      <section className="governance-header"><p className="governance-eyebrow">{content.governance.eyebrow}</p><h1 className="governance-title-th">{content.governance.title}</h1><p className="governance-description">{content.governance.intro}</p></section>
      <section className="governance-poster-section"><div className="governance-poster-frame"><div className="governance-poster-inner"><Image src="/images/governance/Poster_โครงการรักษ์น้ำบาดาล.png" alt={content.governance.commitmentTitle} width={1200} height={1700} className="governance-poster-image" priority /></div></div><a className="governance-download-button" href="/images/governance/Poster_โครงการรักษ์น้ำบาดาล.png" download="Poster_โครงการรักษ์น้ำบาดาล.png"><Download aria-hidden="true" />{downloadLabel[locale]}</a></section>
    </main>
  )
}

function LocalizedLearning({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  return <LearningCenterPage locale={locale} content={content} />
}

function LocalizedArticlePage({ locale, content, articleSlug }: { locale: LocalizedLocale; content: LocalizedContent; articleSlug: LearningSlug }) {
  const article = content.learning.articles[articleSlug]
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, inLanguage: localeInfo[locale].htmlLang, author: { '@type': 'Organization', name: 'Siam Groundwater' } }
  return (
    <main
      className={`learning-article-page ${
        articleSlug === 'groundwater-calculator-tools'
          ? 'learning-tools-page'
          : articleSlug === 'groundwater-basics-thailand'
            ? 'learning-basics-page'
            : articleSlug === 'groundwater-case-studies-problems'
              ? 'learning-case-studies-page'
              : articleSlug === 'groundwater-law-regulation-thailand'
                ? 'learning-law-page'
                : articleSlug === 'groundwater-faq-thailand'
                  ? 'learning-faq-page'
                  : articleSlug === 'groundwater-guide-factory-hotel-resort'
                    ? 'learning-owner-guide-page'
                  : ''
      }`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <nav className="learning-article-breadcrumb" aria-label={content.common.breadcrumbLabel}><Link href={localePath('/', locale)}>{content.common.home}</Link><span aria-hidden="true">/</span><Link href={localePath('/groundwater-learning', locale)}>{content.learning.title}</Link><span aria-hidden="true">/</span><span aria-current="page">{article.title}</span></nav>
      <header className="learning-article-hero"><p className="learning-article-eyebrow">{article.eyebrow}</p><h1>{article.title}</h1><p className="learning-article-description">{article.description}</p><p className="learning-article-audience"><strong>{content.common.suitableFor}:</strong> {article.audience}</p></header>
      {articleSlug === 'groundwater-calculator-tools' && <GroundwaterCalculator locale={locale} />}
      {articleSlug === 'groundwater-basics-thailand' && <GroundwaterBasics locale={locale} localized />}
      {articleSlug === 'groundwater-case-studies-problems' && <GroundwaterCaseStudies locale={locale} localized />}
      {articleSlug === 'groundwater-law-regulation-thailand' && <GroundwaterLawGuide locale={locale} localized />}
      {articleSlug === 'groundwater-faq-thailand' && <GroundwaterFaq locale={locale} localized />}
      {articleSlug === 'groundwater-guide-factory-hotel-resort' && <GroundwaterOwnerGuide locale={locale} localized />}
      {articleSlug !== 'groundwater-calculator-tools' && articleSlug !== 'groundwater-basics-thailand' && articleSlug !== 'groundwater-case-studies-problems' && articleSlug !== 'groundwater-law-regulation-thailand' && articleSlug !== 'groundwater-faq-thailand' && articleSlug !== 'groundwater-guide-factory-hotel-resort' && <article className="learning-article-body">{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}{article.sources && <aside className="learning-article-sources"><h2>{content.common.officialSources}</h2><ul>{article.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul><p>{content.common.sourceReviewed}</p></aside>}</article>}
      {articleSlug !== 'groundwater-basics-thailand' && articleSlug !== 'groundwater-case-studies-problems' && articleSlug !== 'groundwater-law-regulation-thailand' && articleSlug !== 'groundwater-faq-thailand' && articleSlug !== 'groundwater-guide-factory-hotel-resort' && <aside className="learning-article-cta"><div><h2>{content.learning.ctaTitle}</h2><p>{content.learning.ctaText}</p></div><Link href={localePath('/contact', locale)}><MessageCircle aria-hidden="true" />{content.common.contactTeam}</Link></aside>}
    </main>
  )
}

function LocalizedContact({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  return (
    <main className="contact-page">
      <section className="contact-header"><p className="contact-eyebrow">CONTACT SIAM GROUNDWATER</p><h1 className="contact-title-main">{content.contact.title}</h1><h2 className="contact-title-sub">{content.contact.officeTitle}</h2><p className="contact-address">{content.contact.officeAddress}</p></section>
      <ContactDetails locale={locale} officeAddress={content.contact.officeAddress} phoneTitle={content.contact.labels.phone} emailTitle={content.contact.labels.email} contactTitle={content.common.contactTeam} locationTitle={content.contact.locationTitle} locationAction={content.contact.locationAction} />
    </main>
  )
}

function LocalizedPrivacy({ locale, content }: { locale: LocalizedLocale; content: LocalizedContent }) {
  return (
    <main className="privacy-page">
      <p className="privacy-eyebrow">{content.privacy.eyebrow}</p><h1>{content.privacy.title}</h1><p className="privacy-lead">{content.privacy.intro}</p>
      {content.privacy.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
      <Link href={localePath('/contact', locale)} className="privacy-back-link"><ArrowLeft aria-hidden="true" />{content.privacy.back}</Link>
    </main>
  )
}

export default async function LocalizedPage({ params }: LocalizedPageProps) {
  const { locale: rawLocale, slug = [] } = await params
  if (!isLocalizedLocale(rawLocale)) notFound()
  const locale = rawLocale as LocalizedLocale
  const content = getLocalizedContent(locale)
  const first = slug[0]
  const second = slug[1]

  if (slug.length === 0 || (slug.length === 1 && first === 'home')) return <LocalizedHome locale={locale} content={content} />
  if (slug.length === 1 && first === 'about') return <LocalizedAbout locale={locale} content={content} />
  if (slug.length === 1 && first === 'services') return <LocalizedServices locale={locale} content={content} />
  if (slug.length === 2 && first === 'services' && second && isServiceKey(second)) return <LocalizedServiceDetail locale={locale} content={content} serviceKey={second} />
  if (slug.length === 1 && first === 'projects') return <LocalizedProjects locale={locale} content={content} />
  if (slug.length === 2 && first === 'projects' && second) return <LocalizedProjectDetail locale={locale} content={content} id={second} />
  if (slug.length === 1 && first === 'governance') return <LocalizedGovernance locale={locale} content={content} />
  if (slug.length === 1 && first === 'groundwater-learning') return <LocalizedLearning locale={locale} content={content} />
  if (slug.length === 2 && first === 'learn' && second && isLearningSlug(second)) return <LocalizedArticlePage locale={locale} content={content} articleSlug={second} />
  if (slug.length === 1 && first === 'contact') return <LocalizedContact locale={locale} content={content} />
  if (slug.length === 1 && first === 'privacy') return <LocalizedPrivacy locale={locale} content={content} />
  notFound()
}
