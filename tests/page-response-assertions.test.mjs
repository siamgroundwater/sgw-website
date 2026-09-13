import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCmsLoginRedirect, assertMissingProjectPage, assertProjectPage } from '../scripts/lib/page-response-assertions.mjs'

const robots = '<meta name="robots" content="noindex, nofollow"/>'
const notFound = '<template data-dgst="NEXT_HTTP_ERROR_FALLBACK;404"></template>'
const project = '<main class="project-detail-page"><article class="project-detail-card">Project</article></main>'
const base = 'https://example.com'
const redirect = '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/cms/login"/>'
const redirectError = '<template data-dgst="NEXT_REDIRECT;replace;/cms/login;307;"></template>'

test('missing projects accept HTTP 404 and explicit streamed not-found responses', () => {
  assertMissingProjectPage(404, '<h1>404</h1>', '/projects/1')
  assertMissingProjectPage(200, robots + notFound, '/en/projects/1')
  const flight = `<script>self.__next_f.push(${JSON.stringify([1, '12:E{"digest":"NEXT_HTTP_ERROR_FALLBACK;404"}\n'])})</script>`
  assertMissingProjectPage(200, robots + flight, '/projects/1')
  assertMissingProjectPage(200, "<meta content='NOINDEX' name='robots'>" + notFound, '/projects/1')
})

test('missing-project checks reject ordinary 200 pages, incomplete loaders and server failures', () => {
  for (const html of ['', '<main>Loading...</main>', '<h1>404: This page could not be found.</h1>', robots, notFound, robots + '<script>"notFound":{"children":"404"}</script>']) {
    assert.throws(() => assertMissingProjectPage(200, html, '/projects/1'))
  }
  for (const status of [204, 301, 307, 401, 403, 500, 503]) {
    assert.throws(() => assertMissingProjectPage(status, robots + notFound, '/projects/1'))
  }
  for (const status of [200, 404]) {
    assert.throws(() => assertMissingProjectPage(status, robots + notFound + project, '/projects/1'), /rendered project content/)
  }
})

test('live projects must render actual, indexable detail content', () => {
  assertProjectPage(200, project, '/projects/abc')
  for (const html of ['', '<main>Loading...</main>', robots + notFound, robots + project, notFound + project]) {
    assert.throws(() => assertProjectPage(200, html, '/projects/abc'))
  }
  assert.throws(() => assertProjectPage(404, project, '/projects/abc'))
})

test('signed-out CMS accepts HTTP and matching streamed same-origin login redirects', () => {
  for (const status of [307, 308]) {
    assertCmsLoginRedirect(status, '', '/cms/login', base)
    assertCmsLoginRedirect(status, '', base + '/cms/login?returnTo=%2Fcms%2Fprojects', base)
  }
  assertCmsLoginRedirect(200, robots + redirect + redirectError, '', base)
})

test('signed-out CMS rejects missing, mismatched, external or protected-content redirects', () => {
  for (const html of ['', robots, robots + redirect, robots + redirectError, redirect + redirectError, robots + redirect + notFound]) {
    assert.throws(() => assertCmsLoginRedirect(200, html, '', base))
  }
  for (const target of ['', '/cms/dashboard', '/cms/login-fake', 'https://other.example/cms/login', '//other.example/cms/login']) {
    assert.throws(() => assertCmsLoginRedirect(307, '', target, base))
  }
  for (const target of ['/cms/dashboard', 'https://other.example/cms/login']) {
    const html = (robots + redirect + redirectError).replaceAll('/cms/login', target)
    assert.throws(() => assertCmsLoginRedirect(200, html, '', base))
  }
  const protectedHtml = '<main class="cms-shell"><div class="cms-project-grid"></div></main>'
  assert.throws(() => assertCmsLoginRedirect(200, robots + redirect + redirectError + protectedHtml, '', base), /protected content/)
  assert.throws(() => assertCmsLoginRedirect(307, protectedHtml, '/cms/login', base), /protected content/)
  assert.throws(() => assertCmsLoginRedirect(500, robots + redirect + redirectError, '/cms/login', base))
})
