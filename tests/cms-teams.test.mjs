import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  TeamValidationError,
  localizedTeamMember,
  localizedTeamName,
  normalizeCmsTeamInput,
  normalizeCmsTeamMemberInput,
} from '../src/lib/team-directory.ts'
import { canCmsRole } from '../src/lib/cms-permissions.ts'
import { reorderCmsIds, reorderCmsIdsByIndex, reorderCmsMembersByIndex } from '../src/lib/cms-team-order.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (...parts) => readFileSync(path.join(root, ...parts), 'utf8')

test('team permissions preserve least privilege', () => {
  assert.equal(canCmsRole('admin', 'teams:view'), true)
  assert.equal(canCmsRole('admin', 'teams:write'), true)
  assert.equal(canCmsRole('admin', 'teams:delete'), true)
  assert.equal(canCmsRole('editor', 'teams:view'), true)
  assert.equal(canCmsRole('editor', 'teams:write'), true)
  assert.equal(canCmsRole('editor', 'teams:delete'), false)
  assert.equal(canCmsRole('viewer', 'teams:view'), true)
  assert.equal(canCmsRole('viewer', 'teams:write'), false)
})

test('drag ordering is immutable and preserves every id exactly once', () => {
  const ids = ['team-a', 'team-b', 'team-c', 'team-d']
  const movedDown = reorderCmsIds(ids, 'team-a', 'team-c')
  assert.deepEqual(movedDown, ['team-b', 'team-c', 'team-a', 'team-d'])
  assert.deepEqual(ids, ['team-a', 'team-b', 'team-c', 'team-d'])
  assert.deepEqual(reorderCmsIds(ids, 'team-d', 'team-b'), ['team-a', 'team-d', 'team-b', 'team-c'])
  assert.equal(reorderCmsIds(ids, 'missing', 'team-a'), ids)
  assert.equal(reorderCmsIds(ids, 'team-a', 'team-a'), ids)
  assert.deepEqual(new Set(movedDown), new Set(ids))
})

test('sortable drag indexes only commit the item that began at the reported index', () => {
  const ids = ['team-a', 'team-b', 'team-c', 'team-d']
  const movedDown = reorderCmsIdsByIndex(ids, 'team-a', 0, 2)
  assert.deepEqual(movedDown, ['team-b', 'team-c', 'team-a', 'team-d'])
  assert.deepEqual(ids, ['team-a', 'team-b', 'team-c', 'team-d'])
  assert.deepEqual(reorderCmsIdsByIndex(ids, 'team-d', 3, 1), ['team-a', 'team-d', 'team-b', 'team-c'])
  assert.equal(reorderCmsIdsByIndex(ids, 'team-b', 0, 2), ids)
  assert.equal(reorderCmsIdsByIndex(ids, 'team-a', 0, 0), ids)
  assert.equal(reorderCmsIdsByIndex(ids, 'team-a', -1, 2), ids)
  assert.equal(reorderCmsIdsByIndex(ids, 'team-a', 0, ids.length), ids)
})

test('member ordering promotes the first card and demotes the previous leader', () => {
  const members = [
    { id: 'leader', order: 0, role: 'leader' },
    { id: 'member-a', order: 1, role: 'member' },
    { id: 'member-b', order: 2, role: 'member' },
  ]
  const reordered = reorderCmsMembersByIndex(members, 'leader', 0, 1)
  assert.deepEqual(reordered.map(({ id }) => id), ['member-a', 'leader', 'member-b'])
  assert.deepEqual(reordered.map(({ order }) => order), [0, 1, 2])
  assert.deepEqual(reordered.map(({ role }) => role), ['leader', 'member', 'member'])
  assert.deepEqual(members.map(({ role }) => role), ['leader', 'member', 'member'])
})

