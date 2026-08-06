import assert from 'node:assert/strict'
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
