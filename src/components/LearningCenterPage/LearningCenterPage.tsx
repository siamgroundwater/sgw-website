import Link from 'next/link'
import { BookOpen, Building2, Calculator, CircleHelp, Droplets, Scale, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react'
import { LEARNING_SLUGS, type LearningSlug, type LocalizedContent } from '@/i18n/localized-content'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import { learningExperience, learningJourneys } from '@/i18n/learning-experience'
import { learningSearchCopy } from '@/i18n/learning-search'
import { createLearningSearchIndex } from '@/data/learning-search-index'
import LearningSearch from './LearningSearch'

const topicIcons: Record<LearningSlug, LucideIcon> = {
  'groundwater-calculator-tools': Calculator,
  'groundwater-basics-thailand': BookOpen,
  'groundwater-case-studies-problems': TriangleAlert,
  'groundwater-law-regulation-thailand': Scale,
  'groundwater-faq-thailand': CircleHelp,
  'groundwater-guide-factory-hotel-resort': Building2,
}
const journeyIcons = [Droplets, Wrench, Calculator]

export default function LearningCenterPage({ locale = 'th', content }: { locale?: LocalizedLocale; content: LocalizedContent }) {
  const copy = learningExperience[locale]
  const hrefFor = (slug: LearningSlug) => localePath(`/learn/${slug}`, locale)
  return (
    <main className="groundwater-learning-page">
      <header className="groundwater-learning-hero">
        <p className="groundwater-learning-eyebrow"><BookOpen aria-hidden="true" />{content.learning.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="groundwater-learning-intro">{copy.intro}</p>
      </header>

      <LearningSearch entries={createLearningSearchIndex(locale)} copy={learningSearchCopy[locale]}>
        <section className="groundwater-learning-start" aria-labelledby="learning-start-title">
          <h2 id="learning-start-title">{copy.start}</h2>
          <div className="groundwater-learning-journeys">
            {copy.journeys.map((journey, index) => {
              const Icon = journeyIcons[index]
              return (
                <article className="groundwater-learning-journey" key={journey.title}>
                  <h3><span className="groundwater-learning-icon"><Icon aria-hidden="true" /></span>{journey.title}</h3>
                  <p>{journey.description}</p>
                  <nav aria-label={journey.title}>
                    {learningJourneys[index].map((slug) => <Link href={hrefFor(slug)} key={slug}>{copy.topics[slug].title}</Link>)}
                  </nav>
                </article>
              )
            })}
          </div>
        </section>

        <section className="groundwater-learning-library" aria-labelledby="learning-library-title">
          <h2 id="learning-library-title">{copy.library}</h2>
          <p>{copy.libraryIntro}</p>
          <div className="groundwater-learning-start-list">
            {LEARNING_SLUGS.map((slug) => {
              const Icon = topicIcons[slug]
              return (
                <Link href={hrefFor(slug)} key={slug}>
                  <span className="groundwater-learning-start-text">
                    <strong><Icon aria-hidden="true" />{copy.topics[slug].title}</strong>
                    <span>{copy.topics[slug].outcome}</span>
                    <span className="groundwater-learning-read">{learningSearchCopy[locale].read}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

      </LearningSearch>

      <aside className="groundwater-learning-cta">
        <div><h2>{content.learning.ctaTitle}</h2><p>{content.learning.ctaText}</p></div>
        <Link href={localePath('/contact', locale)}>{content.common.contactTeam}</Link>
      </aside>
    </main>
  )
}
