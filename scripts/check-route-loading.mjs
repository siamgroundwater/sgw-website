/* global document, getComputedStyle */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

// Component QA only: no Next server, application route, credentials, or database.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.join(root, 'test-results', 'loading')
const publicDirectory = await realpath(path.join(root, 'public'))
const sourceCache = new Map()

function loadSource(filename) {
  if (sourceCache.has(filename)) return sourceCache.get(filename).exports
  const module = { exports: {} }
  sourceCache.set(filename, module)
  const requireDependency = createRequire(filename)
  const requireSource = (specifier) => {
    if (specifier.endsWith('.module.css')) {
      return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
    }
    if (specifier === '@/lib/company-contact') {
      return loadSource(path.join(root, 'src', 'lib', 'company-contact.ts'))
    }
    return requireDependency(specifier)
  }
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  })
  const execute = new Function('require', 'module', 'exports', outputText)
  execute(requireSource, module, module.exports)
  return module.exports
}

const RouteLoading = loadSource(path.join(root, 'src', 'components', 'RouteLoading', 'RouteLoading.tsx')).default
const globals = readFileSync(path.join(root, 'src', 'styles', 'globals.css'), 'utf8')
  .replace(/^@import[^\r\n]*$/gm, '/* Remote font import omitted in offline component QA. */')
const cmsStyles = readFileSync(path.join(root, 'src', 'app', 'cms', 'cms.css'), 'utf8')
const loadingStyles = readFileSync(path.join(root, 'src', 'components', 'RouteLoading', 'RouteLoading.module.css'), 'utf8')
const fixtures = [
  { variant: 'public', locale: 'th' },
  { variant: 'public', locale: 'en' },
  { variant: 'public', locale: 'zh' },
  { variant: 'public', locale: 'ja' },
  { variant: 'cms', locale: 'th' },
  { variant: 'cms', locale: 'en' },
]
const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]
const expectedLinks = [
  'tel:027350789',
  'tel:0898954757',
  'tel:0827447582',
  'mailto:sgw_th@outlook.com',
  'https://line.me/R/ti/p/@sgw_th?from=page&searchId=sgw_th',
  'https://www.facebook.com/siamgroundwater',
  'https://www.tiktok.com/@siamgroundwater.co',
]
const mimeTypes = {
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
}

function fixtureHtml(fixture) {
  const markup = renderToStaticMarkup(createElement(RouteLoading, fixture))
  // Public navigation is sticky and occupies space. The preview reserves its
  // height without rendering a second footer or unrelated interactive elements.
  const navigationSpace = fixture.variant === 'public'
    ? '<div class="preview-navigation-space" aria-hidden="true"></div>' : ''
  return `<!doctype html><html lang="${fixture.locale}"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Loading preview: ${fixture.variant} ${fixture.locale}</title>
    <style>${globals}</style>
    ${fixture.variant === 'cms' ? `<style>${cmsStyles}</style>` : ''}
    <style>${loadingStyles}</style>
    <style>.preview-navigation-space{height:4.5rem;flex:0 0 auto}
    @media(width <= 768px){.preview-navigation-space{height:4.75rem}}</style>
    </head><body${fixture.variant === 'cms' ? ' class="cms-body"' : ''}>${navigationSpace}${markup}</body></html>`
}

async function assertNoOverflow(page, label) {
  const geometry = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const outside = [...document.querySelectorAll('[data-loading-page], [data-loading-page] *')]
      .flatMap((element) => {
        const bounds = element.getBoundingClientRect()
        if (!element.getClientRects().length || bounds.width === 0 || bounds.height === 0) return []
        return bounds.left < -1 || bounds.right > viewport + 1
          ? [{ tag: element.tagName, className: element.getAttribute('class'), left: bounds.left, right: bounds.right }]
          : []
      })
    return { viewport, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, outside }
  })
  assert.ok(geometry.documentWidth <= geometry.viewport + 1 && geometry.bodyWidth <= geometry.viewport + 1, `${label}: document overflow ${JSON.stringify(geometry)}`)
  assert.deepEqual(geometry.outside, [], `${label}: descendant content extends beyond viewport despite body overflow clipping`)
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end()
      return
    }
    if (url.pathname === '/preview') {
      const fixture = fixtures.find((item) => item.variant === url.searchParams.get('variant') && item.locale === url.searchParams.get('locale'))
      if (!fixture) { response.writeHead(404).end(); return }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(fixtureHtml(fixture))
      return
    }
    const asset = await realpath(path.resolve(publicDirectory, `.${decodeURIComponent(url.pathname)}`))
    if (!asset.startsWith(`${publicDirectory}${path.sep}`)) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': mimeTypes[path.extname(asset).toLowerCase()] || 'application/octet-stream' }).end(await readFile(asset))
  } catch {
    response.writeHead(404).end()
  }
})

