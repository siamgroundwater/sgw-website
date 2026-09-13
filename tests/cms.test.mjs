import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { canCmsRole, isCmsRole } from '../src/lib/cms-permissions.ts'
import {
  cmsProjectCategoryLabel,
  cmsRoleLabel,
  cmsStatusLabel,
  localizeCmsFieldErrors,
  normalizeCmsLocale,
} from '../src/lib/cms-locale.ts'
import { hashCmsPassword, verifyCmsPassword } from '../src/lib/cms-password.ts'
import {
  createCmsSessionTokenValue,
  verifyCmsSessionTokenValue,
} from '../src/lib/cms-session-token.ts'
import {
  createCmsStagedMediaTokenValue,
  verifyCmsStagedMediaTokenValue,
} from '../src/lib/cms-staged-media-token.ts'
import {
  validateLearningInput,
  validateProjectForSave,
  validateProjectInput,
  validateServiceInput,
} from '../src/lib/cms-validation.ts'
import { normalizeSlug } from '../src/lib/slug.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('CMS roles expose least-privilege permissions', () => {
  assert.equal(isCmsRole('admin'), true)
  assert.equal(isCmsRole('owner'), false)
  assert.equal(canCmsRole('admin', 'users:manage'), true)
  assert.equal(canCmsRole('editor', 'projects:write'), true)
  assert.equal(canCmsRole('editor', 'projects:delete'), false)
  assert.equal(canCmsRole('viewer', 'learning:view'), true)
  assert.equal(canCmsRole('viewer', 'learning:write'), false)
})

test('CMS language defaults to Thai and keeps complete English labels', () => {
  assert.equal(normalizeCmsLocale(undefined), 'th')
  assert.equal(normalizeCmsLocale('invalid'), 'th')
  assert.equal(normalizeCmsLocale('en'), 'en')
  assert.equal(cmsStatusLabel('th', 'active'), 'เปิดใช้งาน')
  assert.equal(cmsStatusLabel('en', 'active'), 'Active')
  assert.equal(cmsRoleLabel('th', 'admin'), 'ผู้ดูแลระบบ')
  assert.equal(cmsProjectCategoryLabel('en', 'resort'), 'Hotels and resorts')
  assert.equal(
    localizeCmsFieldErrors('th', { title: 'Project title is required.' }).title,
    'กรุณากรอกชื่อผลงาน'
  )
  assert.equal(
    localizeCmsFieldErrors('th', { coverImage: 'Cover image is required before publishing.' }).coverImage,
    'กรุณาเพิ่มภาพปกก่อนเผยแพร่'
  )

  const layout = readFileSync(path.join(root, 'src', 'app', 'cms', 'layout.tsx'), 'utf8')
  const language = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsLanguage.tsx'), 'utf8')
  assert.match(layout, /getCmsLocale\(\)/)
  assert.match(layout, /CmsLanguageProvider initialLocale=\{locale\}/)
  assert.match(language, /CMS_LOCALE_COOKIE/)
  assert.match(language, />TH<\/button>[\s\S]*>EN<\/button>/)
})

test('CMS passwords use salted scrypt hashes', () => {
  const password = 'A-strong-CMS-password-2026'
  const first = hashCmsPassword(password)
  const second = hashCmsPassword(password)
  assert.match(first, /^scrypt\$[^$]+\$[^$]+$/)
  assert.notEqual(first, second)
  assert.equal(verifyCmsPassword(password, first), true)
  assert.equal(verifyCmsPassword('wrong password', first), false)
  assert.equal(verifyCmsPassword(password, 'invalid'), false)
})