test('team input keeps Thai required and optional translations compact', () => {
  const item = normalizeCmsTeamInput({
    department: 'survey',
    name: ' ทีมสำรวจ ',
    order: '4',
    translations: {
      en: { name: ' Survey team ' },
      ja: { name: ' ' },
    },
  })
  assert.deepEqual(item, {
    department: 'survey',
    name: 'ทีมสำรวจ',
    order: 4,
    translations: { en: { name: 'Survey team' } },
  })
  assert.throws(
    () => normalizeCmsTeamInput({ department: 'unknown', name: '', order: -1 }),
    (error) => error instanceof TeamValidationError && Boolean(error.fields.department && error.fields.name && error.fields.order)
  )
})

test('team-member input validates arrays, identifiers, role and default image', () => {
  const item = normalizeCmsTeamMemberInput({
    certificates: [' ใบอนุญาต ', ''],
    imageSrc: '/images/personnel/user.png',
    name: ' หัวหน้าทีม ',
    order: 0,
    role: 'leader',
    teamId: 'fallback-survey-1',
    title: ' นักธรณีวิทยา ',
    translations: { en: { certificates: ['Licence'], name: 'Team lead', title: 'Hydrogeologist' } },
  })
  assert.equal(item.name, 'หัวหน้าทีม')
  assert.deepEqual(item.certificates, ['ใบอนุญาต'])
  assert.equal(item.translations.en.name, 'Team lead')
  assert.throws(
    () => normalizeCmsTeamMemberInput({ certificates: 'bad', imageSrc: '', name: '', order: 2.5, role: 'other', teamId: '', title: '' }),
    (error) => error instanceof TeamValidationError && Object.keys(error.fields).length >= 6
  )
})

test('public team copy falls back selected language to English to Thai per field', () => {
  const team = { name: 'ทีมไทย', translations: { en: { name: 'English team' }, zh: { name: '中文团队' } } }
  assert.equal(localizedTeamName(team, 'th'), 'ทีมไทย')
  assert.equal(localizedTeamName(team, 'zh'), '中文团队')
  assert.equal(localizedTeamName(team, 'ja'), 'English team')

  const member = {
    certificates: ['ใบรับรองไทย'],
    name: 'ชื่อไทย',
    title: 'ตำแหน่งไทย',
    translations: {
      en: { certificates: ['English certificate'], name: 'English name', title: 'English title' },
      ja: { certificates: [], name: '日本語名', title: '' },
    },
  }
  assert.deepEqual(localizedTeamMember(member, 'ja'), {
    certificates: ['English certificate'],
    name: '日本語名',
    title: 'English title',
  })
  assert.deepEqual(localizedTeamMember(member, 'zh'), {
    certificates: ['English certificate'],
    name: 'English name',
    title: 'English title',
  })
})

