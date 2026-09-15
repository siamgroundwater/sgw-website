import { expect, test } from '@playwright/test'
import { MongoClient } from 'mongodb'

const database = process.env.CMS_E2E_DATABASE || ''
const origin = process.env.CMS_E2E_BASE_URL || ''
const password = process.env.CMS_E2E_PASSWORD || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database) || database !== process.env.MONGODB_DB ||
  database === process.env.CMS_E2E_SOURCE_DATABASE || !password ||
  process.env.CLOUDINARY_CLOUD_NAME !== 'isolated-test-no-provider') {
  throw new Error('CMS request-body tests require the isolated no-provider CMS runner.')
}
const server = new URL(origin)
if (server.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(server.hostname) || !server.port) {
  throw new Error('CMS request-body tests require the isolated loopback server.')
}

test('all CMS JSON write endpoints reject malformed shapes without 500 errors or data changes', async ({ request }) => {
  const login = await request.post('/api/cms/auth/login', {
    headers: { Origin: origin }, data: { username: 'qa-admin', password },
  })
  expect(login.status()).toBe(200)
  const client = new MongoClient(process.env.MONGODB_URI!)
  try {
    await client.connect()
    const db = client.db(database)
    const protectedCollections = ['cmsProjects', 'cmsSiteMedia', 'cmsUsers', 'cmsTeamDirectory', 'cmsStagedProjectMedia']
    const counts = () => Promise.all(protectedCollections.map(name => db.collection(name).countDocuments({})))
    const before = await counts()
    const endpoints: [string, string[]][] = [
      ['/api/cms/projects', ['POST', 'PUT', 'PATCH', 'DELETE']],
      ['/api/cms/users', ['POST', 'PUT']],
      ['/api/cms/teams', ['POST', 'PUT', 'DELETE']],
      ['/api/cms/team-members', ['POST', 'PUT', 'DELETE']],
      ['/api/cms/media', ['PUT']],
      ['/api/cms/media/upload', ['DELETE']],
      ['/api/cms/projects/media', ['DELETE']],
      ['/api/cms/team-members/media', ['DELETE']],
      ['/api/cms/account/password', ['POST']],
    ]
    for (const [pathname, methods] of endpoints) for (const method of methods) {
      for (const body of ['null', '[]', 'true', '"text"', '{broken']) {
        const response = await request.fetch(pathname, {
          method, data: body, headers: { Origin: origin, 'Content-Type': 'application/json' },
        })
        expect(response.status(), `${method} ${pathname}: ${body}`).toBe(400)
        expect(typeof (await response.json()).error).toBe('string')
      }
    }
    expect(await counts()).toEqual(before)
  } finally {
    await client.close()
  }
})
