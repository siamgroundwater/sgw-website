import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Extract literal, authored copy only. This never imports or executes article code.
// Check: node scripts/learning-search-source.mjs --check
// Regenerate: node scripts/learning-search-source.mjs --write
// --patch prints an apply_patch-compatible patch; no flag prints the JSON.
// npm test also checks that the generated index matches current authored copy.
const locales = ['th', 'en', 'zh', 'ja']
const sources = [
  ['GroundwaterBasics', 'groundwater-basics-thailand', [['concept', 'gb-concept'], ['thailand', 'gb-thailand'], ['workflow', 'gb-workflow'], ['well', 'gb-well'], ['pumping', 'gb-pumping'], ['quality', 'gb-quality'], ['operation', 'gb-operation']]],
  ['GroundwaterOwnerGuide', 'groundwater-guide-factory-hotel-resort', [['choose', 'facility-profile'], ['calculator', 'water-balance'], ['roadmap', 'project-roadmap'], ['architecture', 'system-design'], ['handover', 'handover-operation'], ['operate', 'handover-operation']]],
  ['GroundwaterCaseStudies', 'groundwater-case-studies-problems', ['triage', 'workflow', 'cases', 'worksheet', 'prevention', 'quiz'].map((key) => [key, `gcs-${key}`])],
  ['GroundwaterLawGuide', 'groundwater-law-regulation-thailand', ['navigator', 'foundation', 'lifecycle', 'duties', 'library', 'penalties', 'quiz'].map((key) => [key, `gwl-${key}`])],
]

function literal(node, context = {}) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression, context)
  if (ts.isIdentifier(node) && Object.hasOwn(context, node.text)) return context[node.text]
  if (ts.isPropertyAccessExpression(node)) return literal(node.expression, context)[node.name.text]
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((entry) => literal(entry, context))
  if (ts.isObjectLiteralExpression(node)) return node.properties.reduce((result, property) => {
    if (ts.isSpreadAssignment(property)) return { ...result, ...literal(property.expression, context) }
    if (!ts.isPropertyAssignment(property)) throw new Error('Search source must use explicit literal properties')
    // External URLs and the overview's computed counters are not section prose.
    result[property.name.text] = ['href', 'summary'].includes(property.name.text) ? '' : literal(property.initializer, context)
    return result
  }, {})
  throw new Error(`Search source must remain static authored copy: ${ts.SyntaxKind[node.kind]} ${node.getText()}`)
}

function readComponent(name) {
  const source = readFileSync(new URL(`../src/components/${name}/${name}.tsx`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(`${name}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const read = (name, optional = false) => {
    const context = {}
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement)) {
        const declaration = statement.declarationList.declarations.find((entry) => entry.name.getText(ast) === name)
        if (declaration?.initializer) context[name] = literal(declaration.initializer, context)
      }
      if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)) {
        const { left, right, operatorToken } = statement.expression
        if (operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(left) && left.expression.getText(ast) === name) {
          context[name][left.name.text] = literal(right, context)
        }
      }
    }
    if (context[name]) return context[name]
    if (optional) return undefined
    throw new Error(`Missing authored copy: ${name}`)
  }
  return { source, read }
}

// Keep prose, labels and definitions: a reader can search any of these on the page.
function strings(value) {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? [] : [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  return value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []
}

export function extractLearningSearchSections() {
  const result = []
  for (const [component, slug, sections] of sources) {
    const { source, read } = readComponent(component)
    const copy = read('copyByLocale')
    for (const [key, hash] of sections) {
      if (!source.includes(`id="${hash}"`)) throw new Error(`Missing search destination: ${component}#${hash}`)
      result.push({ slug, key, hash, content: Object.fromEntries(locales.map((locale) => {
        const section = copy[locale][key]
        if (!section?.title) throw new Error(`Missing section: ${component}.${locale}.${key}`)
        const introduction = section.intro || section.text || ''
        return [locale, { title: section.title, text: [...new Set([introduction, ...strings(section)].filter((text) => text && text !== section.title))].join(' ') }]
      })) })
    }
    if (component === 'GroundwaterBasics') {
      if (!source.includes('id="gb-glossary"')) throw new Error('Missing search destination: GroundwaterBasics#gb-glossary')
      result.push({ slug, key: 'glossary', hash: 'gb-glossary', content: Object.fromEntries(locales.map((locale) => [locale, {
        title: copy[locale].glossaryTitle,
        text: copy[locale].glossary.map(({ term, meaning }) => `${term}: ${meaning}`).join(' '),
      }])) })
    }
  }
  const calculator = readComponent('GroundwaterCalculator')
  const copy = calculator.read('copyByLocale')
  const readingHelp = calculator.read('toolReadingHelp', true)
  const assumptions = calculator.read('toolAssumptions', true)
  const fields = calculator.read('toolFields', true)
  for (const key of Object.keys(copy.th.tools)) {
    result.push({ slug: 'groundwater-calculator-tools', key, hash: `gw-tab-${key}`, content: Object.fromEntries(locales.map((locale) => {
      const tool = copy[locale].tools[key]
      const labels = (fields?.[key] || []).map((field) => `${copy[locale].labels[field.label]} ${field.unit}`)
      return [locale, { title: tool.name, text: [tool.description, readingHelp?.[locale]?.[key], assumptions?.[locale]?.[key], ...labels].filter(Boolean).join(' ') }]
    })) })
  }
  return result
}

export function learningSearchIndexSource() {
  return `${JSON.stringify(extractLearningSearchSections(), null, 2)}\n`
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const flags = process.argv.slice(2)
  if (flags.length > 1 || flags.some((flag) => !['--check', '--write', '--patch'].includes(flag))) {
    console.error('Usage: node scripts/learning-search-source.mjs [--check | --write | --patch]')
    process.exitCode = 1
  } else {
    const path = 'src/data/learning-search-sections.json'
    const destination = new URL(`../${path}`, import.meta.url)
    let previous
    try { previous = readFileSync(destination, 'utf8') } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const next = learningSearchIndexSource()
    if (flags.includes('--check')) {
      if (previous === next) console.log(`Learning search index is current: ${path}`)
      else {
        console.error(`Learning search index is ${previous === undefined ? 'missing' : 'out of date'}: ${path}\nRun node scripts/learning-search-source.mjs --write to regenerate it.`)
        process.exitCode = 1
      }
    } else if (flags.includes('--write')) {
      if (previous !== next) {
        writeFileSync(destination, next, 'utf8')
        console.log(`Regenerated learning search index (${JSON.parse(next).length} sections, ${locales.length} languages): ${path}`)
      } else console.log(`Learning search index is already current; no changes: ${path}`)
    } else if (flags.includes('--patch')) {
      const lines = previous === undefined
        ? [`*** Add File: ${path}`, ...next.trimEnd().split('\n').map((line) => `+${line}`)]
        : [`*** Update File: ${path}`, '@@', ...previous.trimEnd().split('\n').map((line) => `-${line}`), ...next.trimEnd().split('\n').map((line) => `+${line}`)]
      process.stdout.write(['*** Begin Patch', ...lines, '*** End Patch'].join('\n'))
    } else process.stdout.write(next)
  }
}
