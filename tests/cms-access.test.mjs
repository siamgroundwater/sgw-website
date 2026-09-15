import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { ObjectId } from 'mongodb'
import { cmsLoginHref, isCmsSessionRevoked, retryAfterSeconds, safeCmsReturnTo, validateCmsUserForm } from '../src/lib/cms-access.ts'
import * as access from '../src/lib/cms-access.ts'
import { cmsAuditActionLabel, cmsAuditActions, cmsAuditDateRange, cmsAuditPageHref, normalizeCmsAuditFilters } from '../src/lib/cms-audit.ts'
import { hashCmsPassword, verifyCmsPassword } from '../src/lib/cms-password.ts'

test('CMS return paths keep local editing context and reject external or login destinations', () => {
  assert.equal(safeCmsReturnTo('/cms/projects/123?tab=images#details'), '/cms/projects/123?tab=images#details')
  for (const value of ['https://attacker.example', '//attacker.example', '/cms\\attacker.example', '/cmsevil', '/cms/../../outside', '/cms/login', '/cms/login/next', '/cms\n/projects', null, ['/cms/users']]) assert.equal(safeCmsReturnTo(value), '/cms/dashboard')
  assert.equal(cmsLoginHref('/cms/users'), '/cms/login?returnTo=%2Fcms%2Fusers')
})

test('retry countdown handles numeric and HTTP-date Retry-After values with bounded fallbacks', () => {
  assert.equal(retryAfterSeconds('123'), 123)
  assert.equal(retryAfterSeconds('999999'), 900)
  assert.equal(retryAfterSeconds(null), 60)
  assert.equal(retryAfterSeconds('garbage'), 60)
  assert.equal(retryAfterSeconds('Thu, 01 Jan 2026 00:02:00 GMT', Date.parse('2026-01-01T00:00:00Z')), 120)
})

test('user field validation matches required, optional, confirmation, and boundary behavior', () => {
  const good = { name: 'Site editor', username: 'site.editor', email: 'editor@example.test', password: 'new-password-123', passwordConfirmation: 'new-password-123' }
  assert.deepEqual(validateCmsUserForm(good, false), {})
  assert.deepEqual(validateCmsUserForm({ ...good, password: '', passwordConfirmation: '' }, true), {})
  assert.deepEqual(validateCmsUserForm({ ...good, name: ' ', username: 'ab', email: 'bad@', password: 'short', passwordConfirmation: 'short' }, false), { name: 'name', username: 'username', email: 'email', password: 'password' })
  assert.deepEqual(validateCmsUserForm({ ...good, password: 'x'.repeat(257), passwordConfirmation: 'x'.repeat(257) }, true), { password: 'password' })
  assert.deepEqual(validateCmsUserForm({ ...good, passwordConfirmation: 'different-password' }, false), { passwordConfirmation: 'password_mismatch' })
})

test('session revocation closes old and simultaneous tokens without revoking later sign-ins', () => {
  const revoked = new Date('2026-09-12T00:00:00Z')
  assert.equal(isCmsSessionRevoked(revoked.getTime() - 1, revoked), true)
  assert.equal(isCmsSessionRevoked(revoked.getTime(), revoked), true)
  assert.equal(isCmsSessionRevoked(revoked.getTime() + 1, revoked), false)
  assert.equal(isCmsSessionRevoked(revoked.getTime()), false)
})

test('audit filters sanitize inputs, preserve query state, and include a full Bangkok day', () => {
  const filters = normalizeCmsAuditFilters({ actor: ' editor ', project: 'Well & pump', action: 'content.update', from: '2026-09-12', to: '2026-09-12', page: '2' })
  const range = cmsAuditDateRange(filters)
  assert.equal(range.$gte.toISOString(), '2026-09-11T17:00:00.000Z')
  assert.equal(range.$lt.toISOString(), '2026-09-12T17:00:00.000Z')
  const href = new URL(cmsAuditPageHref(filters, 3), 'https://cms.local')
  assert.equal(href.searchParams.get('actor'), 'editor')
  assert.equal(href.searchParams.get('project'), 'Well & pump')
  assert.equal(href.searchParams.get('page'), '3')
  const invalid = normalizeCmsAuditFilters({ actor: { $ne: null }, action: 'anything', from: '2026-02-30', to: ['2026-01-01'], page: '-1' })
  assert.deepEqual(invalid, { actor: '', project: '', action: '', from: '', to: '', page: 1 })
  for (const action of cmsAuditActions) for (const locale of ['th', 'en']) assert.notEqual(cmsAuditActionLabel(action, locale), action)
})

