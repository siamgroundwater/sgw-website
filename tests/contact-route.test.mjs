import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { NextRequest } from 'next/server.js'

// Exercise the route itself, not a second copy of its validation. All delivery
// requests are intercepted; these tests never read .env.local or send email.
const routeUrl = new URL('../src/app/api/contact/route.ts', import.meta.url).href
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === routeUrl) {
      if (specifier === 'next/server') return nextResolve('next/server.js', context)
      if (specifier === '@/lib/contact-validation') {
        return { url: new URL('../src/lib/contact-validation.ts', import.meta.url).href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})
const { POST } = await import(routeUrl)
hook.deregister()

const valid = {
  subject: 'Groundwater survey', name: 'Test contact', company: 'Test only',
  phone: '0812345678', email: 'test@example.invalid',
  details: 'Test delivery content', consent: 'accepted',
}
let client = 0
const environmentKeys = ['RESEND_API_KEY', 'CONTACT_FROM_EMAIL', 'CONTACT_TO_EMAIL']
const previousEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]))
let deliveries, deliver

test.beforeEach(t => {
  process.env.RESEND_API_KEY = 'unit-test-not-a-real-key'
  process.env.CONTACT_FROM_EMAIL = 'from@example.invalid'
  process.env.CONTACT_TO_EMAIL = 'to@example.invalid'
  deliveries = []
  deliver = async () => Response.json({ id: 'test-only' })
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails')
    deliveries.push({ url, options })
    return deliver()
  })
})
test.afterEach(() => {
  for (const key of environmentKeys) {
    if (previousEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = previousEnvironment[key]
  }
})

function request(body, headers = {}) {
  return new NextRequest('https://sgw.example.invalid/api/contact', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': `test-${++client}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('contact route rejects malformed and non-object JSON without calling the email provider', async () => {
  for (const body of ['{bad json', 'null', '[]', 'true', '42', '"text"', '{}']) {
    const response = await POST(request(body))
    assert.equal(response.status, 400, `Expected a controlled validation response for ${body}`)
    assert.equal(typeof (await response.json()).message, 'string')
  }
  assert.equal(deliveries.length, 0)
})

test('contact route validates consent and email before delivery', async () => {
  for (const body of [{ ...valid, consent: '' }, { ...valid, email: 'invalid' }, { ...valid, name: null }]) {
    assert.equal((await POST(request(body))).status, 400)
  }
  assert.equal(deliveries.length, 0)
})

test('contact route safely handles interrupted bodies and oversized JSON with a missing or false length', async () => {
  const interrupted = request('{}')
  interrupted.text = async () => { throw new Error('connection interrupted') }
  assert.equal((await POST(interrupted)).status, 400)
  for (const headers of [{}, { 'content-length': '10' }]) {
    assert.equal((await POST(request({ ...valid, details: 'ก'.repeat(5000) }, headers))).status, 413)
  }
  assert.equal(deliveries.length, 0)
})

test('contact route rejects foreign origins and declared oversized requests without delivery', async () => {
  assert.equal((await POST(request(valid, { origin: 'https://foreign.example.invalid' }))).status, 403)
  assert.equal((await POST(request(valid, { origin: 'invalid' }))).status, 403)
  assert.equal((await POST(request(valid, { 'content-length': '12001' }))).status, 413)
  assert.equal(deliveries.length, 0)
})

test('contact honeypot accepts bots silently without sending mail', async () => {
  assert.equal((await POST(request({ website: 'bot.example.invalid' }))).status, 200)
  assert.equal(deliveries.length, 0)
})

test('contact rate limit allows five submissions and stops the sixth before delivery', async () => {
  const identity = `rate-limit-${++client}`
  for (let index = 0; index < 6; index += 1) {
    const response = await POST(request(valid, { 'x-real-ip': identity }))
    assert.equal(response.status, index < 5 ? 200 : 429)
  }
  assert.equal(deliveries.length, 5)
})

test('contact delivery is normalized and uses the configured destination and reply address', async () => {
  const response = await POST(request({ ...valid, subject: '  Survey  ', name: '  Person  ' }, {
    origin: 'https://sgw.example.invalid',
  }))
  assert.equal(response.status, 200)
  assert.equal(deliveries.length, 1)
  const sent = JSON.parse(deliveries[0].options.body)
  assert.deepEqual(sent.to, ['to@example.invalid'])
  assert.equal(sent.from, 'from@example.invalid')
  assert.equal(sent.reply_to, valid.email)
  assert.equal(sent.subject, '[เว็บไซต์ SGW] Survey')
  assert.ok(sent.text.includes('ชื่อ: Person'))
  assert.equal(deliveries[0].options.signal instanceof AbortSignal, true)
})

test('contact missing configuration fails safely without calling the provider', async () => {
  delete process.env.RESEND_API_KEY
  const response = await POST(request(valid))
  assert.equal(response.status, 503)
  assert.ok((await response.json()).message.includes('sgw_th@outlook.com'))
  assert.equal(deliveries.length, 0)
})

test('contact provider rejection and network failure are controlled errors, not success', async () => {
  for (const fail of [
    async () => Response.json({ error: 'private provider detail' }, { status: 429 }),
    async () => { throw new Error('private provider connection detail') },
    async () => { throw new DOMException('private provider timeout', 'TimeoutError') },
  ]) {
    deliver = fail
    const response = await POST(request(valid))
    assert.equal(response.status, 502)
    const body = await response.json()
    assert.equal(body.message.includes('private provider'), false)
    assert.ok(body.message.includes('sgw_th@outlook.com'))
  }
  assert.equal(deliveries.length, 3)
})