test('team CMS uses dedicated guarded pages and deferred portrait storage', () => {
  const requiredPages = [
    ['src', 'app', 'cms', 'teams', 'page.tsx'],
    ['src', 'app', 'cms', 'teams', 'new', 'page.tsx'],
    ['src', 'app', 'cms', 'teams', '[id]', 'page.tsx'],
    ['src', 'app', 'cms', 'teams', '[id]', 'members', 'new', 'page.tsx'],
    ['src', 'app', 'cms', 'teams', '[id]', 'members', '[memberId]', 'page.tsx'],
  ]
  for (const parts of requiredPages) assert.equal(existsSync(path.join(root, ...parts)), true, parts.join('/'))
  const permissions = source('src', 'lib', 'cms-permissions.ts')
  const navigation = source('src', 'components', 'cms', 'CmsShell.tsx')
  const editor = source('src', 'components', 'cms', 'CmsTeamMemberEditor.tsx')
  const teamEditor = source('src', 'components', 'cms', 'CmsTeamEditor.tsx')
  const manager = source('src', 'components', 'cms', 'CmsTeamsManager.tsx')
  const sortableLink = source('src', 'components', 'cms', 'CmsDndSortableLink.tsx')
  const teamStyles = source('src', 'components', 'cms', 'CmsTeams.css')
  const packageJson = source('package.json')
  const upload = source('src', 'app', 'api', 'cms', 'team-members', 'media', 'route.ts')
  const save = source('src', 'app', 'api', 'cms', 'team-members', 'route.ts')
  assert.match(permissions, /'teams:delete'/)
  assert.match(navigation, /href: '\/cms\/teams'/)
  assert.match(upload, /mediaTarget = 'team-member'/)
  assert.match(upload, /uploadCmsImage\(file, 'teams'\)/)
  assert.match(upload, /Math\.min\(asset\.width, asset\.height\) < 480/)
  assert.match(upload, /aspectRatio < 0\.6 \|\| aspectRatio > 1\.25/)
  assert.match(upload, /await registerStagedProjectMedia\(asset[\s\S]*validatePortraitAsset\(asset\)[\s\S]*rollbackStagedProjectMedia/)
  assert.match(upload, /deleteCmsImages\(\[asset\.publicId\]\)/)
  assert.match(editor, /prepareTeamPortrait\(file/)
  assert.doesNotMatch(editor, /type="url"|name="imageSrc"/)
  assert.match(editor, /sgw-cms-team-member-save:\$\{userId\}/)
  assert.match(editor, /if \(!save\.staged\.length\) return false/)
  assert.match(editor, /api\/cms\/team-members\?id=/)
  assert.match(editor, /if \(result\.item\)[\s\S]*clearPending\(\)/)
  assert.match(save, /verifyStagedProjectMediaTokens[\s\S]*mediaTarget/)
  assert.match(save, /commitStagedProjectMedia/)
  assert.match(save, /rollbackStagedProjectMedia/)
  assert.match(save, /teamId[\s\S]*getCmsTeamMemberById\(teamId, memberId\)[\s\S]*getCmsTeamMemberByIdAny\(memberId\)/)
  assert.doesNotMatch(manager, /ArrowUp|ArrowDown|cms-team-order-controls/)
  assert.doesNotMatch(teamEditor, /ArrowUp|ArrowDown|cms-team-order-controls/)
  assert.doesNotMatch(teamEditor, /ลำดับภายในฝ่าย|Order within department/)
  assert.doesNotMatch(editor, /ลำดับในทีม|Order within team/)
  assert.match(manager, /บันทึกลำดับ[\s\S]*Save order/)
  assert.match(manager, /saveOrderButton\('header'\)/)
  assert.match(manager, /saveOrderButton\('footer'\)/)
  assert.match(teamEditor, /บันทึกลำดับ[\s\S]*Save order/)
  assert.match(manager, /DragDropProvider[\s\S]*CmsDndSortableLink/)
  assert.match(teamEditor, /DragDropProvider[\s\S]*CmsDndSortableLink/)
  assert.match(manager, /href=\{`\/cms\/teams\/\$\{team\.id\}`\}/)
  assert.match(teamEditor, /href=\{`\/cms\/teams\/\$\{editingId\}\/members\/\$\{member\.id\}`\}/)
  assert.match(teamEditor, /reorderCmsMembersByIndex/)
  assert.doesNotMatch(manager, /cms-team-card-link-cue/)
  assert.doesNotMatch(teamEditor, /cms-team-order-pinned|cms-team-card-link-cue/)
  assert.doesNotMatch(teamStyles, /cms-team-order-pinned|cms-team-card-link-cue/)
  assert.match(packageJson, /"@dnd-kit\/react": "\^0\.5\.0"/)
  assert.match(packageJson, /"@dnd-kit\/dom": "\^0\.5\.0"/)
  assert.match(sortableLink, /useSortable\(\{[\s\S]*sensors: sortableLinkSensors/)
  assert.match(sortableLink, /accept: group[\s\S]*type: group/)
  assert.match(sortableLink, /PointerSensor\.configure/)
  assert.match(sortableLink, /PointerActivationConstraints\.Distance/)
  assert.match(sortableLink, /PointerActivationConstraints\.Delay/)
  assert.match(sortableLink, /event\.pointerType === 'touch'/)
  assert.match(sortableLink, /start: \['Space'\]/)
  assert.match(sortableLink, /cancel: \['Escape'\]/)
  assert.match(sortableLink, /end: \['Space', 'Enter', 'Tab'\]/)
  assert.match(sortableLink, /data-cms-sort-id=\{id\}/)
  assert.match(sortableLink, /data-cms-sortable="true"/)
  assert.match(sortableLink, /draggable=\{false\}/)
  assert.match(sortableLink, /defaults\.filter\(\(plugin\) => plugin !== Accessibility\)/)
  assert.match(manager, /onDragOver=\{announceTeamDragOver\}/)
  assert.match(teamEditor, /onDragOver=\{announceMemberDragOver\}/)
  assert.match(teamStyles, /touch-action: pan-y pinch-zoom/)
  assert.match(teamStyles, /\.cms-team-member-grid \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/)
  assert.match(teamStyles, /\.cms-team-member-card \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);[\s\S]*?flex: 0 1 300px;[\s\S]*?min-height: 360px;/)
  assert.doesNotMatch(teamStyles, /cms-team-member-actions/)
  assert.doesNotMatch(manager, /cms-team-drag-handle/)
  assert.doesNotMatch(teamEditor, /cms-team-drag-handle/)
  assert.doesNotMatch(manager, /cms-team-card-drag-cue/)
  assert.doesNotMatch(teamEditor, /cms-team-card-drag-cue/)
  assert.doesNotMatch(teamStyles, /cms-team-card-drag-cue/)
  for (const department of ['management', 'survey', 'drilling', 'maintenance', 'marketing']) {
    assert.match(teamStyles, new RegExp(`data-cms-sort-group='${department}'`))
  }
  assert.equal(existsSync(path.join(root, 'src', 'components', 'cms', 'useCmsDragReorder.ts')), false)
})

test('team directory mutations are transactional, replayable and revalidated', () => {
  const server = source('src', 'server', 'cms', 'teams.ts')
  const teamApi = source('src', 'app', 'api', 'cms', 'teams', 'route.ts')
  const memberApi = source('src', 'app', 'api', 'cms', 'team-members', 'route.ts')
  const revalidate = source('src', 'server', 'cms', 'revalidate.ts')
  assert.match(server, /withTransaction/)
  assert.match(server, /teamOperationFingerprint/)
  assert.match(server, /getSavedTeamOperation/)
  assert.match(server, /revision !== expectedRevision/)
  assert.match(server, /Object\.entries\(orders as Record<string, unknown>\)/)
  assert.match(server, /for \(const \[departmentValue, ids\] of entries\)/)
  assert.match(server, /const role = position === 0 \? 'leader' : 'member'[\s\S]*member\.role = role/)
  assert.match(teamApi, /const orders = raw\.orders/)
  assert.match(teamApi, /reorderCmsTeams\(\s*orders,/)
  assert.match(server, /team\.members\.length[\s\S]*before deleting this team/)
  assert.match(teamApi, /requireCmsApiPermission\('teams:delete'\)/)
  assert.match(memberApi, /requireCmsApiPermission\('teams:delete'\)/)
  assert.match(revalidate, /revalidatePublicTeams/)
  assert.match(revalidate, /localePath\('\/about', locale\)/)
})

test('public About receives server-normalized personnel and resilient portraits', () => {
  const teams = source('src', 'app', '(site)', 'about', 'teams', 'teams.tsx')
  const thaiPage = source('src', 'app', '(site)', 'about', 'page.tsx')
  const localizedPage = source('src', 'app', '[locale]', '[[...slug]]', 'page.tsx')
  assert.doesNotMatch(teams, /teams\.json/)
  assert.match(teams, /PublicPersonnelGroup/)
  assert.match(teams, /FallbackImage/)
  assert.match(teams, /tabIndex=\{isActive \? 0 : -1\}/)
  assert.match(thaiPage, /getPublicTeamDirectory\('th'\)/)
  assert.match(localizedPage, /getPublicTeamDirectory\(locale\)/)
})
