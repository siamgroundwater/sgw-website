import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'

const database = process.env.CMS_E2E_DATABASE || ''
if (!/^sgw_test_[0-9]+_[a-f0-9]{8}$/.test(database)) {
  throw new Error('Run team CMS browser tests through npm run test:e2e:cms; an isolated database is required.')
}

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(database)
const origin = process.env.CMS_E2E_BASE_URL!
const password = process.env.CMS_E2E_PASSWORD!

test.beforeAll(async () => { await client.connect() })
test.afterAll(async () => { await client.close() })

async function loginApi(request: APIRequestContext) {
  const response = await request.post('/api/cms/auth/login', {
    headers: { Origin: origin },
    data: { username: 'qa-admin', password },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
}

async function login(page: Page, destination: string) {
  await page.goto('/cms/login?returnTo=' + encodeURIComponent(destination))
  await page.locator('input[autocomplete="username"]').fill('qa-admin')
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
}

async function json(response: APIResponse) {
  const payload = await response.json()
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy()
  return payload
}

test('team lifecycle is atomic, localized, replay-safe, and protects the required leader', async ({ request }) => {
  await loginApi(request)

  const initial = await json(await request.get('/api/cms/teams'))
  expect(initial.revision).toBe(0)
  expect(initial.teams).toHaveLength(8)
  expect(initial.members).toHaveLength(20)

  const teamOperationId = randomUUID()
  const teamInput = {
    department: 'marketing',
    name: 'ทีมทดสอบระบบ',
    order: 99,
    translations: {
      en: { name: 'CMS workflow team' },
      zh: { name: '内容管理测试团队' },
      ja: { name: 'CMS動作確認チーム' },
    },
  }
  const teamCreated = await json(await request.post('/api/cms/teams', {
    headers: { Origin: origin },
    data: { expectedRevision: 0, input: teamInput, operationId: teamOperationId },
  }))
  expect(teamCreated.result.revision).toBe(1)
  const teamId = teamCreated.result.teamId as string

  const leaderInput = {
    certificates: ['ใบอนุญาตทดสอบ'],
    imageSrc: '/images/personnel/user.png',
    name: 'หัวหน้าทดสอบ',
    order: 0,
    role: 'leader',
    teamId,
    title: 'ตำแหน่งภาษาไทย',
    translations: { en: { certificates: ['QA licence'], name: 'QA leader', title: '' } },
  }
  const leaderCreated = await json(await request.post('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { expectedRevision: 1, input: leaderInput, operationId: randomUUID() },
  }))
  expect(leaderCreated.result.revision).toBe(2)
  const firstMemberId = leaderCreated.result.memberId as string

  const memberInput = {
    certificates: [],
    imageSrc: '/images/personnel/user.png',
    name: 'สมาชิกทดสอบ',
    order: 1,
    role: 'member',
    teamId,
    title: 'ผู้เชี่ยวชาญ',
    translations: { en: { certificates: [], name: 'QA member', title: 'Specialist' } },
  }
  const memberCreated = await json(await request.post('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { expectedRevision: 2, input: memberInput, operationId: randomUUID() },
  }))
  expect(memberCreated.result.revision).toBe(3)
  const secondMemberId = memberCreated.result.memberId as string

  const promotedInput = { ...memberInput, role: 'leader' }
  const promoted = await json(await request.put('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { expectedRevision: 3, id: secondMemberId, input: promotedInput, operationId: randomUUID() },
  }))
  expect(promoted.result.revision).toBe(4)

  const currentTeam = await json(await request.get(`/api/cms/teams?id=${teamId}`))
  expect(currentTeam.members.filter((member: { role: string }) => member.role === 'leader')).toHaveLength(1)
  expect(currentTeam.members.find((member: { id: string }) => member.id === firstMemberId).role).toBe('member')
  expect(currentTeam.members.find((member: { id: string }) => member.id === secondMemberId).role).toBe('leader')

  const englishAbout = await request.get('/en/about')
  expect(englishAbout.ok()).toBeTruthy()
  const englishHtml = await englishAbout.text()
  expect(englishHtml).toContain('CMS workflow team')
  expect(englishHtml).toContain('QA member')
  expect(englishHtml).toContain('ตำแหน่งภาษาไทย')

  const blockedTeamDelete = await request.delete('/api/cms/teams', {
    headers: { Origin: origin },
    data: { confirmation: teamInput.name, expectedRevision: 4, id: teamId, operationId: randomUUID() },
  })
  expect(blockedTeamDelete.status()).toBe(409)

  const blockedLeaderDelete = await request.delete('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { confirmation: memberInput.name, expectedRevision: 4, id: secondMemberId, operationId: randomUUID(), teamId },
  })
  expect(blockedLeaderDelete.status()).toBe(409)

  const firstDeleted = await json(await request.delete('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { confirmation: leaderInput.name, expectedRevision: 4, id: firstMemberId, operationId: randomUUID(), teamId },
  }))
  expect(firstDeleted.result.revision).toBe(5)

  const secondDeleted = await json(await request.delete('/api/cms/team-members', {
    headers: { Origin: origin },
    data: { confirmation: memberInput.name, expectedRevision: 5, id: secondMemberId, operationId: randomUUID(), teamId },
  }))
  expect(secondDeleted.result.revision).toBe(6)

  const deleteOperationId = randomUUID()
  const deleteTeamBody = { confirmation: teamInput.name, expectedRevision: 6, id: teamId, operationId: deleteOperationId }
  const deleted = await json(await request.delete('/api/cms/teams', { headers: { Origin: origin }, data: deleteTeamBody }))
  expect(deleted.result.revision).toBe(7)
  const replayed = await json(await request.delete('/api/cms/teams', { headers: { Origin: origin }, data: deleteTeamBody }))
  expect(replayed.recovered).toBe(true)
  expect(replayed.result.revision).toBe(7)

  const stored = await db.collection<{ _id: string; revision: number; teams: Array<{ id: string }> }>('cmsTeamDirectory').findOne({ _id: 'about-teams' })
  expect(stored?.revision).toBe(7)
  expect(stored?.teams).toHaveLength(8)
  expect(stored?.teams.some((team: { id: string }) => team.id === teamId)).toBe(false)
})

