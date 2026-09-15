import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { MongoClient, type Document } from 'mongodb'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (
  !/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB ||
  database === process.env.CMS_E2E_SOURCE_DATABASE || !password || !origin ||
  process.env.CLOUDINARY_CLOUD_NAME !== 'isolated-test-no-provider'
) throw new Error('CMS concurrency tests require the isolated no-provider npm run test:e2e:cms runner.')
const server = new URL(origin)
if (server.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(server.hostname) || !server.port) {
  throw new Error('CMS concurrency tests require the isolated local HTTP server.')
}

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
const directory = db.collection<Document & { _id: string }>('cmsTeamDirectory')
const siteMedia = db.collection<Document & { _id: string }>('cmsSiteMedia')
const operationIds = new Set<string>()
let previousDirectory: (Document & { _id: string }) | null
let previousMedia: (Document & { _id: string }) | null

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })
test.beforeEach(async () => {
  operationIds.clear()
  previousDirectory = await directory.findOne({ _id: 'about-teams' })
  previousMedia = await siteMedia.findOne({ _id: 'about-hero' })
})
test.afterEach(async () => {
  // Restore only the exact test directory/section so the existing lifecycle
  // specs still exercise their initial fallback state in this isolated DB.
  if (previousDirectory) await directory.replaceOne({ _id: 'about-teams' }, previousDirectory, { upsert: true })
  else await directory.deleteOne({ _id: 'about-teams' })
  if (previousMedia) await siteMedia.replaceOne({ _id: 'about-hero' }, previousMedia, { upsert: true })
  else await siteMedia.deleteOne({ _id: 'about-hero' })
  await db.collection('cmsTeamOperations').deleteMany({ operationId: { $in: [...operationIds] } })
})

function operation() {
  const id = randomUUID()
  operationIds.add(id)
  return id
}

async function login(request: APIRequestContext, role = 'admin') {
  const response = await request.post('/api/cms/auth/login', {
    headers: { Origin: origin }, data: { username: 'qa-' + role, password },
  })
  expect(response.ok(), 'The isolated test account must sign in').toBeTruthy()
}

async function json(response: APIResponse) {
  const payload = await response.json()
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy()
  return payload
}

async function assertOneWinner(responses: APIResponse[], successStatus = 200) {
  expect(responses.map((response) => response.status()).sort((left, right) => left - right)).toEqual([successStatus, 409])
  const winner = responses.findIndex((response) => response.status() === successStatus)
  return { index: winner, payload: await json(responses[winner]) }
}

test('simultaneous identical team creates commit once and reject operation reuse with different content', async ({ request }) => {
  await login(request)
  const initial = await json(await request.get('/api/cms/teams'))
  const input = { department: 'marketing', name: 'ทีมทดสอบคำขอซ้ำ ' + randomUUID().slice(0, 8), order: 99, translations: {} }
  const body = { expectedRevision: initial.revision, input, operationId: operation() }
  const responses = await Promise.all([
    request.post('/api/cms/teams', { headers: { Origin: origin }, data: body }),
    request.post('/api/cms/teams', { headers: { Origin: origin }, data: body }),
  ])
  expect(responses.map((response) => response.status())).toEqual([201, 201])
  const results = await Promise.all(responses.map(json))
  expect(results[0].result.teamId).toBe(results[1].result.teamId)
  expect(results.map((result) => result.recovered).sort()).toEqual([false, true])
  const current = await json(await request.get('/api/cms/teams'))
  expect(current.revision).toBe(initial.revision + 1)
  expect(current.teams).toHaveLength(initial.teams.length + 1)
  expect(current.teams.filter((team: { name: string }) => team.name === input.name)).toHaveLength(1)
  expect(await db.collection('cmsTeamOperations').countDocuments({ operationId: body.operationId })).toBe(1)
  const changed = await request.post('/api/cms/teams', {
    headers: { Origin: origin }, data: { ...body, input: { ...input, name: 'คำขอเดิมแต่คนละเนื้อหา' } },
  })
  expect(changed.status()).toBe(409)
  expect((await json(await request.get('/api/cms/teams'))).revision).toBe(current.revision)
})

