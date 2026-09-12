import { learningExperience } from '@/i18n/learning-experience'
import type { LearningSlug } from '@/i18n/localized-content'
import type { SiteLocale } from '@/i18n/config'

export default function LearningArticleHeader({ slug, locale = 'th', audience }: { slug: string; locale?: SiteLocale; audience: string }) {
  const copy = learningExperience[locale]
  const topic = copy.topics[slug as LearningSlug]
  return (
    <header className="learning-article-hero">
      <h1>{topic.title}</h1>
      <p className="learning-article-description">{topic.outcome}</p>
      <details className="learning-article-audience">
        <summary>{copy.audience}</summary>
        <p>{audience}</p>
      </details>
    </header>
  )
}