test('team CMS stays scannable, opens dedicated tabs, and does not expose portrait URLs', async ({ page }) => {
  await login(page, '/cms/teams')
  await expect(page.locator('.cms-team-card')).toHaveCount(8)
  await expect(page.locator('.cms-team-drag-handle')).toHaveCount(0)
  await expect(page.locator('.cms-team-card-drag-cue')).toHaveCount(0)
  await expect(page.locator('[data-cms-team-save]')).toHaveCount(2)
  const departmentColors = await page.locator('.cms-team-card').evaluateAll((cards) => Object.fromEntries(cards.map((card) => [
    card.getAttribute('data-cms-sort-group'),
    getComputedStyle(card).backgroundImage,
  ])))
  expect(new Set(Object.values(departmentColors)).size).toBe(Object.keys(departmentColors).length)

  const initialOrder = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  const firstMovableCard = page.locator('.cms-team-card[data-cms-sortable="true"]').first()
  const movableTeamId = await firstMovableCard.getAttribute('data-cms-sort-id')
  expect(movableTeamId).toBeTruthy()
  const sortGroup = await firstMovableCard.getAttribute('data-cms-sort-group')
  expect(sortGroup).toBeTruthy()
  const sortableGroup = page.locator(`.cms-team-card[data-cms-sortable="true"][data-cms-sort-group="${sortGroup}"]`)
  expect(await sortableGroup.count()).toBeGreaterThan(1)
  const sourceBox = await sortableGroup.nth(0).boundingBox()
  const targetBox = await sortableGroup.nth(1).boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  const unexpectedPopup = page.waitForEvent('popup', { timeout: 500 }).then(() => true).catch(() => false)
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))).not.toEqual(initialOrder)
  expect(await unexpectedPopup).toBe(false)

  const crossSource = page.locator('.cms-team-card[data-cms-sortable="true"]').first()
  const crossSourceGroup = await crossSource.getAttribute('data-cms-sort-group')
  expect(crossSourceGroup).toBeTruthy()
  const crossTarget = page.locator(`.cms-team-card[data-cms-sortable="true"]:not([data-cms-sort-group="${crossSourceGroup}"])`).first()
  await expect(crossTarget).toBeVisible()
  const groupSequenceBeforeCrossDrag = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-group')))
  const idSequenceBeforeCrossDrag = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  const crossSourceBox = await crossSource.boundingBox()
  const crossTargetBox = await crossTarget.boundingBox()
  expect(crossSourceBox).not.toBeNull()
  expect(crossTargetBox).not.toBeNull()
  const crossDragPopup = page.waitForEvent('popup', { timeout: 500 }).then(() => true).catch(() => false)
  await page.mouse.move(crossSourceBox!.x + crossSourceBox!.width / 2, crossSourceBox!.y + crossSourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(crossTargetBox!.x + crossTargetBox!.width / 2, crossTargetBox!.y + crossTargetBox!.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-group')))).toEqual(groupSequenceBeforeCrossDrag)
  await expect.poll(() => page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))).toEqual(idSequenceBeforeCrossDrag)
  expect(await crossDragPopup).toBe(false)
  const stagedOrder = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))

  const observer = await page.context().newPage()
  await observer.goto('/cms/teams')
  const orderBeforeSave = await observer.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  expect(orderBeforeSave).toEqual(initialOrder)
  await observer.close()

  const saveOrder = page.locator('[data-cms-team-save="footer"]')
  await expect(saveOrder).toBeEnabled()
  await saveOrder.click()
  await expect(page.locator('.cms-message')).toContainText(/บันทึกลำดับทีมแล้ว|Team order saved/)
  await page.reload()
  const persistedOrder = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  expect(persistedOrder).toEqual(stagedOrder)
  await expect(page.locator('.cms-team-order-controls')).toHaveCount(0)

  await page.locator('.cms-team-search input').fill('ทีม')
  await expect(page.locator('.cms-team-card')).not.toHaveCount(0)
  const columns = await page.locator('.cms-team-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(3)
  await page.locator('.cms-team-search input').fill('')

  const clickableCard = page.locator('.cms-team-card[data-cms-sortable="true"]').first()
  const clickPopupPromise = page.waitForEvent('popup')
  await clickableCard.click({ delay: 260 })
  const clickEditor = await clickPopupPromise
  await clickEditor.waitForLoadState('domcontentloaded')
  await expect(clickEditor).toHaveURL(/\/cms\/teams\//)
  await clickEditor.close()

  const keyboardPopupPromise = page.waitForEvent('popup')
  await clickableCard.focus()
  await clickableCard.press('Enter')
  const keyboardEditor = await keyboardPopupPromise
  await keyboardEditor.waitForLoadState('domcontentloaded')
  await expect(keyboardEditor).toHaveURL(/\/cms\/teams\//)
  await keyboardEditor.close()

  const orderBeforeKeyboardCancel = await page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  await clickableCard.scrollIntoViewIfNeeded()
  await clickableCard.focus()
  await clickableCard.press('Space')
  await expect(page.locator('.cms-team-card[data-dnd-dragging="true"]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.cms-team-card[data-dnd-dragging="true"]')).toHaveCount(0)
  await expect.poll(() => page.locator('.cms-team-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))).toEqual(orderBeforeKeyboardCancel)

  const editPopupPromise = page.waitForEvent('popup')
  const managementCard = page.locator('[data-cms-sort-id="fallback-management-1"]')
  await expect(managementCard).toHaveAttribute('href', '/cms/teams/fallback-management-1')
  await managementCard.focus()
  await managementCard.press('Enter')
  const teamEditor = await editPopupPromise
  await teamEditor.waitForLoadState('domcontentloaded')
  await expect(teamEditor.locator('.cms-language-section')).toHaveCount(3)
  await expect(teamEditor.locator('.cms-language-section[open]')).toHaveCount(0)
  await expect(teamEditor.locator('input[name="order"]')).toHaveCount(0)
  await expect(teamEditor.locator('.cms-team-order-controls')).toHaveCount(0)

  await expect(teamEditor.locator('.cms-team-member-card')).toHaveCount(5)
  await expect(teamEditor.locator('.cms-team-member-card[data-cms-sortable="true"]')).toHaveCount(5)
  await expect(teamEditor.locator('.cms-team-drag-handle')).toHaveCount(0)
  await expect(teamEditor.locator('.cms-team-card-drag-cue')).toHaveCount(0)
  await expect(teamEditor.locator('.cms-team-order-pinned, .cms-team-card-link-cue')).toHaveCount(0)
  await expect(teamEditor.locator('.cms-team-member-card').first()).toBeVisible()
  const memberGridLayout = await teamEditor.locator('.cms-team-member-grid').evaluate((grid) => ({
    display: getComputedStyle(grid).display,
    flexWrap: getComputedStyle(grid).flexWrap,
  }))
  expect(memberGridLayout).toEqual({ display: 'flex', flexWrap: 'wrap' })
  const memberCardMetrics = await teamEditor.locator('.cms-team-member-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  }))
  expect(Math.max(...memberCardMetrics.map(({ width }) => width)) - Math.min(...memberCardMetrics.map(({ width }) => width))).toBeLessThan(2)
  expect(memberCardMetrics.every(({ width, height }) => height > width)).toBe(true)
  const initialMemberOrder = await teamEditor.locator('.cms-team-member-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  const firstMovableMember = teamEditor.locator('.cms-team-member-card[data-cms-sortable="true"]').first()
  const movableMemberId = await firstMovableMember.getAttribute('data-cms-sort-id')
  expect(movableMemberId).toBeTruthy()
  await expect(firstMovableMember.locator('[data-role="leader"]')).toHaveCount(1)
  const stableMemberCard = teamEditor.locator(`.cms-team-member-card[data-cms-sort-id="${movableMemberId}"]`)
  await stableMemberCard.scrollIntoViewIfNeeded()
  await stableMemberCard.focus()
  await stableMemberCard.press('Space')
  await expect(teamEditor.locator('.cms-team-member-card[data-dnd-dragging="true"]')).toHaveCount(1)
  await teamEditor.keyboard.press('ArrowDown')
  await expect.poll(() => teamEditor.locator('.cms-team-member-grid > .cms-team-member-card:not([data-dnd-placeholder])').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))).not.toEqual(initialMemberOrder)
  await expect(teamEditor.locator('.cms-sr-only[aria-live="polite"]')).toContainText(/อยู่ตำแหน่ง|is at position/)
  const activeDragPopup = teamEditor.waitForEvent('popup', { timeout: 700 }).then(() => true).catch(() => false)
  await teamEditor.keyboard.press('Enter')
  await expect(teamEditor.locator('.cms-team-member-card[data-dnd-dragging="true"]')).toHaveCount(0)
  expect(await activeDragPopup).toBe(false)
  const stagedMemberOrder = await teamEditor.locator('.cms-team-member-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  expect(stagedMemberOrder).not.toEqual(initialMemberOrder)
  expect(stagedMemberOrder[0]).not.toBe(initialMemberOrder[0])
  await expect(teamEditor.locator('.cms-team-member-card').first().locator('[data-role="leader"]')).toHaveCount(1)
  await expect(teamEditor.locator(`.cms-team-member-card[data-cms-sort-id="${movableMemberId}"] [data-role="member"]`)).toHaveCount(1)

  const memberObserver = await page.context().newPage()
  await memberObserver.goto('/cms/teams/fallback-management-1')
  await expect(memberObserver.locator('.cms-team-member-card')).toHaveCount(5)
  const memberOrderBeforeSave = await memberObserver.locator('.cms-team-member-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  expect(memberOrderBeforeSave).toEqual(initialMemberOrder)
  await memberObserver.close()

  const saveMemberOrder = teamEditor.getByRole('button', { name: /บันทึกลำดับ|Save order/ })
  await expect(saveMemberOrder).toBeEnabled()
  await saveMemberOrder.click()
  await expect(teamEditor.locator('.cms-message')).toContainText(/บันทึกลำดับและอัปเดตหัวหน้าทีมแล้ว|Member order and team leader saved/)
  await teamEditor.reload()
  await expect(teamEditor.locator('.cms-team-member-card')).toHaveCount(5)
  const persistedMemberOrder = await teamEditor.locator('.cms-team-member-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-cms-sort-id')))
  expect(persistedMemberOrder).toEqual(stagedMemberOrder)
  await expect(teamEditor.locator('.cms-team-member-card').first().locator('[data-role="leader"]')).toHaveCount(1)
  await expect(teamEditor.locator(`.cms-team-member-card[data-cms-sort-id="${movableMemberId}"] [data-role="member"]`)).toHaveCount(1)

  const leaderCard = teamEditor.locator('.cms-team-member-card').first()
  await expect(leaderCard).toBeVisible()
  await expect(leaderCard).toHaveAttribute('href', /\/cms\/teams\/fallback-management-1\/members\//)
  const memberPopupPromise = teamEditor.waitForEvent('popup')
  await leaderCard.focus()
  await leaderCard.press('Enter')
  const memberEditor = await memberPopupPromise
  await memberEditor.waitForLoadState('domcontentloaded')
  await expect(memberEditor.locator('input[type="file"]')).toHaveCount(1)
  await expect(memberEditor.locator('input[name="imageSrc"], input[type="url"]')).toHaveCount(0)
  await expect(memberEditor.locator('input[name="order"]')).toHaveCount(0)
  await expect(memberEditor.locator('.cms-language-section')).toHaveCount(3)

  for (const width of [390, 768, 1280, 320, 1024]) {
    await memberEditor.setViewportSize({ width, height: 840 })
    await expect.poll(() => memberEditor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  }
})