test('CMS session tokens reject tampering and expiry', () => {
  const secret = 'test-secret-that-is-long-enough-for-cms-tests'
  const now = 1_800_000_000_000
  const session = {
    displayName: 'SGW Admin',
    role: 'admin',
    userId: '507f1f77bcf86cd799439011',
    username: 'admin',
  }
  const token = createCmsSessionTokenValue(session, secret, now, 3600)
  assert.deepEqual(verifyCmsSessionTokenValue(token, secret, now + 1000), {
    ...session,
    issuedAt: now,
    expiresAt: now + 3_600_000,
  })
  assert.equal(verifyCmsSessionTokenValue(`${token}x`, secret, now + 1000), null)
  assert.equal(verifyCmsSessionTokenValue(token, 'different-secret', now + 1000), null)
  assert.equal(verifyCmsSessionTokenValue(token, secret, now + 3_600_001), null)
})

test('staged project media tokens bind uploads to a user and submission', () => {
  const secret = 'test-secret-that-is-long-enough-for-cms-tests'
  const now = 1_800_000_000_000
  const input = {
    asset: {
      bytes: 120000,
      createdAt: '2026-08-17T00:00:00Z',
      format: 'webp',
      height: 900,
      publicId: 'siamgroundwater/cms/projects/example/image',
      src: 'https://res.cloudinary.com/example/image/upload/image.webp',
      width: 1200,
    },
    submissionId: 'submission_12345678',
    userId: '507f1f77bcf86cd799439011',
  }
  const token = createCmsStagedMediaTokenValue(input, secret, now, 1800)
  assert.deepEqual(verifyCmsStagedMediaTokenValue(token, secret, now + 1000), {
    ...input,
    expiresAt: now + 1_800_000,
    issuedAt: now,
  })
  assert.equal(verifyCmsStagedMediaTokenValue(`${token}x`, secret, now + 1000), null)
  assert.equal(verifyCmsStagedMediaTokenValue(token, secret, now + 1_800_001), null)
})

test('project validation accepts complete SGW data and rejects unsafe values', () => {
  const valid = validateProjectInput({
    category: ['factory'],
    coverImage: '/images/projects/example.webp',
    details: ['รายละเอียดงาน'],
    galleryImages: ['/images/projects/example.webp'],
    lat: 13.7,
    lng: 100.5,
    location: 'กรุงเทพมหานคร',
    slug: 'example-project',
    status: 'active',
    summary: 'ข้อมูลโครงการ',
    title: 'โครงการตัวอย่าง',
    translations: {
      en: { details: ['Scope'], location: 'Bangkok', summary: 'Project information', title: 'Example project' },
      ja: { details: ['  '], location: '', summary: '', title: '' },
      zh: { details: ['施工范围'], location: ' 曼谷 ', summary: '', title: '示例项目' },
    },
    workTypes: ['groundwater-survey'],
    year: 2026,
  })
  assert.equal(valid.errors, null)
  assert.deepEqual(valid.data.category, ['factory'])
  assert.equal(validateProjectForSave(valid.data), null)
  const multiCategory = validateProjectInput({ ...valid.data, category: ['factory', 'government'] })
  assert.deepEqual(multiCategory.data?.category, ['factory', 'government'])
  assert.deepEqual(valid.data.workTypes, ['groundwater-survey'])
  assert.deepEqual(valid.data.translations.zh, {
    details: ['施工范围'],
    location: '曼谷',
    summary: '',
    title: '示例项目',
  })
  assert.equal(valid.data.translations.ja, undefined)
  const withJapanese = validateProjectInput({
    ...valid.data,
    translations: {
      ...valid.data.translations,
      ja: { details: [' 作業範囲 '], location: ' バンコク ', summary: ' ', title: ' サンプルプロジェクト ' },
    },
  })
  assert.deepEqual(withJapanese.data?.translations.ja, {
    details: ['作業範囲'],
    location: 'バンコク',
    summary: '',
    title: 'サンプルプロジェクト',
  })
  assert.ok(validateProjectInput({ ...valid.data, category: 'factory' }).errors?.category)
  assert.ok(validateProjectInput({ ...valid.data, category: [] }).errors?.category)
  assert.ok(validateProjectInput({ ...valid.data, workTypes: ['งานสำรวจน้ำบาดาล'] }).errors?.workTypes)
  assert.equal(validateProjectForSave({
    ...valid.data,
    translations: { en: { details: [], location: '', summary: '', title: '' } },
  }), null)
  assert.ok(validateProjectForSave({ ...valid.data, summary: '' })?.summary)
  assert.ok(validateProjectForSave({ ...valid.data, coverImage: '' })?.coverImage)

  const incompleteCoordinates = validateProjectInput({ ...valid.data, lng: null })
  assert.ok(incompleteCoordinates.errors?.lat)
  assert.ok(incompleteCoordinates.errors?.lng)

  const invalid = validateProjectInput({
    ...valid.data,
    coverImage: 'javascript:alert(1)',
    lat: 200,
    slug: 'bad/project',
    title: '',
  })
  assert.ok(invalid.errors?.title)
  assert.ok(invalid.errors?.slug)
  assert.ok(invalid.errors?.lat)
  assert.ok(invalid.errors?.coverImage)
})

