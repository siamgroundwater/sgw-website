import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import * as config from '../src/i18n/config.ts'
import * as localizedContent from '../src/i18n/localized-content.ts'
import * as experience from '../src/i18n/learning-experience.ts'
import * as calculator from '../src/lib/groundwater-calculator.ts'
import * as faqData from '../src/data/groundwater-faq.ts'
import * as lawData from '../src/data/groundwater-law-library.ts'

const require = createRequire(import.meta.url)
const { learningExperience, learningJourneys } = experience
const { LEARNING_SLUGS, getLocalizedContent } = localizedContent
const { SITE_LOCALES, localePath } = config
const moduleCache = new Map()
const readSource = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const componentDependencies = {
  '@/components/LearningDiagram/LearningDiagram': 'components/LearningDiagram/LearningDiagram.tsx',
  '@/components/LearningProgress/LearningProgress': 'components/LearningProgress/LearningProgress.tsx',
  '@/components/LearningInputs/NumericInput': 'components/LearningInputs/NumericInput.tsx',
  '@/lib/learning-progress': 'lib/learning-progress.ts',
  '@/lib/learning-inputs': 'lib/learning-inputs.ts',
  '@/i18n/learning-feedback': 'i18n/learning-feedback.ts',
  '@/data/learning-search-index': 'data/learning-search-index.ts',
  '@/i18n/learning-search': 'i18n/learning-search.ts',
  '@/lib/learning-search': 'lib/learning-search.ts',
}
const relativeDependencies = {
  'components/LearningDiagram/LearningDiagram.tsx': { './diagram-copy': 'components/LearningDiagram/diagram-copy.ts' },
  'components/LearningDiagram/diagram-copy.ts': { './faq-diagram-copy': 'components/LearningDiagram/faq-diagram-copy.ts' },
  'components/LearningCenterPage/LearningCenterPage.tsx': { './LearningSearch': 'components/LearningCenterPage/LearningSearch.tsx' },
  'data/learning-search-index.ts': {
    './learning-search-sections.json': 'data/learning-search-sections.json',
    '../i18n/learning-search': 'i18n/learning-search.ts',
  },
}

// Render the real components and React hooks without booting Next.js. Only the
// framework's link/image adapters are replaced; content and calculation imports
// use the actual production modules. Browser interaction is checked separately.
function loadModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path)
  if (path.endsWith('.json')) {
    const data = JSON.parse(readSource(path))
    moduleCache.set(path, data)
    return data
  }
  const dependencies = {
    '@/i18n/config': config,
    '@/i18n/localized-content': localizedContent,
    '@/i18n/learning-experience': experience,
    '@/lib/groundwater-calculator': calculator,
    '@/data/groundwater-faq': faqData,
    '@/data/groundwater-law-library': lawData,
    './groundwater-faq': faqData,
    './groundwater-law-library': lawData,
    '../i18n/config': config,
    '../i18n/learning-experience': experience,
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    'next/image': ({ src, alt, width, height }) => React.createElement('img', { src, alt, width, height }),
  }
  const compiled = ts.transpileModule(readSource(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const load = (id) => {
    if (id.endsWith('.css')) return {}
    if (Object.hasOwn(dependencies, id)) return dependencies[id]
    const productionModule = componentDependencies[id] || relativeDependencies[path]?.[id]
    if (productionModule) return loadModule(productionModule)
    if (['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'].includes(id)) return require(id)
    throw new Error(`Unexpected component dependency: ${id}`)
  }
  const run = vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, {}, { filename: path })
  run(load, module, module.exports)
  moduleCache.set(path, module.exports)
  return module.exports
}

const render = (path, props = {}) => renderToStaticMarkup(React.createElement(loadModule(path).default, props))
const markupText = (value) => renderToStaticMarkup(React.createElement(React.Fragment, null, value))
const has = (html, value, message) => assert.ok(html.includes(value), message || `Missing ${value}`)
const appearsBefore = (html, first, second) => {
  assert.ok(html.indexOf(first) >= 0, `Missing ${first}`)
  assert.ok(html.indexOf(second) > html.indexOf(first), `${first} must appear before ${second}`)
}

test('three learning journeys cover every real article exactly once', () => {
  assert.equal(learningJourneys.length, 3)
  for (const pair of learningJourneys) assert.equal(pair.length, 2)
  const slugs = learningJourneys.flat()
  assert.equal(new Set(slugs).size, 6)
  assert.deepEqual([...slugs].sort(), [...LEARNING_SLUGS].sort())
})

