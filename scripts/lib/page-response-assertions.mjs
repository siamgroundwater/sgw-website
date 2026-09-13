import assert from 'node:assert/strict'

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] || ''
}

function metaTags(html) {
  return html.match(/<meta\b[^>]*>/gi) || []
}

function hasNoindex(html) {
  return metaTags(html).some(tag => attribute(tag, 'name').toLowerCase() === 'robots'
    && attribute(tag, 'content').toLowerCase().split(/[\s,]+/).includes('noindex'))
}

function hasNextErrorDigest(html, digest) {
  // Next emits a template for an early Suspense failure, or a Flight error
  // record when the failure arrives later in the stream. Ordinary "404" text
  // or a serialized, unused not-found component is not evidence of a failure.
  return (html.match(/<template\b[^>]*>/gi) || []).some(tag => attribute(tag, 'data-dgst') === digest)
    || html.includes(`\\"digest\\":\\"${digest}\\"`)
}

const projectContent = /\bclass\s*=\s*["'][^"']*\bproject-detail-(?:page|card)\b/i
const protectedCmsContent = /\bclass\s*=\s*["'][^"']*\bcms-(?:shell|project-grid|project-card)\b/i

/** Missing projects may finish as streamed notFound() after loading.tsx sends HTTP 200. */
export function assertMissingProjectPage(status, html, route) {
  assert.doesNotMatch(html, projectContent, `${route}: missing project rendered project content.`)
  if (status === 404) return
  assert.equal(status, 200, `${route}: expected HTTP 404 or an explicit streamed not-found response.`)
  assert.ok(hasNextErrorDigest(html, 'NEXT_HTTP_ERROR_FALLBACK;404'), `${route}: HTTP 200 without a Next.js not-found signal.`)
  assert.ok(hasNoindex(html), `${route}: streamed not-found response must include robots noindex.`)
}

/** A successful status alone cannot distinguish a real detail page from a streamed error. */
export function assertProjectPage(status, html, route) {
  assert.equal(status, 200, `${route}: project page failed.`)
  assert.match(html, projectContent, `${route}: missing project content.`)
  assert.ok(!hasNextErrorDigest(html, 'NEXT_HTTP_ERROR_FALLBACK;404'), `${route}: project returned not found.`)
  assert.ok(!hasNoindex(html), `${route}: public project must be indexable.`)
}

/** redirect() uses a meta refresh instead of a Location header once streaming starts. */
export function assertCmsLoginRedirect(status, html, location, baseUrl) {
  assert.doesNotMatch(html, protectedCmsContent, 'Signed-out CMS request rendered protected content.')
  let target = location
  if (status === 200) {
    const refresh = metaTags(html).find(tag => attribute(tag, 'id') === '__next-page-redirect'
      && attribute(tag, 'http-equiv').toLowerCase() === 'refresh')
    target = attribute(refresh || '', 'content').match(/^\s*\d+(?:\.\d+)?\s*;\s*url=(.+)$/i)?.[1] || ''
    assert.ok(target, 'Signed-out CMS response is missing the Next.js login redirect.')
    assert.ok(['replace', 'push'].some(type => [307, 308].some(code =>
      hasNextErrorDigest(html, `NEXT_REDIRECT;${type};${target};${code};`))),
    'Signed-out CMS response is missing the matching redirect signal.')
    assert.ok(hasNoindex(html), 'Signed-out CMS response must include robots noindex.')
  } else {
    assert.ok([307, 308].includes(status), 'Signed-out CMS request must redirect to login.')
  }
  assert.ok(target, 'Signed-out CMS response is missing its redirect destination.')
  const destination = new URL(target, baseUrl)
  assert.equal(destination.origin, new URL(baseUrl).origin, 'CMS login redirect must stay on this site.')
  assert.equal(destination.pathname, '/cms/login', 'CMS redirect must lead to the login page.')
}