test('Thai project slugs are readable and normalized before validation', () => {
  const encoded = '%e0%b9%82%e0%b8%a3%e0%b8%87%e0%b9%81%e0%b8%a3%e0%b8%a1-trisara-phuket'
  assert.equal(normalizeSlug(encoded), 'โรงแรม-trisara-phuket')
  assert.equal(normalizeSlug('โรงแรม-Trisara-Phuket'), 'โรงแรม-trisara-phuket')

  const result = validateProjectInput({
    category: ['resort'], coverImage: '', details: [], galleryImages: [],
    lat: null, lng: null, location: 'ภูเก็ต', slug: encoded,
    status: 'active', summary: '', title: 'โรงแรม Trisara Phuket', workTypes: [], year: 2024,
  })
  assert.equal(result.errors, null)
  assert.equal(result.data?.slug, 'โรงแรม-trisara-phuket')
})

test('service and learning validation enforce structured content', () => {
  const service = validateServiceInput({
    blocks: [{ bullets: ['รายการ'], text: 'รายละเอียด', title: 'ขอบเขตงาน' }],
    description: 'รายละเอียดบริการ',
    heroImage: '/images/services/survey/legacy-01.jpg',
    key: 'survey',
    slug: 'survey',
    status: 'active',
    title: 'สำรวจศึกษาน้ำบาดาล',
  })
  assert.equal(service.errors, null)
  assert.ok(validateServiceInput({ ...service.data, blocks: [] }).errors?.blocks)

  const learning = validateLearningInput({
    audience: 'เจ้าของโครงการและวิศวกร',
    description: 'บทเรียนสำหรับการวางแผนระบบน้ำบาดาล',
    eyebrow: 'ศูนย์การเรียนรู้',
    sections: [{ bullets: [], heading: 'บทนำ', paragraphs: ['เนื้อหาบทเรียน'] }],
    slug: 'groundwater-introduction',
    sources: [{ href: 'https://www.dgr.go.th/', label: 'กรมทรัพยากรน้ำบาดาล' }],
    status: 'active',
    title: 'ความรู้เบื้องต้นเรื่องน้ำบาดาล',
  })
  assert.equal(learning.errors, null)
  assert.ok(
    validateLearningInput({
      ...learning.data,
      sources: [{ href: 'javascript:alert(1)', label: 'Unsafe' }],
    }).errors?.sources
  )
})