test('all four languages have complete task labels, outcomes and paired journey links', () => {
  assert.deepEqual(Object.keys(learningExperience).sort(), [...SITE_LOCALES].sort())
  for (const locale of SITE_LOCALES) {
    const copy = learningExperience[locale]
    assert.equal(copy.journeys.length, learningJourneys.length, locale)
    assert.deepEqual(Object.keys(copy.topics).sort(), [...LEARNING_SLUGS].sort(), locale)
    for (const field of ['title', 'intro', 'start', 'library', 'libraryIntro', 'audience']) {
      assert.ok(copy[field].trim().length > 0, `${locale}.${field}`)
      if (locale !== 'th') assert.notEqual(copy[field], learningExperience.th[field], `${locale}.${field} needs its own translation`)
    }
    copy.journeys.forEach((journey) => {
      assert.ok(journey.title.trim() && journey.description.trim(), locale)
      assert.notEqual(journey.title, journey.description, locale)
    })
    for (const slug of LEARNING_SLUGS) {
      assert.ok(copy.topics[slug].title.trim() && copy.topics[slug].outcome.trim(), `${locale}.${slug}`)
      assert.notEqual(copy.topics[slug].title, copy.topics[slug].outcome)
    }
    const html = render('components/LearningCenterPage/LearningCenterPage.tsx', { locale, content: getLocalizedContent(locale) })
    const journeys = html.split('<section class="groundwater-learning-library"')[0]
    const links = [...journeys.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    assert.deepEqual(links, learningJourneys.flat().map((slug) => localePath(`/learn/${slug}`, locale)), locale)
  }
})

test('shared article header renders one localized heading and optional audience information', () => {
  for (const locale of SITE_LOCALES) {
    for (const slug of LEARNING_SLUGS) {
      const audience = getLocalizedContent(locale).learning.articles[slug].audience
      const html = render('components/LearningCenterPage/LearningArticleHeader.tsx', { locale, slug, audience })
      assert.equal((html.match(/<h1>/g) || []).length, 1, `${locale}.${slug}`)
      has(html, `<h1>${markupText(learningExperience[locale].topics[slug].title)}</h1>`)
      has(html, markupText(learningExperience[locale].topics[slug].outcome))
      has(html, '<details class="learning-article-audience">')
      has(html, markupText(audience))
    }
  }
})

test('Thai and prefixed article routes both use the shared header before their tools', () => {
  for (const [path, functionName, needsLocale] of [
    ['app/(site)/learn/[slug]/page.tsx', 'LearningArticlePage', false],
    ['app/[locale]/[[...slug]]/page.tsx', 'LocalizedArticlePage', true],
  ]) {
    const source = ts.createSourceFile(path, readSource(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const page = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName)
    assert.ok(page, functionName)
    const elements = []
    const visit = (node) => {
      if (ts.isJsxSelfClosingElement(node)) elements.push(node)
      ts.forEachChild(node, visit)
    }
    visit(page)
    const header = elements.filter((node) => node.tagName.getText(source) === 'LearningArticleHeader')
    assert.equal(header.length, 1, path)
    const attributes = header[0].attributes.properties.map((node) => node.name?.getText(source))
    assert.ok(attributes.includes('slug') && attributes.includes('audience'), path)
    if (needsLocale) assert.ok(attributes.includes('locale'), path)
    const tools = elements.filter((node) => /^Groundwater/.test(node.tagName.getText(source)))
    assert.equal(tools.length, 6, path)
    assert.ok(tools.every((node) => node.pos > header[0].pos), path)
  }
})

test('calculator initially offers three common tasks and keeps all nine tools accessible', () => {
  const exampleNotices = new Set()
  for (const locale of SITE_LOCALES) {
    const html = render('components/GroundwaterCalculator/GroundwaterCalculator.tsx', { locale })
    const [common, advanced] = html.split('<details class="gw-more-tools">')
    assert.ok(advanced, `${locale}: additional tools remain available in a closed disclosure`)
    const toolIds = (section) => [...section.matchAll(/id="gw-tab-([^"]+)"/g)].map((match) => match[1])
    assert.deepEqual(toolIds(common), ['demand', 'cost', 'storage'], locale)
    assert.deepEqual(toolIds(advanced), ['energy', 'well', 'pipe', 'pressure', 'casing', 'motor'], locale)
    has(html, 'aria-pressed="true" aria-controls="gw-tool-panel" id="gw-tab-demand"')
    has(html, 'role="region" id="gw-tool-panel" aria-labelledby="gw-active-tool-title"')
    const note = html.match(/<p class="gw-example-note" role="status">([\s\S]*?)<\/p>/)?.[1].replace(/<[^>]*>/g, '').trim()
    assert.ok(note, `${locale}: example values must be identified`)
    exampleNotices.add(note)
    has(html, 'class="gw-result-purpose"')
    has(html, 'class="gw-suite-disclaimer"')
  }
  assert.equal(exampleNotices.size, SITE_LOCALES.length, 'Example-value notices are translated for every language')
})

test('FAQ renders searchable questions before secondary content and retains safety and sources', () => {
  for (const locale of SITE_LOCALES) {
    const html = render('components/GroundwaterFaq/GroundwaterFaq.tsx', { locale, localized: true })
    appearsBefore(html, 'id="gwf-search"', 'class="gwf-faq-list"')
    appearsBefore(html, 'class="gwf-faq-list"', 'class="gwf-system-figure"')
    has(html, '<details class="gwf-category-filter">')
    has(html, '<details class="gwf-safety-note" open="">', `${locale}: safety guidance is visible by default`)
    assert.equal((html.match(/class="gwf-question"/g) || []).length, faqData.groundwaterFaqItems.length, locale)
    for (const item of faqData.groundwaterFaqItems) has(html, markupText(item.question[locale]), `${locale}.${item.id}`)
    for (const href of Object.values(faqData.groundwaterFaqSourceLinks)) has(html, `href="${markupText(href)}"`)
  }
})

const diagramAssets = {
  aquifer: { src: '/images/learning/groundwater-basics/aquifer-cross-section.webp', width: 1536, height: 1024 },
  well: { src: '/images/learning/groundwater-basics/well-pumping-test.webp', width: 1536, height: 1024 },
  system: { src: '/images/learning/groundwater-faq/well-to-building.webp', width: 1600, height: 900 },
  quality: { src: '/images/learning/groundwater-faq/sample-to-treatment.webp', width: 1600, height: 900 },
}

test('all four diagrams render four numbered explanations and complete localized safety notes', () => {
  const { diagramCopy, diagramPositions } = loadModule('components/LearningDiagram/diagram-copy.ts')
  assert.deepEqual(Object.keys(diagramCopy).sort(), [...SITE_LOCALES].sort())
  assert.deepEqual(Object.keys(diagramPositions).sort(), Object.keys(diagramAssets).sort())
  for (const locale of SITE_LOCALES) {
    assert.deepEqual(Object.keys(diagramCopy[locale]).sort(), Object.keys(diagramAssets).sort(), locale)
    for (const [kind, asset] of Object.entries(diagramAssets)) {
      const copy = diagramCopy[locale][kind]
      assert.equal(copy.points.length, 4, `${locale}.${kind}: explanations`)
      assert.equal(diagramPositions[kind].length, 4, `${kind}: markers`)
      for (const field of ['title', 'note']) {
        assert.ok(copy[field].trim().length > 5, `${locale}.${kind}.${field}`)
        if (locale !== 'th') assert.notEqual(copy[field], diagramCopy.th[kind][field], `${locale}.${kind}.${field}: translated`)
      }
      const html = render('components/LearningDiagram/LearningDiagram.tsx', { kind, locale, src: asset.src, alt: copy.title })
      has(html, `src="${asset.src}"`)
      has(html, `alt="${markupText(copy.title)}"`)
      has(html, `<strong class="learning-diagram-title">${markupText(copy.title)}</strong>`)
      has(html, `<p class="learning-diagram-note">${markupText(copy.note)}</p>`)
      const markers = html.match(/<div class="learning-diagram-markers" aria-hidden="true">([\s\S]*?)<\/div>/)?.[1]
      assert.ok(markers, `${locale}.${kind}: decorative markers do not duplicate the accessible list`)
      assert.equal((markers.match(/<span /g) || []).length, 4)
      const key = html.match(/<ol class="learning-diagram-key" role="list">([\s\S]*?)<\/ol>/)?.[1]
      assert.ok(key, `${locale}.${kind}: ordered explanations`)
      assert.equal((key.match(/<li>/g) || []).length, 4)
      copy.points.forEach((point, index) => {
        assert.ok(point.title.trim().length > 2 && point.text.trim().length > 10, `${locale}.${kind}.${index}`)
        if (locale !== 'th') {
          assert.notEqual(point.title, diagramCopy.th[kind].points[index].title)
          assert.notEqual(point.text, diagramCopy.th[kind].points[index].text)
        }
        has(key, `<strong><span aria-hidden="true">${index + 1}</span>${markupText(point.title)}</strong><p>${markupText(point.text)}</p>`)
        const { x, y } = diagramPositions[kind][index]
        assert.ok(x > 0 && x < 100 && y > 0 && y < 100, `${kind}.${index}: marker stays inside the image`)
        has(markers, `style="left:${x}%;top:${y}%">${index + 1}</span>`)
      })
      assert.doesNotMatch(html, /<(?:button|details)\b/, `${locale}.${kind}: explanations are available without interaction`)
    }
  }
})

test('diagram image dimensions preserve each original asset aspect ratio', async () => {
  const sharp = require('sharp')
  for (const [kind, asset] of Object.entries(diagramAssets)) {
    const metadata = await sharp(fileURLToPath(new URL(`../public${asset.src}`, import.meta.url))).metadata()
    assert.equal(metadata.width, asset.width, `${kind}: original width`)
    assert.equal(metadata.height, asset.height, `${kind}: original height`)
    const html = render('components/LearningDiagram/LearningDiagram.tsx', { kind, locale: 'th', src: asset.src, alt: kind })
    const dimensions = html.match(/<img[^>]* width="(\d+)" height="(\d+)"/)
    assert.ok(dimensions, `${kind}: explicit image dimensions`)
    assert.equal(Number(dimensions[1]), asset.width)
    assert.equal(Number(dimensions[2]), asset.height)
  }
})

test('basics retains all seven chapters, safety guidance, exercises and both annotated figures in every language', () => {
  for (const locale of SITE_LOCALES) {
    const html = render('components/GroundwaterBasics/GroundwaterBasics.tsx', { locale, localized: true })
    for (const chapter of ['concept', 'thailand', 'workflow', 'well', 'pumping', 'quality', 'operation']) {
      has(html, `href="#gb-${chapter}"`, `${locale}: link to ${chapter}`)
      has(html, `id="gb-${chapter}" tabindex="-1"`, `${locale}: ${chapter} remains focusable`)
    }
    assert.equal((html.match(/class="gb-module"/g) || []).length, 7)
    assert.equal((html.match(/class="learning-diagram-caption"/g) || []).length, 2)
    for (const kind of ['aquifer', 'well']) has(html, `src="${diagramAssets[kind].src}"`)
    for (const className of ['gb-legal-note', 'gb-quality-warning', 'gb-warning-list']) {
      const safety = html.match(new RegExp(`<aside class="${className}">([\\s\\S]*?)<\\/aside>`))?.[1]
      assert.ok(safety?.replace(/<[^>]*>/g, '').trim().length > 25, `${locale}: ${className} retains visible guidance`)
    }
    has(html, '<details class="gb-aquifer-explorer">')
    has(html, 'aria-pressed="true" aria-controls="gb-aquifer-detail"')
    for (const input of ['static-level', 'pumping-level', 'flow-rate']) has(html, `id="gb-${input}" type="text" inputMode="decimal"`)
    has(html, 'class="gb-check-items"')
    assert.ok((html.match(/type="checkbox"/g) || []).length >= 5, `${locale}: owner checklist`)
    const questions = html.match(/<div class="gb-quiz-questions">([\s\S]*?)<\/section>/)?.[1]
    assert.ok(questions, `${locale}: quiz remains available`)
    assert.equal((questions.match(/<fieldset(?:\s|>)/g) || []).length, 4, `${locale}: four quiz questions`)
    assert.equal((questions.match(/<button /g) || []).length, 12, `${locale}: three choices per question`)
    has(html, 'class="gb-sources"')
    has(html, `href="${localePath('/learn/groundwater-calculator-tools', locale)}"`)
    has(html, `href="${localePath('/learn/groundwater-law-regulation-thailand', locale)}"`)
  }
})

test('law guide opens with the project checker and preserves navigation and official sources', () => {
  for (const locale of SITE_LOCALES) {
    const html = render('components/GroundwaterLawGuide/GroundwaterLawGuide.tsx', { locale, localized: true })
    appearsBefore(html, 'id="gwl-navigator"', 'id="gwl-foundation"')
    has(html, 'class="gwl-disclaimer"')
    has(html, 'id="gwl-depth"')
    assert.equal((html.match(/<select/g) || []).length, 2, locale)
    assert.ok(/class="gwl-chapter-nav"[^>]*><details><summary>/.test(html), `${locale}: compact chapter navigation`)
    for (const chapter of ['navigator', 'foundation', 'lifecycle', 'duties', 'library', 'penalties', 'quiz']) {
      has(html, `href="#gwl-${chapter}"`, `${locale}: native link to ${chapter}`)
      has(html, `id="gwl-${chapter}" tabindex="-1"`, `${locale}: ${chapter} accepts destination focus`)
    }
    appearsBefore(html, 'id="gwl-library"', 'class="gwl-library-scope"')
    appearsBefore(html, 'class="gwl-library-scope"', 'class="gwl-library-controls"')
    for (const repository of ['acts', 'waterAct', 'notifications', 'regulations', 'permitForms', 'master']) {
      has(html, `href="${markupText(lawData.groundwaterLawOfficialRepositories[repository])}"`)
    }
  }
})
