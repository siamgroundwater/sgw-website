import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

export const learningPaths = [
  '/groundwater-learning',
  '/learn/groundwater-basics-thailand',
  '/learn/groundwater-guide-factory-hotel-resort',
  '/learn/groundwater-case-studies-problems',
  '/learn/groundwater-faq-thailand',
  '/learn/groundwater-calculator-tools',
  '/learn/groundwater-law-regulation-thailand',
]
const languages = { th: 'th', en: 'en', zh: 'zh-CN', ja: 'ja' }

/** Read-only availability checks; no CMS login, database writes or analytics. */
export async function checkLearningRoutes(baseURL) {
  const base = baseURL.replace(/\/$/, '')
  let checked = 0
  for (const [locale, htmlLanguage] of Object.entries(languages)) {
    await Promise.all(learningPaths.map(async (path) => {
      const route = `${locale === 'th' ? '' : `/${locale}`}${path}`
      const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(20_000) })
      assert.equal(response.status, 200, `${route}: expected HTTP 200`)
      assert.match(response.headers.get('content-type') || '', /text\/html/, route)
      const html = await response.text()
      assert.match(html, new RegExp(`<html[^>]+lang="${htmlLanguage}"`), `${route}: wrong page language`)
      assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, `${route}: expected one main heading`)
      assert.match(html, /<main\b/, `${route}: missing main content`)
      assert.match(html, /learning-article-page|groundwater-learning-page/, `${route}: missing learning page`)
      checked += 1
    }))
  }
  console.log(`Learning route smoke passed: ${checked} localized pages at ${base}.`)
  return checked
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkLearningRoutes(process.env.LEARNING_E2E_BASE_URL || process.argv[2] || 'http://127.0.0.1:3005')
}