// Exercise the real server module with an in-memory collection. No environment,
// database connection, cookie, or provider credential is loaded by these tests.
function userService(collection) {
  const source = readFileSync(new URL('../src/server/cms/users.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const require = createRequire(import.meta.url)
  const localRequire = (name) => {
    if (name === 'server-only') return {}
    if (name === '@/server/db') return { getCmsUsersCollection: async () => collection }
    if (name === './password') return { hashPassword: hashCmsPassword, verifyPassword: verifyCmsPassword }
    if (name === '@/lib/cms-access') return access
    if (name === '../db/cms-indexes.ts') return require('../src/server/db/cms-indexes.ts')
    return require(name)
  }
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}

test('self password change requires the current secret, hashes the replacement, and revokes old sessions', async () => {
  const id = new ObjectId()
  const original = 'old-account-password-123'
  const replacement = 'new-account-password-456'
  const row = { _id: id, passwordHash: hashCmsPassword(original), name: 'Editor', username: 'editor', role: 'editor', status: 'active' }
  let writes = 0
  const collection = {
    findOne: async (filter) => filter.status === 'active' && row.status !== 'active' ? null : row,
    updateOne: async (filter, update) => {
      assert.equal(filter.passwordHash, row.passwordHash)
      assert.equal(filter.status, 'active')
      writes++
      Object.assign(row, update.$set)
      row.sessionVersion = (row.sessionVersion || 0) + (update.$inc?.sessionVersion || 0)
      return { matchedCount: 1 }
    },
  }
  const service = userService(collection)
  await assert.rejects(service.changeOwnCmsPassword(String(id), 'incorrect', replacement), { code: 'current_password' })
  assert.equal(writes, 0)
  await assert.rejects(service.changeOwnCmsPassword(String(id), original, original), { code: 'password_reused' })
  assert.equal(writes, 0)
  const before = Date.now() - 1
  await service.changeOwnCmsPassword(String(id), original, replacement)
  assert.equal(writes, 1)
  assert.equal(verifyCmsPassword(original, row.passwordHash), false)
  assert.equal(verifyCmsPassword(replacement, row.passwordHash), true)
  assert.ok(row.sessionsRevokedAt instanceof Date)
  assert.equal(await service.findCmsUserSessionById(String(id), before), null)
  assert.equal(await service.findCmsUserSessionById(String(id), Date.now() + 1, 0), null)
  assert.equal((await service.findCmsUserSessionById(String(id), Date.now(), row.sessionVersion)).userId, String(id))
  assert.equal((await service.findCmsUserSessionById(String(id), row.sessionsRevokedAt.getTime() + 1)).userId, String(id))
  assert.equal(JSON.stringify(row).includes(replacement), false)
})

test('a concurrent credential change fails the password compare-and-set instead of overwriting it', async () => {
  const id = new ObjectId()
  const row = { _id: id, passwordHash: hashCmsPassword('current-password-123'), status: 'active' }
  const service = userService({ findOne: async () => row, updateOne: async () => ({ matchedCount: 0 }) })
  await assert.rejects(service.changeOwnCmsPassword(String(id), 'current-password-123', 'replacement-password-456'), { code: 'conflict' })
})

test('a password reset during an in-flight login invalidates the token version that login would issue', async () => {
  const id = new ObjectId()
  const row = { _id: id, passwordHash: hashCmsPassword('current-password-123'), name: 'Editor', username: 'editor', role: 'editor', status: 'active', sessionVersion: 0 }
  const service = userService({
    createIndex: async () => undefined,
    findOne: async () => ({ ...row }),
    updateOne: async () => {
      // Login verified the old snapshot. A reset commits before its token is issued.
      row.passwordHash = hashCmsPassword('reset-password-456')
      row.sessionVersion = 1
      row.sessionsRevokedAt = new Date()
      return { matchedCount: 1 }
    },
  })
  const login = await service.authenticateCmsUser('editor', 'current-password-123')
  assert.equal(login.sessionVersion, 0)
  assert.equal(await service.findCmsUserSessionById(String(id), Date.now() + 100, login.sessionVersion), null)
})