test('simultaneous member-order saves keep only the winning order and exactly one leader', async ({ request }) => {
  await login(request)
  const initial = await json(await request.get('/api/cms/teams?id=fallback-management-1'))
  const originalIds = initial.members.map((member: { id: string }) => member.id)
  expect(originalIds.length).toBeGreaterThan(2)
  const orders = [
    [originalIds[1], originalIds[0], ...originalIds.slice(2)],
    [originalIds[2], ...originalIds.filter((id: string) => id !== originalIds[2])],
  ]
  const bodies = orders.map((ids) => ({
    action: 'reorder', teamId: initial.item.id, ids, expectedRevision: initial.revision, operationId: operation(),
  }))
  const responses = await Promise.all(bodies.map((data) => request.put('/api/cms/team-members', { headers: { Origin: origin }, data })))
  const winner = await assertOneWinner(responses)
  const current = await json(await request.get('/api/cms/teams?id=' + initial.item.id))
  expect(current.revision).toBe(initial.revision + 1)
  expect(current.members.map((member: { id: string }) => member.id)).toEqual(orders[winner.index])
  expect(current.members.filter((member: { role: string }) => member.role === 'leader')).toHaveLength(1)
  expect(current.members[0].role).toBe('leader')
  expect(current.members.slice(1).every((member: { role: string }) => member.role === 'member')).toBe(true)
  expect(current.members.map((member: { order: number }) => member.order)).toEqual(originalIds.map((_: string, index: number) => index))
  const stored = await directory.findOne({ _id: 'about-teams' })
  const storedTeam = stored!.teams.find((team: { id: string }) => team.id === initial.item.id)
  expect(storedTeam.members.filter((member: { role: string }) => member.role === 'leader').map((member: { id: string }) => member.id)).toEqual([orders[winner.index][0]])

  const replay = await json(await request.put('/api/cms/team-members', { headers: { Origin: origin }, data: bodies[winner.index] }))
  expect(replay.recovered).toBe(true)
  expect(replay.result.revision).toBe(current.revision)
  const stale = await request.put('/api/cms/team-members', {
    headers: { Origin: origin }, data: { ...bodies[1 - winner.index], operationId: operation() },
  })
  expect(stale.status()).toBe(409)
  const incomplete = await request.put('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { ...bodies[0], ids: orders[0].slice(1), expectedRevision: current.revision, operationId: operation() },
  })
  expect(incomplete.status()).toBe(409)
  const afterRejected = await json(await request.get('/api/cms/teams?id=' + initial.item.id))
  expect(afterRejected.revision).toBe(current.revision)
  expect(afterRejected.members).toEqual(current.members)
})

test('simultaneous member promotions cannot create two leaders or overwrite the winning role change', async ({ request }) => {
  await login(request)
  const initial = await json(await request.get('/api/cms/teams?id=fallback-management-1'))
  const candidates = initial.members.filter((member: { role: string }) => member.role === 'member').slice(0, 2)
  expect(candidates).toHaveLength(2)
  const responses = await Promise.all(candidates.map((member: Record<string, unknown>) => request.put('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { id: member.id, expectedRevision: initial.revision, operationId: operation(), input: { ...member, role: 'leader' } },
  })))
  const winner = await assertOneWinner(responses)
  const current = await json(await request.get('/api/cms/teams?id=' + initial.item.id))
  expect(current.revision).toBe(initial.revision + 1)
  const leaders = current.members.filter((member: { role: string }) => member.role === 'leader')
  expect(leaders).toHaveLength(1)
  expect(leaders[0].id).toBe(candidates[winner.index].id)
  expect(current.members.find((member: { id: string }) => member.id === candidates[1 - winner.index].id).role).toBe('member')
  expect(current.members).toHaveLength(initial.members.length)
  expect(winner.payload.item.id).toBe(leaders[0].id)
})