let browser
let checked = 0
let checkedTextReflow = 0
const failures = []
try {
  await mkdir(outputDirectory, { recursive: true })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true })

  for (const fixture of fixtures) {
    for (const viewport of viewports) {
      const label = `${fixture.variant}-${fixture.locale}-${viewport.width}`
      const context = await browser.newContext({
        viewport, reducedMotion: 'reduce', hasTouch: viewport.width <= 768,
        isMobile: viewport.width < 768, deviceScaleFactor: 1,
      })
      let page
      try {
        page = await context.newPage()
        const pageErrors = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
        await page.goto(`${origin}/preview?variant=${fixture.variant}&locale=${fixture.locale}`, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        assert.equal(await page.locator('[data-loading-page]').count(), 1, `${label}: loading root`)
        assert.equal(await page.locator('[data-loading-status]').count(), 1, `${label}: loading status`)
        assert.equal(await page.locator('[data-loading-contact]').count(), 1, `${label}: contact region`)
        assert.equal(await page.locator('[data-loading-status]').getAttribute('role'), 'status', `${label}: accessible loading announcement`)
        assert.equal(await page.locator('[data-loading-status]').getAttribute('aria-live'), 'polite', `${label}: non-interrupting loading announcement`)

        const typography = await page.evaluate(() => ({
          headingToken: getComputedStyle(document.documentElement).getPropertyValue('--fs-2xl').trim(),
          heading: parseFloat(getComputedStyle(document.querySelector('[data-loading-status] strong')).fontSize),
          hint: parseFloat(getComputedStyle(document.querySelector('[data-loading-status] p')).fontSize),
        }))
        assert.ok(typography.headingToken, `${label}: global font tokens must survive the offline font-import removal`)
        assert.ok(typography.heading > typography.hint, `${label}: loading heading must be larger than its supporting copy`)
        await assertNoOverflow(page, label)

        const state = await page.evaluate(() => {
          const contact = document.querySelector('[data-loading-contact]')
          return {
            links: [...contact.querySelectorAll('a')].map((link) => ({
              href: link.getAttribute('href'), label: link.getAttribute('aria-label') || link.textContent.trim(),
              target: link.target, rel: link.rel,
            })),
            contactBusy: Boolean(contact.closest('[aria-busy="true"], [role="status"], [aria-live="polite"], [aria-live="assertive"]')),
            missingImages: [...document.querySelectorAll('[data-loading-page] img')].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
            activeAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
          }
        })
        assert.equal(state.contactBusy, false, `${label}: contact links must be outside busy/live loading content`)
        assert.deepEqual(state.missingImages, [], `${label}: local images must load`)
        assert.equal(state.activeAnimations, 0, `${label}: reduced motion disables animations`)
        for (const href of expectedLinks) assert.ok(state.links.some((link) => link.href === href && link.label), `${label}: missing named contact link ${href}`)
        for (const link of state.links.filter((link) => link.target === '_blank')) {
          assert.ok(link.rel.includes('noopener') && link.rel.includes('noreferrer'), `${label}: safe external link ${link.href}`)
        }

        await page.locator('[data-loading-contact] a').first().focus()
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const element = document.activeElement
          const style = getComputedStyle(element)
          return {
            inContact: Boolean(element.closest('[data-loading-contact]')),
            keyboardVisible: element.matches(':focus-visible'),
            outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 && style.outlineColor !== 'rgba(0, 0, 0, 0)',
            shadow: style.boxShadow !== 'none',
          }
        })
        assert.ok(focus.inContact && focus.keyboardVisible && (focus.outline || focus.shadow), `${label}: contact links need a visible keyboard focus indicator`)
        await page.locator('[data-loading-page]').click({ position: { x: 2, y: 2 } })
        await page.screenshot({ path: path.join(outputDirectory, `${label}.png`), fullPage: true })
        assert.deepEqual(pageErrors, [], `${label}: browser errors`)
        checked += 1
        console.log(`PASS ${label}: layout, contacts, keyboard focus, reduced motion`)
        if (viewport.width === 320 || viewport.width === 1440) {
          await page.evaluate(() => {
            const root = document.documentElement
            root.style.setProperty('font-size', `${parseFloat(getComputedStyle(root).fontSize) * 2}px`, 'important')
          })
          await page.screenshot({ path: path.join(outputDirectory, `${label}-text200.png`), fullPage: true })
          await assertNoOverflow(page, `${label} at 200% root font size`)
          checkedTextReflow += 1
        }
      } catch (error) {
        failures.push(`${label}: ${error.message}`)
        console.error(`FAIL ${label}: ${error.message}`)
        if (page) await page.screenshot({ path: path.join(outputDirectory, `${label}-failed.png`), fullPage: true }).catch(() => {})
      } finally {
        await context.close()
      }
    }
  }
  console.log(`Passed ${checked}/24 loading previews and ${checkedTextReflow}/12 text-reflow checks at 200%. Screenshots: ${path.relative(root, outputDirectory)}`)
  console.log('These are isolated component previews; font fallback is local and live route streaming is not simulated.')
  assert.deepEqual(failures, [], 'Loading-preview checks must all pass')
} finally {
  if (browser) await browser.close()
  if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}
