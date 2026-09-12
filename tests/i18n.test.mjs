import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  LOCALIZED_LOCALES,
  getNavigation,
  languageAlternates,
  localeFromPathname,
  localePath,
  stripLocaleFromPathname,
} from '../src/i18n/config.ts'
import {
  LEARNING_SLUGS,
  SERVICE_KEYS,
  getLocalizedContent,
} from '../src/i18n/localized-content.ts'
import {
  getLocalizedProjectPresentation,
  localizeProject,
} from '../src/i18n/projects.ts'
import { toProjectSummary } from '../src/lib/project-summaries.ts'
import { hasProjectTranslationContent, normalizeProjectTranslation, projectDetailSections } from '../src/lib/project-translations.ts'

function collectStrings(value, result = []) {
  if (typeof value === 'string') {
    result.push(value)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, result))
  }
  return result
}

test('locale helpers preserve the current route when switching language', () => {
  assert.equal(localeFromPathname('/zh/services/drilling'), 'zh')
  assert.equal(localeFromPathname('/projects/12'), 'th')
  assert.equal(stripLocaleFromPathname('/ja/learn/groundwater-faq-thailand'), '/learn/groundwater-faq-thailand')
  assert.equal(localePath('/zh/services/drilling', 'en'), '/en/services/drilling')
  assert.equal(localePath('/en', 'th'), '/')
  assert.equal(localePath('/th/projects/8', 'th'), '/projects/8')
  assert.deepEqual(languageAlternates('/projects/8'), {
    'th-TH': '/projects/8',
    en: '/en/projects/8',
    'zh-CN': '/zh/projects/8',
    ja: '/ja/projects/8',
    'x-default': '/projects/8',
  })
})

test('project presentation keeps every category and applies selected, English, then Thai fallback per field', () => {
  const thai = getLocalizedContent('th')
  const presentation = getLocalizedProjectPresentation(
    { category: ['ภาครัฐ', 'โรงงาน'] },
    thai.projects
  )
  assert.deepEqual(presentation.categoryLabels, ['ภาครัฐ', 'โรงงาน'])
  assert.equal(presentation.categoryLabel, 'ภาครัฐ • โรงงาน')

  const project = {
    _id: '507f1f77bcf86cd799439011',
    category: ['โรงงาน'],
    coverImage: '/cover.jpg',
    details: ['รายละเอียดภาษาไทย'],
    galleryImages: ['/cover.jpg'],
    lat: 13.7,
    lng: 100.5,
    location: 'กรุงเทพฯ',
    slug: 'example',
    summary: 'สรุปภาษาไทย',
    title: 'ชื่อภาษาไทย',
    translations: {
      en: {
        details: ['English detail'],
        location: 'Bangkok',
        summary: '',
        title: 'English title',
      },
      zh: {
        details: [],
        location: '',
        summary: '中文摘要',
        title: '中文项目名称',
      },
      ja: {
        details: ['日本語の詳細'],
        location: 'バンコク',
        summary: '',
        title: '',
      },
    },
    workTypes: ['งานสำรวจน้ำบาดาล'],
    year: 2026,
  }

  assert.equal(localizeProject(project, 'th').title, 'ชื่อภาษาไทย')
  const english = localizeProject(project, 'en')
  assert.equal(english.title, 'English title')
  assert.equal(english.location, 'Bangkok')
  assert.equal(english.summary, 'สรุปภาษาไทย')
  assert.deepEqual(english.details, ['English detail'])

  const chinese = localizeProject(project, 'zh')
  assert.equal(chinese.title, '中文项目名称')
  assert.equal(chinese.location, 'Bangkok')
  assert.equal(chinese.summary, '中文摘要')
  assert.deepEqual(chinese.details, ['English detail'])

  const japanese = localizeProject(project, 'ja')
  assert.equal(japanese.title, 'English title')
  assert.equal(japanese.location, 'バンコク')
  assert.equal(japanese.summary, 'สรุปภาษาไทย')
  assert.deepEqual(japanese.details, ['日本語の詳細'])

  const chineseSummary = toProjectSummary(project, 'zh')
  assert.equal(chineseSummary.title, '中文项目名称')
  assert.equal(chineseSummary.location, 'Bangkok')

  const legacyProject = { ...project, translations: { en: project.translations.en } }
  assert.equal(localizeProject(legacyProject, 'zh').title, 'English title')
  assert.equal(localizeProject(legacyProject, 'ja').summary, 'สรุปภาษาไทย')

  const whitespaceProject = {
    ...project,
    translations: {
      en: { details: ['   '], location: ' ', summary: ' ', title: ' ' },
      zh: { details: ['  '], location: '  ', summary: '  ', title: '  ' },
    },
  }
  const chineseWithThaiFallback = localizeProject(whitespaceProject, 'zh')
  assert.equal(chineseWithThaiFallback.title, 'ชื่อภาษาไทย')
  assert.equal(chineseWithThaiFallback.location, 'กรุงเทพฯ')
  assert.equal(chineseWithThaiFallback.summary, 'สรุปภาษาไทย')
  assert.deepEqual(chineseWithThaiFallback.details, ['รายละเอียดภาษาไทย'])

  const japaneseSummary = toProjectSummary(project, 'ja')
  assert.equal(japaneseSummary.title, 'English title')
  assert.equal(japaneseSummary.location, 'バンコク')
  assert.equal(toProjectSummary(whitespaceProject, 'en').title, 'ชื่อภาษาไทย')
})

