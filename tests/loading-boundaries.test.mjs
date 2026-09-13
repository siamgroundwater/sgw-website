import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const appRoot = path.resolve('src/app')

function collectPages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectPages(target)
    return entry.name === 'page.tsx' ? [target] : []
  })
}

function nearestLoadingBoundary(page) {
  let directory = path.dirname(page)
  while (directory.startsWith(appRoot) && directory !== appRoot) {
    const candidate = path.join(directory, 'loading.tsx')
    if (existsSync(candidate)) return candidate
    directory = path.dirname(directory)
  }
  return null
}

test('every public and CMS page has a loading boundary', () => {
  const pages = collectPages(appRoot)
  const uncovered = pages.filter((page) => !nearestLoadingBoundary(page))
  assert.deepEqual(uncovered, [])
  assert.ok(existsSync(path.join(appRoot, '(site)', 'loading.tsx')))
  assert.ok(existsSync(path.join(appRoot, '[locale]', 'loading.tsx')))
  assert.ok(existsSync(path.join(appRoot, 'cms', 'loading.tsx')))
})

test('the shared loader is accessible, localized, and motion-safe', () => {
  const component = readFileSync(path.resolve('src/components/RouteLoading/RouteLoading.tsx'), 'utf8')
  const styles = readFileSync(path.resolve('src/components/RouteLoading/RouteLoading.module.css'), 'utf8')

  assert.match(component, /role="status"/)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /aria-busy="true"/)
  assert.match(component, /aria-hidden="true"/)
  for (const locale of ['th', 'en', 'zh', 'ja']) assert.match(component, new RegExp(`\\b${locale}:`))
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
  assert.match(styles, /animation:\s*none/)
})
