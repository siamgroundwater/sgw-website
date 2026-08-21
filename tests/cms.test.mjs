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
  validateProjectForPublishing,
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
    translations: { en: { details: ['Scope'], location: 'Bangkok', summary: 'Project information', title: 'Example project' } },
    workTypes: ['groundwater-survey'],
    year: 2026,
  })
  assert.equal(valid.errors, null)
  assert.deepEqual(valid.data.category, ['factory'])
  assert.equal(validateProjectForPublishing(valid.data), null)
  const multiCategory = validateProjectInput({ ...valid.data, category: ['factory', 'government'] })
  assert.deepEqual(multiCategory.data?.category, ['factory', 'government'])
  assert.deepEqual(valid.data.workTypes, ['groundwater-survey'])
  assert.ok(validateProjectInput({ ...valid.data, category: 'factory' }).errors?.category)
  assert.ok(validateProjectInput({ ...valid.data, category: [] }).errors?.category)
  assert.ok(validateProjectInput({ ...valid.data, workTypes: ['งานสำรวจน้ำบาดาล'] }).errors?.workTypes)
  assert.equal(validateProjectForPublishing({
    ...valid.data,
    translations: { en: { details: [], location: '', summary: '', title: '' } },
  }), null)
  assert.ok(validateProjectForPublishing({ ...valid.data, summary: '' })?.summary)
  assert.ok(validateProjectForPublishing({ ...valid.data, coverImage: '' })?.coverImage)

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
  const pages = ['login', 'dashboard', 'projects', 'users', 'audit-logs']
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
    'services',
    'learning',
    'media',
    'users',
    'import',
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
  assert.match(css, /\.cms-sidebar-layer\s*\{[\s\S]*?overflow:\s*hidden[\s\S]*?visibility:\s*hidden/i)
  assert.match(css, /\.cms-sidebar\s*\{[\s\S]*?inline-size:\s*min\(320px,\s*100vw\)[\s\S]*?transform:\s*translate3d\(100%,\s*0,\s*0\)/i)
  assert.match(css, /\.cms-sidebar-layer\[data-open='true'\] \.cms-sidebar\s*\{\s*transform:\s*translate3d\(0,\s*0,\s*0\)/i)
  assert.match(css, /\.cms-select-pill\s*\{[\s\S]*?overflow-wrap:\s*anywhere/i)
  assert.match(css, /\.cms-editor\s*\{[\s\S]*?touch-action:\s*pan-y pinch-zoom/i)
})

test('CMS mobile drawer cannot leave the document horizontally shifted', () => {
  const shell = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsShell.tsx'), 'utf8')
  const css = readFileSync(path.join(root, 'src', 'app', 'cms', 'cms.css'), 'utf8')
  assert.doesNotMatch(shell, /document\.body\.style\.overflow/)
  assert.match(shell, /document\.scrollingElement\.scrollLeft\s*=\s*0/)
  assert.match(shell, /window\.visualViewport/)
  assert.match(shell, /--cms-visual-viewport-right/)
  assert.match(shell, /\[open, pathname\]/)
  assert.match(css, /\.cms-mobile-toggle\s*\{[\s\S]*?position:\s*fixed[\s\S]*?top:\s*max\(18px,\s*env\(safe-area-inset-top\)\)[\s\S]*?right:\s*calc\(var\(--cms-visual-viewport-right,\s*0px\)/i)
  assert.match(css, /\.cms-sidebar-layer\[data-open='true'\]\s*\{[\s\S]*?pointer-events:\s*none/i)
  assert.match(css, /\.cms-sidebar\s*\{[\s\S]*?pointer-events:\s*auto/i)
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

test('CMS project library uses scannable responsive cards', () => {
  const manager = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsProjectsManager.tsx'), 'utf8')
  const editor = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsProjectEditor.tsx'), 'utf8')
  const newPage = readFileSync(path.join(root, 'src', 'app', 'cms', 'projects', 'new', 'page.tsx'), 'utf8')
  const editPage = readFileSync(path.join(root, 'src', 'app', 'cms', 'projects', '[id]', 'page.tsx'), 'utf8')
  const css = readFileSync(path.join(root, 'src', 'app', 'cms', 'cms.css'), 'utf8')
  const deferredImages = readFileSync(path.join(root, 'src', 'components', 'cms', 'CmsDeferredProjectImages.tsx'), 'utf8')
  const projectMediaRoute = readFileSync(path.join(root, 'src', 'app', 'api', 'cms', 'projects', 'media', 'route.ts'), 'utf8')
  const projectRoute = readFileSync(path.join(root, 'src', 'app', 'api', 'cms', 'projects', 'route.ts'), 'utf8')
  const stagedMedia = readFileSync(path.join(root, 'src', 'server', 'cms', 'staged-project-media.ts'), 'utf8')
  const revalidation = readFileSync(path.join(root, 'src', 'server', 'cms', 'revalidate.ts'), 'utf8')
  const projectInputType = readFileSync(path.join(root, 'src', 'types', 'cms.ts'), 'utf8')
  const projectDatabaseType = readFileSync(path.join(root, 'src', 'server', 'db', 'types.ts'), 'utf8')
  const projectContent = readFileSync(path.join(root, 'src', 'server', 'cms', 'content.ts'), 'utf8')
  const publicProjects = readFileSync(path.join(root, 'src', 'server', 'public-projects.ts'), 'utf8')

  assert.match(manager, /className="cms-project-grid"/)
  assert.match(manager, /className="cms-project-card"/)
  assert.match(manager, /className="cms-project-card-meta"/)
  assert.match(manager, /item\.workTypes\.map\(\(value\) => cmsProjectWorkTypeLabel\(locale, value\)\)\.join\(' · '\)/)
  assert.doesNotMatch(manager, /cms-project-card-summary/)
  assert.doesNotMatch(manager, /window\.confirm/)
  assert.match(manager, /role="dialog" aria-modal="true"/)
  assert.match(manager, /removalConfirmation !== pendingRemoval\.title/)
  assert.match(manager, /Type the exact project title to confirm/)
  assert.match(manager, /Filter projects by category/)
  assert.match(manager, /href="\/cms\/projects\/new" target="_blank" rel="noopener noreferrer"/)
  assert.match(manager, /href={`\/cms\/projects\/\$\{item\.id\}`} target="_blank" rel="noopener noreferrer"/)
  assert.doesNotMatch(manager, /<form/)
  assert.match(editor, /<form className="cms-form"/)
  assert.match(editor, /CmsDeferredProjectImages/)
  assert.match(editor, /validateProjectInput\(form\)/)
  assert.match(editor, /formNoValidate/)
  assert.match(editor, /allowManualEntry=\{Boolean\(editingId\)\}/)
  assert.match(editor, /pending-cover-upload/)
  assert.match(editor, /\/api\/cms\/projects\/media/)
  assert.match(editor, /cleanUpStaged/)
  assert.match(editor, /Save draft/)
  assert.match(editor, /Preview draft/)
  assert.match(editor, /translations\.en\.title/)
  assert.match(editor, /<details className="cms-language-section cms-field-full">/)
  assert.match(editor, /Optional\. Expand or collapse this section\./)
  assert.match(editor, /onChange=\{\(values\) => set\('details', values\)\}/)
  assert.match(editor, /onChange=\{\(values\) => setEnglish\('details', values\)\}/)
  assert.match(editor, /details: \[''\]/)
  assert.match(editor, /withDefaultDetailSections/)
  assert.match(editor, /function PillMultiSelect/)
  assert.match(editor, /aria-pressed=\{selected\}/)
  assert.match(editor, /exclusiveValue="other"/)
  assert.match(editor, /options=\{workTypeValues\}/)
  assert.doesNotMatch(editor, /<select value=\{form\.category\}/)
  assert.match(editor, /label=\{text\('หมวดหมู่', 'Category'\)\}[\s\S]*label=\{text\('ประเภทงาน', 'Work types'\)\}[\s\S]*text\('ปี', 'Year'\)/)
  assert.doesNotMatch(editor, /Work types \(English\)|translations\.en\.workTypes/)
  assert.match(editor, /Add detailed section/)
  assert.match(editor, /Remove section/)
  assert.match(editor, /เพิ่มรายละเอียด/)
  assert.match(editor, /รายละเอียด \(ไทย\)/)
  assert.match(editor, /removeLabel=\{text\('ลบ', 'Remove section'\)\}/)
  assert.doesNotMatch(editor, /ประเภทผลงาน|Project type|คีย์ประเภทผลงาน|ป้ายกำกับภายใน|Internal tag such as|businessTypes/)
  assert.doesNotMatch(editor, /<input required value=\{form\.translations\.en/)
  assert.doesNotMatch(editor, /<textarea required value=\{form\.translations\.en/)
  assert.doesNotMatch(editor, /Separate sections with a line containing|blocks\(/)
  for (const source of [editor, projectInputType, projectDatabaseType, projectContent, publicProjects]) {
    assert.doesNotMatch(source, /legacyPostId|legacyUrl/)
  }
  for (const source of [editor, projectInputType, projectDatabaseType, projectContent, publicProjects]) {
    assert.doesNotMatch(source, /businessTypes|projectType/)
  }
  assert.doesNotMatch(projectInputType, /publicId:\s*number/)
  assert.doesNotMatch(projectDatabaseType, /publicId:\s*number/)
  assert.doesNotMatch(publicProjects, /getPublicProjectByLegacyId|\bpublicId\b/)
  assert.doesNotMatch(deferredImages, /not uploaded until you save the draft or publish|ยังไม่อัปโหลดจนกว่าจะกดบันทึก/)
  assert.match(deferredImages, /allowManualEntry/)
  assert.match(deferredImages, /cms-required/)
  assert.doesNotMatch(deferredImages, /fetch\(/)
  assert.match(projectMediaRoute, /createStagedProjectMediaToken/)
  assert.match(projectMediaRoute, /rollbackStagedProjectMedia/)
  assert.match(projectMediaRoute, /registerStagedProjectMedia/)
  assert.match(projectRoute, /rollbackQuietly\(staged\)/)
  assert.match(projectRoute, /newProjectMediaIsStaged/)
  assert.match(projectRoute, /UNSTAGED_NEW_PROJECT_MEDIA/)
  assert.match(projectRoute, /publishCmsProject/)
  assert.match(projectRoute, /restoreCmsProjectRevision/)
  assert.match(stagedMedia, /cleanupExpiredStagedProjectMedia/)
  assert.match(revalidation, /revalidatePath/)
  assert.doesNotMatch(revalidation, /legacyPublicId/)
  assert.equal(existsSync(path.join(root, 'src', 'app', 'cms', 'projects', '[id]', 'preview', 'page.tsx')), true)
  assert.equal(existsSync(path.join(root, 'src', 'app', 'api', 'health', 'route.ts')), true)
  assert.equal(existsSync(path.join(root, 'src', 'app', 'api', 'cron', 'cleanup-project-media', 'route.ts')), true)
  assert.match(newPage, /requireCmsPage\('projects:write'\)/)
  assert.match(editPage, /getCmsProjectById\(id\)/)
  assert.doesNotMatch(manager, /<table className="cms-table">/)
  assert.match(css, /\.cms-project-grid\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /\.cms-project-card-media\s*{[^}]*aspect-ratio:\s*4\s*\/\s*3/)
  assert.doesNotMatch(css, /\.cms-project-card-heading h3\s*{[^}]*(?:min-height|max-height)/)
  assert.match(css, /\.cms-body\s*{[^}]*background-color:\s*var\(--cms-bg\)\s*!important/)
  assert.match(css, /\.cms-project-card-actions \.cms-button-secondary\s*{[^}]*color:\s*var\(--cms-ink\)/)
  assert.match(css, /\.cms-language-section\s*{/)
  assert.match(css, /\.cms-detail-section-list\s*{/)
  assert.match(css, /\.cms-select-pill\.is-selected\s*{/)
  assert.match(css, /@media \(width <= 1180px\)[\s\S]*\.cms-project-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /@media \(width <= 700px\)[\s\S]*\.cms-project-grid\s*{[^}]*grid-template-columns:\s*1fr/)
})
