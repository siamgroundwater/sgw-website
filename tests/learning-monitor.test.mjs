import assert from 'node:assert/strict'
import test from 'node:test'
import { checkLearningRoutes, learningPaths } from '../scripts/e2e-learning-routes.mjs'
import { LEARNING_SLUGS } from '../src/i18n/localized-content.ts'

test('learning monitor covers the hub and every authored article', () => {
  assert.deepEqual([...learningPaths].sort(), ['/groundwater-learning', ...LEARNING_SLUGS.map((slug) => `/learn/${slug}`)].sort())
})

test('learning monitor checks all language variants and fails on a missing heading', async (t) => {
  const calls = []
  let invalid = false
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method || 'GET' })
    const path = new URL(url).pathname
    const language = path.startsWith('/en/') ? 'en' : path.startsWith('/zh/') ? 'zh-CN' : path.startsWith('/ja/') ? 'ja' : 'th'
    return new Response(`<html lang="${language}"><main class="learning-article-page">${invalid ? '' : '<h1>Learning</h1>'}</main></html>`, { headers: { 'content-type': 'text/html' } })
  })
  assert.equal(await checkLearningRoutes('https://learning.invalid'), 28)
  assert.equal(new Set(calls.map(({ url }) => url)).size, 28)
  assert.ok(calls.every(({ method }) => method === 'GET'))
  invalid = true
  await assert.rejects(checkLearningRoutes('https://learning.invalid'), /expected one main heading/)
})