test('CMS routes exist and mutation APIs require same-origin checks', () => {
  const pages = ['login', 'dashboard', 'projects', 'users', 'users/add', 'users/edit', 'audit-logs']
  for (const page of pages) {
    assert.equal(existsSync(path.join(root, 'src', 'app', 'cms', page, 'page.tsx')), true, page)
  }
  assert.equal(existsSync(path.join(root, 'src', 'app', 'cms', 'services', 'page.tsx')), false)
  assert.equal(existsSync(path.join(root, 'src', 'app', 'cms', 'learning', 'page.tsx')), false)

  const mutationRoutes = [
    'auth/login',
    'auth/logout',
    'projects',
    'projects/media',
    'account/password',
    'users',
  ]
  for (const route of mutationRoutes) {
    const source = readFileSync(path.join(root, 'src', 'app', 'api', 'cms', ...route.split('/'), 'route.ts'), 'utf8')
    assert.match(source, /requireSameOrigin\(request\)/, route)
  }
})

test('CMS stylesheet follows SGW sizing rules', () => {
  const css = readFileSync(path.join(root, 'src', 'app', 'cms', 'cms.css'), 'utf8')
  assert.doesNotMatch(css, /\bclamp\(/i)
  assert.doesNotMatch(css, /max-width\s*:/i)
  assert.doesNotMatch(css, /font-size:\s*[\d.]+(?:px|rem)/i)
  assert.match(css, /font-size:\s*var\(--fs-sm\)/i)
  assert.match(css, /html\s*\{[\s\S]*?overflow-x:\s*hidden[\s\S]*?overscroll-behavior-x:\s*none/i)
  assert.match(css, /\.cms-body\s*\{[\s\S]*?overflow-x:\s*hidden[\s\S]*?overscroll-behavior-x:\s*none/i)
  assert.match(css, /\.cms-shell\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/i)
  assert.match(css, /\.cms-shell\s*\{[\s\S]*?--cms-navbar-height:\s*68px[\s\S]*?padding-top:\s*var\(--cms-navbar-height\)/i)
  assert.match(css, /\.cms-navbar\s*\{[\s\S]*?position:\s*fixed[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*44px minmax\(0,\s*1fr\) 44px/i)
  assert.match(css, /\.cms-navigation-drawer\s*\{[\s\S]*?position:\s*absolute[\s\S]*?height:\s*100dvh[\s\S]*?overflow-y:\s*auto/i)
  assert.doesNotMatch(css, /\.cms-sidebar-desktop|\.cms-mobile-bar|\.cms-mobile-drawer/i)
  assert.match(css, /\.cms-select-pill\s*\{[\s\S]*?overflow-wrap:\s*anywhere/i)
  assert.match(css, /\.cms-editor\s*\{[\s\S]*?touch-action:\s*pan-y pinch-zoom/i)
})

test('CMS navigation uses one stable left-side drawer at every screen size', () => {
  const shell = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsShell.tsx'), 'utf8')
  const css = readFileSync(path.join(root, 'src', 'app', 'cms', 'cms.css'), 'utf8')
  const compactLayoutIndex = css.indexOf('@media (width <= 700px)')
  assert.doesNotMatch(shell, /createPortal|visualViewport|matchMedia/)
  assert.doesNotMatch(shell, /cms-mobile|cms-sidebar-desktop|cms-navbar-context|cms-navbar-brand|cms-sidebar-signout/)
  assert.match(shell, /cms-navbar-menu-button[\s\S]*?aria-controls="cms-navigation-drawer"[\s\S]*?aria-expanded=\{navigationOpen\}/)
  assert.match(shell, /cms-navbar-logo[\s\S]*?logo_SGW_white\.svg/)
  assert.match(shell, /cms-navbar-signout[\s\S]*?aria-label=\{copy\.signOut\}[\s\S]*?onClick=\{signOut\}/)
  assert.match(shell, /cms-drawer-scrim[\s\S]*?onClick=\{closeNavigation\}/)
  assert.match(shell, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(shell, /document\.addEventListener\('keydown', handleKeyDown\)/)
  assert.match(shell, /menuButton\?\.focus\(\)/)
  assert.match(shell, /<aside[\s\S]*?id="cms-navigation-drawer"[\s\S]*?role="dialog"/)
  assert.match(shell, /target=\{external \? '_blank' : undefined\}/)
  assert.ok(compactLayoutIndex > 0)
  assert.ok(css.indexOf('.cms-navbar {') < compactLayoutIndex)
  assert.ok(css.indexOf('.cms-sidebar-layer {') < compactLayoutIndex)
  assert.ok(css.indexOf('.cms-navigation-drawer {') < compactLayoutIndex)
  assert.match(css, /\.cms-sidebar-layer\[data-open='true'\][\s\S]*?pointer-events:\s*auto[\s\S]*?visibility:\s*visible/i)
  assert.match(css, /\.cms-navigation-drawer\s*\{[\s\S]*?left:\s*0[\s\S]*?transform:\s*translate3d\(-100%,\s*0,\s*0\)/i)
  assert.match(css, /\.cms-sidebar-layer\[data-open='true'\] \.cms-navigation-drawer\s*\{[\s\S]*?transform:\s*translate3d\(0,\s*0,\s*0\)/i)
  assert.match(css, /@media \(width <= 700px\)[\s\S]*?\.cms-form-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)[\s\S]*?justify-content:\s*stretch/i)
})

test('orphan media cleanup is scheduled and secured by Vercel', () => {
  const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'))
  const route = readFileSync(
    path.join(root, 'src', 'app', 'api', 'cron', 'cleanup-project-media', 'route.ts'),
    'utf8'
  )

  assert.deepEqual(config.crons, [
    {
      path: '/api/cron/cleanup-project-media',
      schedule: '23 2 * * *',
    },
  ])
  assert.match(route, /process\.env\.CRON_SECRET/)
  assert.match(route, /Authorization|authorization/)
  assert.equal(
    existsSync(path.join(root, '.github', 'workflows', 'cleanup-project-media.yml')),
    false
  )
})

test('project architecture keeps one live-save workflow and dedicated pages', () => {
  const source = name => readFileSync(path.join(root, name), 'utf8')
  const manager = source('src/components/cms/CmsProjectsManager.tsx')
  const editor = source('src/components/cms/CmsProjectEditor.tsx')
  const route = source('src/app/api/cms/projects/route.ts')
  const preview = source('src/app/cms/projects/[id]/preview/page.tsx')
  const css = source('src/app/cms/cms.css')
  assert.match(manager, /className="cms-project-grid"/)
  assert.match(manager, /className="cms-project-card"/)
  assert.doesNotMatch(manager, /cms-project-card-summary|window\.confirm/)
  assert.match(manager, /<dialog/)
  assert.match(manager, /confirmation !== selected\.title/)
  assert.match(manager, /operationId: mutationId\.current/)
  assert.match(manager, /target="_blank"/)
  assert.match(manager, /AbortController/)
  assert.match(manager, /sgw-cms-projects-changed/)
  assert.match(editor, /CmsDeferredProjectImages/)
  assert.doesNotMatch(editor, /Save draft|Preview draft|intent: 'publish'|action: 'unpublish'/)
  assert.match(editor, /type="submit" disabled=/)
  assert.match(editor, /beforeunload/)
  assert.match(editor, /expectedUpdatedAt/)
  assert.match(editor, /operationId/)
  assert.match(preview, /ProjectDetailView/)
  assert.match(route, /runProjectOperation/)
  assert.match(route, /validateProjectForSave/)
  assert.doesNotMatch(route, /publishCmsProject|restoreCmsProjectRevision/)
  assert.match(css, /\.cms-project-grid\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
  assert.doesNotMatch(css, /\.cms-project-card-heading h3\s*{[^}]*(?:min-height|max-height)/)
  for (const name of ['services', 'learning', 'media', 'import']) {
    assert.equal(existsSync(path.join(root, 'src/app/api/cms', name, 'route.ts')), false)
  }
  // Browser tests verify rendering, mobile interactions, actual database mutation,
  // optional translations, server search, soft deletion, and operation replay.
  assert.ok(existsSync(path.join(root, 'tests/e2e/cms.spec.ts')))
})