test('project translation normalization safely removes malformed and blank data', () => {
  const normalized = normalizeProjectTranslation({
    details: [' First section ', null, 42, '   ', 'Second section'],
    location: 100,
    summary: ' Summary ',
    title: ['not text'],
  })

  assert.deepEqual(normalized, {
    details: ['First section', 'Second section'],
    location: '',
    summary: 'Summary',
    title: '',
  })
  assert.equal(hasProjectTranslationContent(normalized), true)
  assert.equal(hasProjectTranslationContent(normalizeProjectTranslation(null)), false)
  assert.deepEqual(
    projectDetailSections('Project summary', ['Project summary', ' First detail ', 'Second detail']),
    [' First detail ', 'Second detail']
  )
})

test('every localized navigation points into its own locale', () => {
  for (const locale of LOCALIZED_LOCALES) {
    const navigation = getNavigation(locale)
    assert.equal(navigation.length, 7)
    for (const item of navigation) {
      if (locale === 'th') {
        assert.equal(item.href.startsWith('/th'), false, item.href)
      } else {
        assert.ok(item.href.startsWith(`/${locale}`), item.href)
      }
      for (const child of item.subNav ?? []) {
        if (locale === 'th') {
          assert.equal(child.href.startsWith('/th'), false, child.href)
        } else {
          assert.ok(child.href.startsWith(`/${locale}`), child.href)
        }
      }
    }
  }
})

test('each language has complete services, articles and interface copy', () => {
  for (const locale of LOCALIZED_LOCALES) {
    const content = getLocalizedContent(locale)
    assert.ok(content.siteTitle.length > 10)
    assert.ok(content.metaDescription.length > 15)
    assert.equal(Object.keys(content.services.items).length, SERVICE_KEYS.length)
    assert.equal(Object.keys(content.learning.articles).length, LEARNING_SLUGS.length)

    for (const service of SERVICE_KEYS) {
      assert.ok(content.services.items[service].title.length > 4)
      assert.ok(content.services.items[service].highlights.length >= 3)
    }

    for (const slug of LEARNING_SLUGS) {
      const article = content.learning.articles[slug]
      assert.ok(article.title.length > 8)
      assert.ok(article.description.length > 20)
      assert.ok(article.sections.length >= 1)
      assert.ok(
        article.sections.every(
          (section) => section.paragraphs.length > 0 || (section.bullets?.length ?? 0) > 0
        )
      )
    }
  }
})

test('English content does not silently fall back to Thai', () => {
  const englishStrings = collectStrings(getLocalizedContent('en'))
  assert.equal(
    englishStrings.some((value) => /[\u0E00-\u0E7F]/u.test(value)),
    false
  )
})

test('key company facts preserve the meaning of the Thai source', () => {
  const english = getLocalizedContent('en')
  const chinese = getLocalizedContent('zh')
  const japanese = getLocalizedContent('ja')

  assert.match(english.about.intro, /1987/)
  assert.equal(english.about.storyTitle, 'Our history')
  assert.match(english.governance.intro, /22 December 2000/)
  assert.match(chinese.about.intro, /1987/)
  assert.match(chinese.governance.intro, /2000年12月22日/)
  assert.match(japanese.about.intro, /1987/)
  assert.match(japanese.governance.intro, /2000年12月22日/)

  for (const content of [chinese, japanese]) {
    const labels = content.learning.articles['groundwater-law-regulation-thailand'].sources?.map(
      (source) => source.label
    ) ?? []
    assert.equal(labels.some((label) => /laws and regulations|public services/i.test(label)), false)
  }
})

test('localized pages use translated UI labels and legal-guide detail', () => {
  const localizedPage = readFileSync(
    new URL('../src/app/[locale]/[[...slug]]/page.tsx', import.meta.url),
    'utf8'
  )
  const lawGuide = readFileSync(
    new URL('../src/components/GroundwaterLawGuide/GroundwaterLawGuide.tsx', import.meta.url),
    'utf8'
  )

  assert.match(localizedPage, /className="contact-eyebrow">\{content\.contact\.eyebrow\}/)
  for (const section of ['foundation', 'navigator', 'lifecycle', 'duties', 'checklist', 'penalties', 'quiz', 'sources']) {
    assert.doesNotMatch(
      lawGuide,
      new RegExp(`${section}: \\{ \\.\\.\\.copyByLocale\\.en\\.${section}`),
      `${section} must not inherit English detail in another locale`
    )
  }
})
