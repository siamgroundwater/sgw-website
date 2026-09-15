import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

const target = new URL('../src/server/cms/http.ts', import.meta.url).href
const hook = registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL === target && specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true }
  if (context.parentURL === target && specifier === 'next/server') return nextResolve('next/server.js', context)
  return nextResolve(specifier, context)
} })
const { readCmsJsonBody } = await import(target)
hook.deregister()

function request(body, headers = {}) { return new Request('https://test.invalid/api/cms', { method: 'POST', headers, body }) }

test('all CMS JSON endpoints reject null, arrays, primitives and malformed bodies consistently', async () => {
  for (const body of ['null', '[]', 'true', '42', '"text"', '{broken', '']) {
    const result = await readCmsJsonBody(request(body))
    assert.equal(typeof result.error, 'string', body)
    assert.equal(result.value, null)
  }
  assert.deepEqual(await readCmsJsonBody(request('{"title":"ทดสอบ"}')), { error: null, value: { title: 'ทดสอบ' } })
})

test('CMS JSON parsing handles interrupted bodies and enforces actual UTF-8 bytes', async () => {
  const failed = await readCmsJsonBody({ headers: new Headers(), async text() { throw new Error('connection interrupted') } })
  assert.equal(failed.error, 'Invalid JSON request body.')
  const oversized = JSON.stringify({ text: 'ก'.repeat(400000) })
  assert.equal((await readCmsJsonBody(request(oversized, { 'content-length': '10' }))).error, 'Request body is too large.')
  assert.equal((await readCmsJsonBody(request('{}', { 'content-length': '1048577' }))).error, 'Request body is too large.')
})
