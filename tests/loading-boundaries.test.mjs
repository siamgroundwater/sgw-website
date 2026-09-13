import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { companyContact, directContactCopy } from '../src/lib/company-contact.ts'

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
  assert.doesNotMatch(component, /<main[^>]*role="status"/)
  assert.doesNotMatch(component, /aria-busy="true"/)
  assert.match(component, /data-loading-status/)
  assert.match(component, /data-loading-contact/)
  assert.doesNotMatch(component, /<h1\b/, 'A transient loader must not add a second main heading to streamed page HTML.')
  assert.match(component, /aria-hidden="true"/)
  for (const locale of ['th', 'en', 'zh', 'ja']) assert.match(component, new RegExp(`\\b${locale}:`))
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
  assert.match(styles, /animation:\s*none/)
  assert.match(styles, /\.logoShell\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*50%;/s)
  assert.match(styles, /\.logoShell img\s*\{[^}]*border-radius:\s*50%;/s)
})

test('loading contact details stay complete and shared with the footer', () => {
  const component = readFileSync(path.resolve('src/components/RouteLoading/RouteLoading.tsx'), 'utf8')
  const footer = readFileSync(path.resolve('src/components/Footer/Footer.tsx'), 'utf8')
  for (const source of [component, footer]) {
    assert.match(source, /import \{ companyContact, directContactCopy \} from '@\/lib\/company-contact'/)
    assert.match(source, /companyContact\.social\.map/)
    assert.match(source, /companyContact\.email/)
    assert.match(source, /companyContact\.fax/)
    for (const person of ['office', 'wasin', 'toeng']) assert.ok(source.includes(`companyContact.${person}`))
  }
  assert.deepEqual([companyContact.office.href, companyContact.wasin.href, companyContact.toeng.href], ['tel:027350789', 'tel:0898954757', 'tel:0827447582'])
  assert.equal(companyContact.email.href, 'mailto:sgw_th@outlook.com')
  assert.equal(companyContact.fax, '0-2375-0791-2')
  assert.deepEqual(companyContact.social.map(social => social.name), ['LINE', 'Facebook', 'TikTok'])
  for (const social of companyContact.social) assert.ok(existsSync(path.resolve('public', social.image.slice(1))))
  for (const locale of ['th', 'en', 'zh', 'ja']) {
    assert.ok(directContactCopy[locale].wasin)
    assert.ok(directContactCopy[locale].toeng)
  }
})
