import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  MessageCircle,
  Scale,
  Sparkles,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  LEARNING_SLUGS,
  type LearningSlug,
  type LocalizedContent,
} from '@/i18n/localized-content'
import { localePath, type LocalizedLocale } from '@/i18n/config'

type LearningCenterPageProps = {
  locale?: LocalizedLocale
  content: LocalizedContent
}

const topicIcons: Record<LearningSlug, LucideIcon> = {
  'groundwater-calculator-tools': Calculator,
  'groundwater-basics-thailand': BookOpen,
  'groundwater-case-studies-problems': TriangleAlert,
  'groundwater-law-regulation-thailand': Scale,
  'groundwater-faq-thailand': CircleHelp,
  'groundwater-guide-factory-hotel-resort': Building2,
}

export default function LearningCenterPage({
  locale,
  content,
}: LearningCenterPageProps) {
  const hrefFor = (pathname: string) =>
    locale ? localePath(pathname, locale) : pathname

  return (
    <main className="groundwater-learning-page">
      <section className="groundwater-learning-hero" aria-labelledby="learning-title">
        <div className="groundwater-learning-hero-copy">
          <p className="groundwater-learning-eyebrow">
            <GraduationCap aria-hidden="true" />
            {content.learning.eyebrow}
          </p>
          <h1 id="learning-title">{content.learning.title}</h1>
          <p className="groundwater-learning-intro">{content.learning.intro}</p>

          <div className="groundwater-learning-actions">
            <Link
              href={hrefFor('/learn/groundwater-calculator-tools')}
              className="groundwater-learning-primary-action"
            >
              <Calculator aria-hidden="true" />
              {content.learning.articles['groundwater-calculator-tools'].eyebrow}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href={hrefFor('/learn/groundwater-guide-factory-hotel-resort')}
              className="groundwater-learning-secondary-action"
            >
              <BookOpen aria-hidden="true" />
              {content.learning.articles['groundwater-guide-factory-hotel-resort'].eyebrow}
            </Link>
          </div>
        </div>

        <aside className="groundwater-learning-start" aria-label={content.learning.topicsTitle}>
          <div className="groundwater-learning-start-heading">
            <span><Sparkles aria-hidden="true" /></span>
            <div>
              <p>{content.learning.topicsTitle}</p>
              <strong>{content.learning.topicsIntro}</strong>
            </div>
          </div>

          <nav className="groundwater-learning-start-list">
            {LEARNING_SLUGS.map((slug) => {
              const article = content.learning.articles[slug]
              const Icon = topicIcons[slug]
              return (
                <Link href={hrefFor(`/learn/${slug}`)} key={slug}>
                  <span className="groundwater-learning-start-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="groundwater-learning-start-text">
                    <small>{article.eyebrow}</small>
                    <strong>{article.title}</strong>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )
            })}
          </nav>
        </aside>
      </section>

      <section className="groundwater-learning-audience" aria-labelledby="learning-audience-title">
        <div className="groundwater-learning-audience-heading">
          <span><Users aria-hidden="true" /></span>
          <div>
            <p>{content.learning.eyebrow}</p>
            <h2 id="learning-audience-title">{content.learning.audienceTitle}</h2>
          </div>
        </div>
        <ul>
          {content.learning.audience.map((item) => (
            <li key={item}>
              <CheckCircle2 aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="groundwater-learning-cta">
        <span className="groundwater-learning-cta-icon">
          <MessageCircle aria-hidden="true" />
        </span>
        <div>
          <h2>{content.learning.ctaTitle}</h2>
          <p>{content.learning.ctaText}</p>
        </div>
        <Link href={hrefFor('/contact')}>
          {content.common.contactTeam}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}
