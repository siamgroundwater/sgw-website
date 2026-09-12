import { groundwaterFaqItems } from './groundwater-faq'
import { groundwaterLawDocuments } from './groundwater-law-library'
import sections from './learning-search-sections.json'
import { learningExperience } from '../i18n/learning-experience'
import { learningSearchCopy } from '../i18n/learning-search'
import { localePath, type LocalizedLocale } from '../i18n/config'
import type { LearningSlug } from '../i18n/localized-content'
import type { LearningSearchEntry } from '../lib/learning-search'

// Called by the server hub. The client receives only its current language and
// never imports the full multilingual extract or an interactive article module.
export function createLearningSearchIndex(locale: LocalizedLocale): LearningSearchEntry[] {
  const copy = learningSearchCopy[locale]
  const articleName = (slug: string) => learningExperience[locale].topics[slug as LearningSlug].title
  return [
    ...sections.map(({ slug, key, hash, content }) => ({
      id: `${slug}-${key}`, href: `${localePath(`/learn/${slug}`, locale)}#${hash}`,
      title: content[locale].title, article: articleName(slug), category: copy.section,
      text: content[locale].text,
      keywords: slug === 'groundwater-law-regulation-thailand' && key === 'library'
        ? groundwaterLawDocuments.flatMap((document) => [document.title, document.scope, ...document.keywords])
        : [],
    })),
    ...groundwaterFaqItems.map((item) => ({
      id: `faq-${item.id}`, href: `${localePath('/learn/groundwater-faq-thailand', locale)}#faq-${item.id}`,
      title: item.question[locale], article: articleName('groundwater-faq-thailand'),
      category: `${copy.faq} · ${copy.categories[item.category]}`,
      text: `${item.answer[locale]} ${item.action[locale]}`, keywords: item.keywords,
    })),
  ]
}
