import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { extractLearningSearchSections, learningSearchIndexSource } from '../scripts/learning-search-source.mjs'
import { learningSearchHighlights, normalizeLearningSearch, searchLearningIndex } from '../src/lib/learning-search.ts'
import * as faq from '../src/data/groundwater-faq.ts'
import * as law from '../src/data/groundwater-law-library.ts'
import * as experience from '../src/i18n/learning-experience.ts'
import * as copy from '../src/i18n/learning-search.ts'
import * as config from '../src/i18n/config.ts'
import { LEARNING_SLUGS } from '../src/i18n/localized-content.ts'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const sections = JSON.parse(read('src/data/learning-search-sections.json'))
const dependencies = {
  './groundwater-faq': faq,
  './groundwater-law-library': law,
  './learning-search-sections.json': sections,
  '../i18n/learning-experience': experience,
  '../i18n/learning-search': copy,
  '../i18n/config': config,
}
const compiled = ts.transpileModule(read('src/data/learning-search-index.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const module = { exports: {} }
vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`)((id) => {
  assert.ok(Object.hasOwn(dependencies, id), `Unexpected index dependency: ${id}`)
  return dependencies[id]
}, module, module.exports)
const { createLearningSearchIndex } = module.exports

test('checked-in search extract exactly matches authored article sections and real anchors', () => {
  assert.equal(read('src/data/learning-search-sections.json'), learningSearchIndexSource(), 'Regenerate using scripts/learning-search-source.mjs --patch after article copy changes')
  assert.deepEqual(sections, extractLearningSearchSections())
  assert.equal(sections.filter((item) => item.slug === 'groundwater-calculator-tools').length, 9)
  for (const section of sections) {
    assert.deepEqual(Object.keys(section.content), [...config.SITE_LOCALES])
    for (const locale of config.SITE_LOCALES) {
      assert.ok(section.content[locale].title.length > 2, `${section.slug}.${locale}.${section.key}`)
      assert.ok(section.content[locale].text.length > 20, `${section.slug}.${locale}.${section.key}`)
      assert.doesNotMatch(section.content[locale].text, /undefined/, 'Every extracted label must resolve')
      if (locale !== 'th') assert.notEqual(section.content[locale].text, section.content.th.text)
    }
  }
})

test('each locale indexes all six current articles and every FAQ answer with its real deep link', () => {
  for (const locale of config.SITE_LOCALES) {
    const index = createLearningSearchIndex(locale)
    assert.equal(index.length, sections.length + faq.groundwaterFaqItems.length)
    assert.equal(new Set(index.map((entry) => entry.id)).size, index.length)
    assert.deepEqual([...new Set(index.map((entry) => entry.href.split('/learn/')[1].split('#')[0]))].sort(), [...LEARNING_SLUGS].sort())
    for (const entry of index) {
      assert.ok(entry.title && entry.article && entry.category && entry.text)
      assert.match(entry.href, locale === 'th' ? /^\/learn\// : new RegExp(`^/${locale}/learn/`))
      assert.match(entry.href, /#[a-z0-9-]+$/)
      assert.equal(typeof entry.text, 'string', 'The browser receives a single locale, not multilingual records')
    }
    for (const item of faq.groundwaterFaqItems) {
      const indexed = index.find((entry) => entry.id === `faq-${item.id}`)
      assert.equal(indexed.title, item.question[locale])
      assert.equal(indexed.text, `${item.answer[locale]} ${item.action[locale]}`)
      assert.ok(indexed.href.endsWith(`#faq-${item.id}`))
    }
  }
})

test('search finds localized sections, definitions, calculators and FAQ with useful matching excerpts', () => {
  const queries = { th: 'ใบอนุญาต', en: 'permit', zh: '许可', ja: '許可' }
  for (const locale of config.SITE_LOCALES) {
    const index = createLearningSearchIndex(locale)
    const results = searchLearningIndex(index, queries[locale])
    assert.ok(results.some((entry) => entry.href.includes('groundwater-law-regulation-thailand#')), locale)
    assert.ok(results.some((entry) => entry.id.startsWith('faq-')), locale)
    const tds = searchLearningIndex(index, 'tDs')
    assert.ok(tds.length > 0, `${locale}: TDS abbreviation`)
    assert.ok(tds.some((result) => learningSearchHighlights(result.snippet, result.terms).some((part) => part.matched)), `${locale}: translated matching excerpt`)
    assert.ok(searchLearningIndex(index, 'aquifer').some((entry) => entry.href.includes('#gb-concept')), `${locale}: aquifer definition`)
    assert.ok(searchLearningIndex(index, index.find((entry) => entry.href.endsWith('#gw-tab-storage')).title).some((entry) => entry.href.endsWith('#gw-tab-storage')), `${locale}: calculator label`)
    assert.equal(searchLearningIndex(index, '').length, 0)
    assert.equal(searchLearningIndex(index, '  ').length, 0)
    assert.equal(searchLearningIndex(index, 'zzzxqvxyz').length, 0)
  }
})

test('Thai spacing, Unicode normalization and common synonyms remain searchable', () => {
  const index = createLearningSearchIndex('th')
  const ids = (query) => searchLearningIndex(index, query).map((entry) => entry.id).sort()
  const compact = ids('น้ำเค็ม')
  const spaced = ids('น้ำ เค็ม')
  assert.ok(compact.length > 0)
  assert.ok(spaced.length > 0)
  assert.ok(spaced.every((id) => compact.includes(id)), 'Thai spacing finds the same salinity content or a more precise subset')
  assert.equal(normalizeLearningSearch('T.D.S'), normalizeLearningSearch('ＴＤＳ'))
  assert.equal(normalizeLearningSearch('น้ำ\u200b เค็ม'), normalizeLearningSearch('น้ำเค็ม'))
  assert.ok(ids('น้ำกระด้าง').length)
  assert.ok(ids('อาร์โอ').length)
})

test('highlighting preserves exact source text and treats HTML or regex syntax as text', () => {
  for (const [value, terms] of [
    ['ตรวจน้ำ เค็ม และ T.D.S', ['น้ำเค็ม', 'tds']],
    ['<img src=x onerror=alert(1)> น้ำบาดาล', ['<img', 'น้ำ']],
    ['pumping test and pumping', ['pump', 'pumping test']],
    ['Cafe\u0301 water quality', ['café']],
    ['abc [x] (foo) .*', ['[x]', '(foo)', '.*']],
  ]) {
    const chunks = learningSearchHighlights(value, terms)
    assert.equal(chunks.map((chunk) => chunk.text).join(''), value)
    assert.ok(chunks.some((chunk) => chunk.matched))
  }
  assert.deepEqual(learningSearchHighlights('project check process', ['ro', 'ec']), [{ text: 'project check process', matched: false }])
  assert.doesNotMatch(read('src/components/LearningCenterPage/LearningSearch.tsx'), /dangerouslySetInnerHTML|innerHTML/)
})

test('the search client does not import multilingual index data or interactive article code', () => {
  const source = read('src/components/LearningCenterPage/LearningSearch.tsx')
  assert.doesNotMatch(source, /from ['"][^'"]*(?:Groundwater|learning-search-index|learning-search-sections)/)
  assert.match(source, /type="search"/)
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/)
  assert.match(source, /!hasQuery && children/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
})