test('simultaneous website-media saves protect both the first insert and later edits from stale overwrites', async ({ request }) => {
  await login(request)
  const initial = (await json(await request.get('/api/cms/media?section=about-hero'))).item
  expect(initial.images.length).toBeGreaterThan(2)
  let current = initial
  for (const candidates of [
    [[...initial.images], [...initial.images].reverse()],
    [[...initial.images.slice(1), initial.images[0]], initial.images.slice(0, 3)],
  ]) {
    const previous = current
    const bodies = candidates.map((images) => ({ section: 'about-hero', images, expectedUpdatedAt: previous.updatedAt }))
    const responses = await Promise.all(bodies.map((data) => request.put('/api/cms/media', { headers: { Origin: origin }, data })))
    const winner = await assertOneWinner(responses)
    current = (await json(await request.get('/api/cms/media?section=about-hero'))).item
    expect(current.images).toEqual(candidates[winner.index])
    expect(current.updatedAt).not.toBe(previous.updatedAt)
    expect(current.fallback).toBe(false)
    expect(await siteMedia.countDocuments({ _id: 'about-hero' })).toBe(1)
    const stored = await siteMedia.findOne({ _id: 'about-hero' })
    expect(stored!.images.map((image: { src: string }) => image.src)).toEqual(current.images)
    const stale = await request.put('/api/cms/media', { headers: { Origin: origin }, data: bodies[1 - winner.index] })
    expect(stale.status()).toBe(409)
    expect((await json(await request.get('/api/cms/media?section=about-hero'))).item).toEqual(current)
  }
  const invalid = await request.put('/api/cms/media', {
    headers: { Origin: origin }, data: { section: 'about-hero', images: [], expectedUpdatedAt: current.updatedAt },
  })
  expect(invalid.status()).toBe(400)
  expect((await json(await request.get('/api/cms/media?section=about-hero'))).item).toEqual(current)
})

test('viewers can read teams and media but cannot mutate them or start their upload workflows', async ({ request }) => {
  await login(request, 'viewer')
  const initialTeams = await json(await request.get('/api/cms/teams?id=fallback-management-1'))
  const initialMedia = (await json(await request.get('/api/cms/media?section=about-hero'))).item
  const stagedCount = await db.collection('cmsStagedProjectMedia').countDocuments({})
  const responses = await Promise.all([
    request.post('/api/cms/teams', { headers: { Origin: origin }, data: { expectedRevision: initialTeams.revision, operationId: operation(), input: { department: 'marketing', name: 'ไม่ได้รับอนุญาต', order: 0, translations: {} } } }),
    request.put('/api/cms/team-members', { headers: { Origin: origin }, data: { action: 'reorder', teamId: initialTeams.item.id, expectedRevision: initialTeams.revision, operationId: operation(), ids: initialTeams.members.map((member: { id: string }) => member.id).reverse() } }),
    request.put('/api/cms/media', { headers: { Origin: origin }, data: { section: 'about-hero', expectedUpdatedAt: initialMedia.updatedAt, images: [...initialMedia.images].reverse() } }),
    request.post('/api/cms/media/upload', { headers: { Origin: origin }, multipart: { section: 'about-hero', submissionId: randomUUID(), file: { name: 'denied.png', mimeType: 'image/png', buffer: Buffer.from('not-uploaded') } } }),
    request.post('/api/cms/team-members/media', { headers: { Origin: origin }, multipart: { submissionId: randomUUID(), file: { name: 'denied.png', mimeType: 'image/png', buffer: Buffer.from('not-uploaded') } } }),
  ])
  expect(responses.map((response) => response.status())).toEqual([403, 403, 403, 403, 403])
  expect(await db.collection('cmsStagedProjectMedia').countDocuments({})).toBe(stagedCount)
  expect(await json(await request.get('/api/cms/teams?id=fallback-management-1'))).toEqual(initialTeams)
  expect((await json(await request.get('/api/cms/media?section=about-hero'))).item).toEqual(initialMedia)
})
