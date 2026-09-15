import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { learningArticles } from '../src/data/learning.ts'
import { groundwaterLawDocuments } from '../src/data/groundwater-law-library.ts'
import { groundwaterFaqItems, groundwaterFaqSourceLinks } from '../src/data/groundwater-faq.ts'
import { recoveredThaiServiceDetails } from '../src/data/service-page-details.ts'
import { sortProjectsNewestFirst } from '../src/lib/project-sort.ts'
import { toProjectSummary } from '../src/lib/project-summaries.ts'
import { localizeProjectWorkTypes, normalizeProjectWorkTypes, projectWorkTypeLabel } from '../src/lib/project-work-types.ts'
import { SERVICE_PROJECT_WORK_TYPES, selectServiceProjects } from '../src/lib/service-projects.ts'
import { siteMediaFallbacks } from '../src/lib/site-media.ts'
import { CMS_PROJECT_WORK_TYPES } from '../src/types/cms.ts'
import { companyContact, directContactCopy } from '../src/lib/company-contact.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
  })
}

test('projects default to newest year first with undated records last', () => {
  const projects = [
    { _id: 3, year: null },
    { _id: 2, year: 2024 },
    { _id: 1, year: 2024 },
    { _id: 4, year: 2022 },
  ]
  const sortedProjects = sortProjectsNewestFirst(projects)

  for (let index = 1; index < sortedProjects.length; index += 1) {
    const previousYear = sortedProjects[index - 1].year ?? Number.NEGATIVE_INFINITY
    const currentYear = sortedProjects[index].year ?? Number.NEGATIVE_INFINITY
    assert.ok(previousYear >= currentYear)
  }

  if (sortedProjects.some((project) => project.year === null)) {
    assert.equal(sortedProjects.at(-1).year, null)
  }
})

test('public project listings use a lightweight Cloudinary-backed projection', () => {
  assert.equal(existsSync(path.join(root, 'src/data/wordpress-projects-recovered.json')), false)
  assert.equal(existsSync(path.join(root, 'src/data/project-summaries.json')), false)
  assert.equal(existsSync(path.join(root, 'public/images/projects/wordpress')), false)

  const objectId = '66c2a8e109f1d0b582a6f701'
  const project = {
    _id: objectId,
    category: ['โรงงาน'],
    coverImage: 'https://res.cloudinary.com/example/image/upload/cover.webp',
    details: ['Detail'],
    galleryImages: ['https://res.cloudinary.com/example/image/upload/gallery.webp'],
    lat: 13.7,
    lng: 100.5,
    location: 'กรุงเทพมหานคร',
    slug: 'factory-project',
    summary: 'Summary',
    title: 'Project',
    workTypes: ['groundwater-survey'],
    year: 2024,
  }
  assert.deepEqual(toProjectSummary(project), {
    _id: objectId,
    category: ['โรงงาน'],
    coverImage: project.coverImage,
    lat: 13.7,
    lng: 100.5,
    location: 'กรุงเทพมหานคร',
    title: 'Project',
    workTypes: ['งานสำรวจน้ำบาดาล'],
    year: 2024,
  })

  const publicSource = readFileSync(path.join(root, 'src/server/public-projects.ts'), 'utf8')
  assert.match(publicSource, /getCmsProjectsCollection/)
  assert.match(publicSource, /status:\s*'active'/)
  assert.match(publicSource, /ObjectId\.isValid/)
  assert.match(publicSource, /_id:\s*new ObjectId/)
  assert.match(publicSource, /coverImage:\s*document\.coverImage/)
  assert.doesNotMatch(publicSource, /wordpress-projects-recovered/)
})

test('project work type keys generate labels for every public language', () => {
  assert.deepEqual(CMS_PROJECT_WORK_TYPES, [
    'groundwater-survey',
    'groundwater-well-drilling',
    'groundwater-project-remediation',
    'groundwater-well-maintenance',
    'mineral-water',
    'island-work',
    'other',
  ])
  assert.deepEqual(CMS_PROJECT_WORK_TYPES.map((key) => projectWorkTypeLabel('th', key)), [
    'งานสำรวจน้ำบาดาล',
    'งานเจาะบ่อน้ำบาดาล',
    'งานแก้ไขโครงการที่มีปัญหา',
    'งานซ่อมบำรุง',
    'งานน้ำแร่',
    'งานบนเกาะ',
    'งานอื่นๆ',
  ])
  assert.deepEqual(normalizeProjectWorkTypes(['งานสำรวจน้ำบาดาล']), ['groundwater-survey'])
  assert.deepEqual(normalizeProjectWorkTypes(['mineral-water-survey', 'mineral-water-well-drilling']), ['mineral-water'])
  assert.deepEqual(normalizeProjectWorkTypes(['dewatering-well-construction']), ['other'])
  assert.deepEqual(localizeProjectWorkTypes(['groundwater-survey'], 'th'), ['งานสำรวจน้ำบาดาล'])
  assert.deepEqual(localizeProjectWorkTypes(['groundwater-survey'], 'en'), ['Groundwater survey'])
  assert.deepEqual(localizeProjectWorkTypes(['groundwater-survey'], 'zh'), ['地下水勘探'])
  assert.deepEqual(localizeProjectWorkTypes(['groundwater-survey'], 'ja'), ['地下水調査'])
})

test('service examples select only projects with the matching work type', () => {
  assert.deepEqual(SERVICE_PROJECT_WORK_TYPES, {
    survey: 'groundwater-survey',
    drilling: 'groundwater-well-drilling',
    maintenance: 'groundwater-well-maintenance',
    consult: 'groundwater-project-remediation',
  })

  const projects = [
    { id: 'survey-key', workTypes: ['groundwater-survey'] },
    { id: 'survey-thai', workTypes: ['งานสำรวจน้ำบาดาล'] },
    {
      id: 'survey-and-drilling',
      workTypes: ['groundwater-survey', 'groundwater-well-drilling'],
    },
    { id: 'survey-after-limit', workTypes: ['groundwater-survey'] },
    { id: 'drilling', workTypes: ['groundwater-well-drilling'] },
    { id: 'maintenance', workTypes: ['groundwater-well-maintenance'] },
  ]

  assert.deepEqual(
    selectServiceProjects(projects, 'survey').map((project) => project.id),
    ['survey-key', 'survey-thai', 'survey-and-drilling']
  )
  assert.deepEqual(
    selectServiceProjects(projects, 'drilling').map((project) => project.id),
    ['survey-and-drilling', 'drilling']
  )
  assert.deepEqual(
    selectServiceProjects(projects, 'survey', 'all').map((project) => project.id),
    ['survey-key', 'survey-thai', 'survey-and-drilling', 'survey-after-limit']
  )
})

test('learning center exposes six unique complete routes', () => {
  assert.equal(learningArticles.length, 6)
  assert.equal(
    new Set(learningArticles.map((article) => article.slug)).size,
    learningArticles.length
  )
  for (const article of learningArticles) {
    assert.ok(article.title.length > 10)
    assert.ok(article.description.length > 30)
    assert.ok(article.sections.length > 0)
  }
})

test('groundwater basics course includes its educational illustrations', () => {
  const courseAssets = [
    path.join(root, 'public', 'images', 'learning', 'groundwater-basics', 'aquifer-cross-section.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-basics', 'well-pumping-test.webp'),
  ]

  for (const asset of courseAssets) {
    assert.ok(existsSync(asset), asset)
  }
})

test('groundwater case-study course includes its diagnostic illustrations', () => {
  const courseAssets = [
    path.join(root, 'public', 'images', 'learning', 'groundwater-case-studies', 'healthy-vs-failing-well.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-case-studies', 'field-diagnostic-team.webp'),
  ]

  for (const asset of courseAssets) {
    assert.ok(existsSync(asset), asset)
  }
})

test('groundwater law center exposes a complete official document library', () => {
  const validCategories = new Set(['act', 'water-act', 'ministerial', 'notification', 'regulation'])
  const validStatuses = new Set(['current', 'consolidated', 'amended', 'reference'])

  assert.ok(groundwaterLawDocuments.length >= 40)
  assert.equal(
    new Set(groundwaterLawDocuments.map((document) => document.id)).size,
    groundwaterLawDocuments.length
  )

  for (const document of groundwaterLawDocuments) {
    assert.ok(document.title.trim().length > 10, document.id)
    assert.ok(document.scope.trim().length > 20, document.id)
    assert.ok(document.keywords.length > 0, document.id)
    assert.ok(validCategories.has(document.category), document.id)
    assert.ok(validStatuses.has(document.status), document.id)
    assert.equal(new URL(document.officialHref).protocol, 'https:', document.id)
  }
})

test('groundwater law center includes its legal process illustrations', () => {
  const courseAssets = [
    path.join(root, 'public', 'images', 'learning', 'groundwater-law', 'legal-hierarchy.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-law', 'permit-lifecycle.webp'),
  ]

  for (const asset of courseAssets) {
    assert.ok(existsSync(asset), asset)
  }
})

test('groundwater FAQ is complete, localized and linked to official sources', () => {
  const validCategories = new Set(['planning', 'permits', 'yield', 'quality', 'operation', 'maintenance', 'troubleshooting', 'cost'])
  const locales = ['th', 'en', 'zh', 'ja']

  assert.ok(groundwaterFaqItems.length >= 24)
  assert.equal(
    new Set(groundwaterFaqItems.map((item) => item.id)).size,
    groundwaterFaqItems.length
  )

  for (const item of groundwaterFaqItems) {
    assert.ok(validCategories.has(item.category), item.id)
    assert.ok(item.keywords.length > 0, item.id)
    assert.ok(item.sources.length > 0, item.id)
    for (const locale of locales) {
      assert.ok(item.question[locale].trim().length > 5, `${item.id}:${locale}:question`)
      assert.ok(item.answer[locale].trim().length > 25, `${item.id}:${locale}:answer`)
      assert.ok(item.action[locale].trim().length > 5, `${item.id}:${locale}:action`)
    }
    for (const source of item.sources) {
      assert.equal(new URL(groundwaterFaqSourceLinks[source]).protocol, 'https:', item.id)
    }
  }
})

test('groundwater FAQ includes its explanatory illustrations', () => {
  const courseAssets = [
    path.join(root, 'public', 'images', 'learning', 'groundwater-faq', 'well-to-building.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-faq', 'sample-to-treatment.webp'),
  ]

  for (const asset of courseAssets) {
    assert.ok(existsSync(asset), asset)
  }
})

test('facility owner guide is interactive, localized and includes its planning illustrations', () => {
  const guideFile = path.join(
    root,
    'src',
    'components',
    'GroundwaterOwnerGuide',
    'GroundwaterOwnerGuide.tsx'
  )
  const guideSource = readFileSync(guideFile, 'utf8')
  const guideAssets = [
    path.join(root, 'public', 'images', 'learning', 'groundwater-owner-guide', 'factory-hotel-resort-planning.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-owner-guide', 'resilient-water-system.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-owner-guide', 'four-context-groundwater-guide.webp'),
    path.join(root, 'public', 'images', 'learning', 'groundwater-owner-guide', 'agriculture-dewatering-systems.webp'),
  ]

  for (const asset of guideAssets) {
    assert.ok(existsSync(asset), asset)
  }

  for (const locale of ['th', 'en', 'zh', 'ja']) {
    assert.match(guideSource, new RegExp(`copyByLocale\\.${locale}|${locale}: \\{`))
  }

  assert.match(guideSource, /calculateGroundwaterPlan/)
  assert.match(guideSource, /calculateStoragePlan/)
  assert.match(guideSource, /hospitality/)
  assert.match(guideSource, /agriculture/)
  assert.match(guideSource, /dewatering/)
  assert.match(guideSource, /navigator\.clipboard\.writeText/)
  assert.match(guideSource, /https:\/\/www\.dgr\.go\.th/)
  assert.match(guideSource, /https:\/\/smartgis\.dgr\.go\.th/)
})

test('service detail pages use managed media with complete public fallbacks', () => {
  const serviceKeys = ['survey', 'drilling', 'maintenance', 'consult']
  const servicePageSource = readFileSync(
    path.join(
      root,
      'src',
      'components',
      'ServiceDetailPage',
      'ServiceDetailPage.tsx'
    ),
    'utf8'
  )
  const servicePageStyles = readFileSync(
    path.join(
      root,
      'src',
      'components',
      'ServiceDetailPage',
      'ServiceDetailPage.css'
    ),
    'utf8'
  )
  const serviceGallerySource = readFileSync(
    path.join(
      root,
      'src',
      'components',
      'ServiceDetailPage',
      'ServiceGallery.tsx'
    ),
    'utf8'
  )
  const serviceProjectSelectorSource = readFileSync(
    path.join(
      root,
      'src',
      'components',
      'ServiceDetailPage',
      'ServiceProjectSelector.tsx'
    ),
    'utf8'
  )
  const publicServiceMediaSource = readFileSync(
    path.join(root, 'src', 'server', 'cms', 'site-media.ts'),
    'utf8'
  )
  for (const serviceKey of serviceKeys) {
    const details = recoveredThaiServiceDetails[serviceKey]
    assert.equal(details.length, 4, serviceKey)
    assert.ok(details.every((detail) => detail.title.length > 4))
    assert.ok(details.every((detail) => detail.text.length > 40))

    const fallbackNumbers = serviceKey === 'consult' ? [3, 3, 2, 1] : [1, 1, 2, 3]
    const expectedFallbacks = fallbackNumbers.map(
      (imageNumber) => `/images/services/${serviceKey}/legacy-${String(imageNumber).padStart(2, '0')}.jpg`
    )
    const fallbacks = siteMediaFallbacks[`service-${serviceKey}`]
    assert.deepEqual(fallbacks, expectedFallbacks)
    for (const fallback of fallbacks) {
      const fallbackPath = path.join(root, 'public', fallback.replace(/^\//, ''))
      assert.ok(existsSync(fallbackPath), fallbackPath)
    }
  }

  const helmetLogoPath = path.join(
    root,
    'public',
    'images',
    'brand',
    'sgw-helmet-logo.svg'
  )
  const helmetLogoRasterPath = path.join(
    root,
    'public',
    'images',
    'brand',
    'sgw-helmet-logo.png'
  )
  assert.ok(existsSync(helmetLogoPath), helmetLogoPath)
  assert.ok(existsSync(helmetLogoRasterPath), helmetLogoRasterPath)
  assert.doesNotMatch(servicePageSource, /gallery-ppe-|restored-|serviceAssets/)
  assert.doesNotMatch(servicePageSource, /service-detail-process|processIntro|ChartNoAxesColumnIncreasing/)
  assert.doesNotMatch(servicePageStyles, /service-detail-process/)
  assert.match(servicePageSource, /bullets: service\.process\[index\]/)
  assert.doesNotMatch(servicePageSource, /0[1-4] \/ \{/)
  assert.match(
    servicePageStyles,
    /\.service-detail-hero-media figcaption\s*\{[\s\S]*?width:\s*fit-content;/
  )
  assert.doesNotMatch(
    servicePageStyles,
    /\.service-detail-hero h1\s*\{[^}]*line-height:/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-scope-grid article\s*\{[\s\S]*?grid-template-columns:\s*auto 1fr;/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-scope-grid h3\s*\{[\s\S]*?margin:\s*0;/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-details-grid > article\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?height:\s*fit-content;/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-details-grid h3\s*\{[\s\S]*?margin:\s*0;/
  )
  assert.match(
    servicePageSource,
    /className="service-detail-card-heading"[\s\S]*?<FileText aria-hidden="true" \/>[\s\S]*?<h3>\{detail\.title\}<\/h3>/
  )
  assert.match(
    servicePageSource,
    /const serviceScopeCopy:[\s\S]*?Record<ServiceKey, string\[]>/
  )
  assert.match(
    servicePageSource,
    /\{scopeCards\.map\(\(item, index\)[\s\S]*?className="service-detail-card-copy"[\s\S]*?<h3>\{item\}<\/h3>/
  )
  assert.doesNotMatch(
    servicePageSource,
    /<p>\{service\.process\[index\] \?\? service\.short\}<\/p>/
  )
  assert.doesNotMatch(servicePageSource, /<span>\{ui\.detailsIntro\}<\/span>/)
  assert.match(
    servicePageSource,
    /<ServiceGallery[\s\S]*?images=\{assets\.gallery\}[\s\S]*?fallbackImages=\{fallbackImages\.slice\(1\)\}[\s\S]*?serviceTitle=\{service\.title\}/
  )
  assert.match(
    servicePageSource,
    /const serviceTabTitles:[\s\S]*?th: \{[\s\S]*?survey: 'สำรวจศึกษา'[\s\S]*?drilling: 'เจาะ ก่อสร้าง'[\s\S]*?maintenance: 'ซ่อมบำรุง'[\s\S]*?consult: 'แก้ไขปัญหา'[\s\S]*?en: \{[\s\S]*?survey: 'Survey & study'[\s\S]*?drilling: 'Drilling & construction'[\s\S]*?maintenance: 'Maintenance'[\s\S]*?consult: 'Troubleshooting'[\s\S]*?zh: \{[\s\S]*?ja: \{/
  )
  assert.match(
    servicePageSource,
    /title: serviceTabTitles\[locale\]\[key\]/
  )
  assert.match(serviceGallerySource, /setPointerCapture/)
  assert.match(serviceGallerySource, /track\.scrollLeft =/)
  assert.match(serviceGallerySource, /onKeyDown=\{handleKeyDown\}/)
  assert.match(serviceGallerySource, /<FallbackImage[\s\S]*?fallbackSrc=\{fallbackSrc\}/)
  assert.match(serviceGallerySource, /quality=\{90\}/)
  assert.equal((servicePageSource.match(/quality=\{90\}/g) ?? []).length, 1)
  assert.match(
    servicePageStyles,
    /\.service-detail-hero-media\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9;/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-gallery-grid figure\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 3;[\s\S]*?box-shadow:/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-gallery-grid\s*\{[\s\S]*?scrollbar-width:\s*none;[\s\S]*?-ms-overflow-style:\s*none;/
  )
  assert.match(
    servicePageStyles,
    /\.service-detail-gallery-grid::\-webkit-scrollbar\s*\{[\s\S]*?display:\s*none;/
  )
  assert.match(
    servicePageSource,
    /const \[assets, projects\] = await Promise\.all\(\[[\s\S]*?getPublicServiceMedia\(serviceKey\)[\s\S]*?listPublicProjects\(\)[\s\S]*?\]\)/
  )
  assert.match(
    servicePageSource,
    /selectServiceProjects\([\s\S]*?projects,[\s\S]*?serviceKey,[\s\S]*?'all'[\s\S]*?\)\.map\(\(project\) => toProjectSummary\(project, locale\)\)/
  )
  assert.match(
    servicePageSource,
    /<ServiceProjectSelector[\s\S]*?projects=\{exampleProjects\}[\s\S]*?locale=\{locale\}[\s\S]*?copy=\{content\.projects\}/
  )
  assert.match(serviceProjectSelectorSource, /const displayOptions = \[6, 12, 24\]/)
  assert.match(serviceProjectSelectorSource, /aria-pressed=\{limit === option\}/)
  assert.match(serviceProjectSelectorSource, /const \[visibleCount, setVisibleCount\] = useState\(6\)/)
  assert.match(serviceProjectSelectorSource, /setVisibleCount\(\(count\) => Math\.min\(count \+ limit, projects\.length\)\)/)
  assert.match(serviceProjectSelectorSource, /className="service-detail-projects-load-more"/)
  assert.match(serviceProjectSelectorSource, /th: \{[\s\S]*?loadMore: 'แสดงเพิ่มเติม'/)
  assert.match(serviceProjectSelectorSource, /en: \{[\s\S]*?loadMore: 'Load more'/)
  assert.match(
    serviceProjectSelectorSource,
    /<ProjectCards[\s\S]*?projects=\{visibleProjects\}[\s\S]*?className="service-detail-projects-grid"/
  )
  assert.doesNotMatch(servicePageSource, /service-detail-cta/)
  assert.doesNotMatch(servicePageStyles, /\.service-detail-cta/)
  assert.match(
    servicePageSource,
    /<FallbackImage[\s\S]*?src=\{assets\.hero\}[\s\S]*?fallbackSrc=\{fallbackImages\[0\]\}/
  )
  assert.match(
    publicServiceMediaSource,
    /export async function getPublicServiceMedia[\s\S]*?getPublicSiteMediaImages\(`service-\$\{serviceKey\}`\)[\s\S]*?hero:[\s\S]*?gallery:/
  )
})

test('historical customer and project assets are available locally', () => {
  const historicalAssets = [
    path.join(root, 'public', 'images', 'customers', 'legacy-customer-logos.png'),
    path.join(root, 'public', 'images', 'customers', 'legacy-project-map.jpg'),
    path.join(root, 'public', 'images', 'governance', 'Poster_โครงการรักษ์น้ำบาดาล.png'),
  ]

  for (const asset of historicalAssets) {
    assert.ok(existsSync(asset), asset)
  }

  const legacyMapComponent = readFileSync(
    path.join(root, 'src', 'components', 'LegacyProjectMapSection', 'LegacyProjectMapSection.tsx'),
    'utf8'
  )
  const legacyMapStyles = readFileSync(
    path.join(root, 'src', 'components', 'LegacyProjectMapSection', 'LegacyProjectMapSection.module.css'),
    'utf8'
  )
  const legacyMapViewer = readFileSync(
    path.join(root, 'src', 'components', 'LegacyProjectMapSection', 'LegacyProjectMapViewer.tsx'),
    'utf8'
  )
  assert.doesNotMatch(legacyMapComponent, /openHint/)
  assert.doesNotMatch(legacyMapComponent, /styles\.(intro|note)/)
  assert.doesNotMatch(legacyMapStyles, /\.(intro|note)\s*\{/)
  assert.match(
    legacyMapStyles,
    /\.section\s*\{[\s\S]*?grid-template-columns:\s*1fr;/
  )
  assert.match(legacyMapComponent, /<LegacyProjectMapViewer/)
  assert.match(legacyMapComponent, /getPublicSiteMediaImages\('project-map'\)/)
  assert.match(legacyMapComponent, /fallbackImagePath=\{fallbackImagePath\}/)
  assert.equal(
    siteMediaFallbacks['project-map'][0],
    '/images/customers/legacy-project-map.jpg'
  )
  assert.equal(
    siteMediaFallbacks.governance[0],
    '/images/governance/Poster_โครงการรักษ์น้ำบาดาล.png'
  )
  assert.doesNotMatch(legacyMapComponent, /target="_blank"/)
  assert.match(legacyMapViewer, /createPortal/)
  assert.match(legacyMapViewer, /aria-modal="true"/)
  assert.match(legacyMapViewer, /event\.key === 'Escape'/)
  assert.match(legacyMapViewer, /event\.key !== 'Tab'/)
  assert.match(legacyMapViewer, /opener\?\.focus\(\)/)
  assert.match(legacyMapViewer, /setPointerCapture/)
  assert.match(legacyMapViewer, /MIN_SCALE = 1/)
  assert.match(legacyMapViewer, /MAX_SCALE = 4/)
  assert.match(legacyMapViewer, /ResizeObserver/)
  assert.match(legacyMapViewer, /passive: false/)
  assert.match(legacyMapViewer, /window\.matchMedia\('\(width > 1200px\)'\)\.matches/)
  assert.match(legacyMapViewer, /onPointerDown=\{updateHoverPreview\}/)
  assert.match(legacyMapViewer, /onPointerMove=\{updateHoverPreview\}/)
  assert.match(legacyMapViewer, /HOVER_PREVIEW_SCALE = 3\.2/)
  assert.match(
    legacyMapViewer,
    /style\.backgroundPosition = `\$\{backgroundX\}px \$\{backgroundY\}px`/
  )
  assert.match(legacyMapViewer, /onPointerCancel=\{hideHoverPreview\}/)
  assert.match(legacyMapViewer, /onPointerUp=\{hideHoverPreview\}/)
  assert.match(legacyMapViewer, /src=\{activeImagePath\}/)
  assert.match(legacyMapViewer, /backgroundImage: `url\("\$\{activeImagePath\}"\)`/)
  assert.match(legacyMapViewer, /href=\{activeImagePath\}/)
  assert.match(legacyMapViewer, /onError=\{showFallbackImage\}/)
  assert.match(legacyMapViewer, /<div\s+ref=\{mapPanelRef\}/)
  assert.doesNotMatch(legacyMapViewer, /<button\s+ref=\{mapPanelRef\}/)
  assert.doesNotMatch(legacyMapViewer, /magnifierLabel|hoverPreviewLabel|previewHint|zoomCue/)
  assert.match(legacyMapStyles, /\.canvas\s*\{[\s\S]*?touch-action:\s*none;/)
  assert.match(
    legacyMapStyles,
    /@media \(width > 1200px\)[\s\S]*?\.previewStage\s*\{[\s\S]*?grid-template-columns:\s*auto var\(--hover-preview-width, 27rem\);[\s\S]*?\.mapPanel\s*\{[\s\S]*?touch-action:\s*pan-y;[\s\S]*?\.hoverPreview\s*\{[\s\S]*?width:\s*var\(--hover-preview-width, 27rem\);[\s\S]*?background-size:\s*320% auto;/
  )
  assert.match(legacyMapViewer, /--hover-preview-width/)
  assert.match(legacyMapStyles, /@media \(prefers-reduced-motion: reduce\)/)

  for (const translation of [
    'เปิดและซูมแผนที่',
    'Open and zoom map',
    '打开并缩放地图',
    '地図を開いて拡大',
  ]) {
    assert.ok(legacyMapComponent.includes(translation), translation)
  }
})

test('mobile navigation uses an accessible right-side drawer', () => {
  const component = readFileSync(
    path.join(root, 'src', 'components', 'Navbar', 'mobile', 'Navbar-mobile.tsx'),
    'utf8'
  )
  const styles = readFileSync(
    path.join(root, 'src', 'components', 'Navbar', 'mobile', 'Navbar-mobile.css'),
    'utf8'
  )

  assert.match(component, /createPortal/)
  assert.match(component, /aria-modal="true"/)
  assert.match(component, /event\.key === 'Escape'/)
  assert.match(component, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(component, /event\.key !== 'Tab'/)
  assert.match(styles, /inset: 0 0 0 auto/)
  assert.match(styles, /translateX\(102%\)/)
  assert.match(styles, /safe-area-inset-bottom/)

  const desktopStyles = readFileSync(
    path.join(root, 'src', 'components', 'Navbar', 'Navbar.css'),
    'utf8'
  )
  const desktopComponent = readFileSync(
    path.join(root, 'src', 'components', 'Navbar', 'Navbar.tsx'),
    'utf8'
  )
  assert.match(
    desktopStyles,
    /\.navbar-subnav\s*\{[\s\S]*?width:\s*fit-content;/
  )
  assert.match(
    desktopStyles,
    /\.navbar-subnav-link\s*\{[\s\S]*?white-space:\s*nowrap;/
  )
  assert.match(desktopComponent, /const \[dismissedSubnav, setDismissedSubnav\]/)
  assert.match(desktopComponent, /onClick=\{\(event\) => dismissSubnav\(item\.href, event\)\}/)
  assert.match(desktopComponent, /onPointerLeave=[\s\S]*?event\.pointerType !== 'mouse'/)
  assert.match(desktopStyles, /\.navbar-item\.is-subnav-dismissed \.navbar-subnav\s*\{[\s\S]*?display:\s*none;/)
})

test('contact page uses copyable contact cards and an interactive office map', () => {
  const component = readFileSync(
    path.join(root, 'src', 'components', 'ContactDetails', 'ContactDetails.tsx'),
    'utf8'
  )
  const defaultPage = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'contact', 'page.tsx'),
    'utf8'
  )
  const localizedPage = readFileSync(
    path.join(root, 'src', 'app', '[locale]', '[[...slug]]', 'page.tsx'),
    'utf8'
  )
  const footer = readFileSync(
    path.join(root, 'src', 'components', 'Footer', 'Footer.tsx'),
    'utf8'
  )
  const footerStyles = readFileSync(
    path.join(root, 'src', 'components', 'Footer', 'Footer.css'),
    'utf8'
  )

  assert.match(component, /openstreetmap\.org\/export\/embed\.html/)
  assert.match(component, /<iframe/)
  assert.match(component, /navigator\.clipboard\.writeText/)
  assert.match(component, /document\.execCommand\('copy'\)/)
  assert.match(component, /google\.com\/maps\/search/)
  assert.match(component, /0105530015432/)
  assert.match(component, /https:\/\/www\.tiktok\.com\/@siamgroundwater\.co/)
  assert.match(component, /src="\/icons\/TikTok\.png"/)
  assert.match(footer, /companyContact\.social\.map/)
  assert.equal(companyContact.social.find(social => social.name === 'TikTok').href, 'https://www.tiktok.com/@siamgroundwater.co')
  assert.equal(companyContact.social.find(social => social.name === 'TikTok').image, '/icons/TikTok.png')
  assert.match(footer, /href=\{companyContact\.wasin\.href\}/)
  assert.match(footer, /href=\{companyContact\.toeng\.href\}/)
  assert.equal(companyContact.wasin.href, 'tel:0898954757')
  assert.equal(companyContact.toeng.href, 'tel:0827447582')
  assert.equal(directContactCopy.th.wasin, 'โทร (คุณวศิน)')
  assert.equal(directContactCopy.th.toeng, 'โทร (คุณเติ้ง)')
  assert.match(footerStyles, /\.footer-contact-area\s*\{[\s\S]*?flex-direction:\s*column;/)
  assert.match(footerStyles, /\.footer-contact\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3, auto\);[\s\S]*?align-self:\s*center;/)
  assert.match(footerStyles, /@media \(width <= 1100px\)[\s\S]*?\.footer-contact\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, auto\);/)
  assert.match(footerStyles, /@media \(width <= 680px\)[\s\S]*?\.footer-contact\s*\{[\s\S]*?grid-template-columns:\s*1fr;/)
  assert.match(footerStyles, /\.footer-main\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?justify-items:\s*center;/)
  assert.match(footerStyles, /\.footer-contact-area\s*\{[\s\S]*?justify-self:\s*center;/)
  assert.match(footerStyles, /\.footer-brand\s*\{[\s\S]*?justify-content:\s*center;[\s\S]*?text-align:\s*center;/)
  assert.match(footerStyles, /\.footer-social img\s*\{[\s\S]*?border-radius:\s*0\.5rem;/)
  assert.doesNotMatch(defaultPage, /contact-form-section|ContactForm/)
  assert.doesNotMatch(localizedPage, /contact-form-section|ContactForm/)
})

test('home sections keep the video and place customer history after social media', () => {
  const defaultHome = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'page.tsx'),
    'utf8'
  )
  const localizedPage = readFileSync(
    path.join(root, 'src', 'app', '[locale]', '[[...slug]]', 'page.tsx'),
    'utf8'
  )
  const socialSection = readFileSync(
    path.join(root, 'src', 'components', 'home', 'SocialMediaSection.tsx'),
    'utf8'
  )
  const videoSection = readFileSync(
    path.join(root, 'src', 'components', 'home', 'CompanyVideoSection.tsx'),
    'utf8'
  )

  assert.match(defaultHome, /<CompanyVideoSection locale="th" \/>/)
  assert.match(localizedPage, /<CompanyVideoSection locale=\{locale\} \/>/)
  assert.match(videoSection, /maxresdefault\.jpg/)
  assert.match(videoSection, /\bunoptimized\b/)
  assert.ok(defaultHome.indexOf('<SocialMediaSection />') < defaultHome.indexOf('<CustomerHistorySection />'))
  assert.ok(localizedPage.indexOf('<SocialMediaSection locale={locale} />') < localizedPage.indexOf('<CustomerHistorySection locale={locale} />'))
  assert.match(socialSection, /tiktok\.com\/@siamgroundwater\.co/)
  assert.match(socialSection, /\/icons\/TikTok\.png/)
  assert.match(socialSection, /data-embed-type="creator"/)
  assert.match(socialSection, /https:\/\/www\.tiktok\.com\/embed\.js/)
  assert.match(socialSection, /document\.createElement\('script'\)/)
  assert.match(socialSection, /tiktokScriptAttemptedRef/)
  assert.match(socialSection, /IntersectionObserver/)
  assert.match(socialSection, /blockquote\[data-embed-type="creator"\]\[id\]/)
  assert.match(socialSection, /element\.getBoundingClientRect\(\)\.height < 320/)
  assert.match(socialSection, /tiktokEmbedFailed/)
  assert.doesNotMatch(socialSection, /currentFrame\.getBoundingClientRect/)
  assert.doesNotMatch(socialSection, /line\.me|LINE Official|@SGW_TH/)
})

test('home project map can move to the visitor current location', () => {
  const mapComponent = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'map', 'map.tsx'),
    'utf8'
  )
  const mapStyles = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'map', 'map.css'),
    'utf8'
  )

  assert.match(mapComponent, /navigator\.geolocation\.getCurrentPosition/)
  assert.match(mapComponent, /mapRef\.current\?\.flyTo/)
  assert.match(mapComponent, /<LocateFixed aria-hidden="true"/)
  assert.match(mapComponent, /aria-busy=\{locationStatus === 'locating'\}/)
  assert.match(mapComponent, /<CircleMarker/)
  assert.match(mapComponent, /PERMISSION_DENIED/)
  assert.match(
    mapStyles,
    /\.home-map-location-control\s*\{[\s\S]*?right:\s*0\.65rem;[\s\S]*?bottom:\s*0\.65rem;/
  )

  const nextConfig = readFileSync(path.join(root, 'next.config.ts'), 'utf8')
  assert.match(nextConfig, /geolocation=\(self\)/)
  assert.doesNotMatch(nextConfig, /geolocation=\(\)/)
})

test('Thai routes keep localized search metadata and page-level headings', () => {
  const metadataHelper = readFileSync(
    path.join(root, 'src', 'lib', 'site-metadata.ts'),
    'utf8'
  )
  const structuredData = readFileSync(
    path.join(root, 'src', 'components', 'SiteStructuredData', 'SiteStructuredData.tsx'),
    'utf8'
  )
  const servicesPage = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'services', 'page.tsx'),
    'utf8'
  )
  const projectsPage = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'projects', 'page.tsx'),
    'utf8'
  )

  assert.match(metadataHelper, /languages:\s*languageAlternates\(pathname\)/)
  assert.match(metadataHelper, /openGraph:/)
  assert.match(metadataHelper, /twitter:/)
  assert.match(structuredData, /'@type': 'Organization'/)
  assert.match(structuredData, /'@type': 'WebSite'/)
  assert.match(servicesPage, /<Services headingLevel="h1" \/>/)
  assert.match(projectsPage, /import LegacyProjectMapSection/)
  assert.match(
    projectsPage,
    /<Projects[\s\S]*?projects=\{projects\}[\s\S]*?showHistoryMap[\s\S]*?headingLevel="h1"[\s\S]*?historyMap=\{<LegacyProjectMapSection \/>\}/
  )
})

test('Thai and translated project routes share one page structure', () => {
  const detailView = readFileSync(
    path.join(root, 'src', 'components', 'ProjectDetailView', 'ProjectDetailView.tsx'),
    'utf8'
  )
  const thaiDetailPage = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'projects', '[id]', 'page.tsx'),
    'utf8'
  )
  const localizedPage = readFileSync(
    path.join(root, 'src', 'app', '[locale]', '[[...slug]]', 'page.tsx'),
    'utf8'
  )
  const projectBrowser = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'projects', 'projects.tsx'),
    'utf8'
  )

  assert.match(thaiDetailPage, /<ProjectDetailView/)
  assert.match(localizedPage, /<ProjectDetailView locale=\{locale\} content=\{content\} project=\{project\} \/>/)
  assert.ok(
    detailView.indexOf('<ProjectMediaSlider') <
      detailView.indexOf('<div className="project-detail-content">')
  )
  assert.doesNotMatch(detailView, /content\.projects\.typeLabel/)
  assert.match(projectBrowser, /showIntro && copy\?\.intro/)
  assert.match(
    localizedPage,
    /showHistoryMap showIntro=\{false\} headingLevel="h1" historyMap=\{<LegacyProjectMapSection locale=\{locale\} \/>\}/
  )
})

test('Thai and translated governance pages both expose their title as the page heading', () => {
  const thaiGovernance = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'governance', 'page.tsx'),
    'utf8'
  )
  const localizedPage = readFileSync(
    path.join(root, 'src', 'app', '[locale]', '[[...slug]]', 'page.tsx'),
    'utf8'
  )
  const governanceView = readFileSync(
    path.join(root, 'src', 'components', 'GovernancePage', 'GovernancePageView.tsx'),
    'utf8'
  )

  assert.match(thaiGovernance, /getPublicSiteMediaImages\('governance'\)/)
  assert.match(thaiGovernance, /<GovernancePageView/)
  assert.match(localizedPage, /getPublicSiteMediaImages\('governance'\)/)
  assert.match(localizedPage, /<GovernancePageView/)
  assert.match(governanceView, /<h1 className="governance-title-th">\{title\}<\/h1>/)
  assert.match(governanceView, /<FallbackImage[\s\S]*?fallbackSrc=\{fallbackPoster\}/)
  assert.match(governanceView, /onFallback=\{\(\) => setFailedSrc\(requestedSrc\)\}/)
  assert.match(governanceView, /failedSrc === requestedSrc \? fallbackPoster : requestedSrc/)
  assert.match(governanceView, /fl_attachment:siam-groundwater-governance-poster/)
})

test('home project cards and map popup actions open details in a new tab', () => {
  const mapComponent = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'map', 'map.tsx'),
    'utf8'
  )
  const projectBrowser = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'projects', 'projects.tsx'),
    'utf8'
  )

  assert.match(
    mapComponent,
    /className="home-map-popup-action"\s+target="_blank"\s+rel="noopener noreferrer"/
  )
  assert.match(
    projectBrowser,
    /className="listing-item project-card"[\s\S]*?target="_blank"\s+rel="noopener noreferrer"/
  )
})

test('project category controls remain horizontally usable on mobile', () => {
  const mapStyles = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'map', 'map.css'),
    'utf8'
  )
  const projectStyles = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'projects', 'projects.css'),
    'utf8'
  )

  assert.match(mapStyles, /\.home-map-filters\s*\{[\s\S]*?padding-top:\s*0\.3rem/)
  assert.match(
    projectStyles,
    /@media \(width <= 640px\)[\s\S]*?\.projects-filter-buttons\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/
  )
  assert.match(
    projectStyles,
    /\.projects-filter-buttons \.filter-button\s*\{[\s\S]*?flex:\s*0 0 auto;/
  )
  assert.match(
    projectStyles,
    /\.projects-filter-buttons\s*\{[\s\S]*?padding-top:\s*0\.3rem;/
  )
})

test('full projects page can reveal more projects after the grid', () => {
  const projectBrowser = readFileSync(
    path.join(root, 'src', 'app', '(site)', 'home', 'projects', 'projects.tsx'),
    'utf8'
  )

  assert.ok(
    projectBrowser.indexOf('<ProjectCards projects={displayedProjects}') <
      projectBrowser.indexOf('className="projects-show-more-wrap"')
  )
  assert.match(projectBrowser, /!featured &&[\s\S]*?displayedProjects\.length < filteredProjects\.length/)
  assert.match(projectBrowser, /setVisibleCount\(\(count\) => count \+ itemsPerPage\)/)
  assert.match(projectBrowser, /showMore: 'Show more'/)
})

test('all project font sizes use global tokens with a 16px minimum', () => {
  const globalsPath = path.join(root, 'src', 'styles', 'globals.css')
  const globals = readFileSync(globalsPath, 'utf8')
  const disallowedSizingTerm = ['cla', 'mp'].join('')
  const tokenDefinitions = new Set(
    [...globals.matchAll(/(--fs-[a-z0-9-]+)\s*:/g)].map((match) => match[1])
  )

  assert.match(globals, /--fs-root:\s*1rem;/)
  assert.match(globals, /--fs-sm:\s*1rem;/)
  for (const match of globals.matchAll(/--fs-[a-z0-9-]+\s*:\s*([0-9.]+)rem;/g)) {
    assert.ok(Number(match[1]) >= 1, `${match[0]} is smaller than 16px at the root scale`)
  }

  for (const sourcePath of listFiles(path.join(root, 'src'))) {
    if (!/\.(?:css|tsx?|jsx?)$/.test(sourcePath)) continue
    const source = readFileSync(sourcePath, 'utf8')
    assert.equal(
      source.toLowerCase().includes(disallowedSizingTerm),
      false,
      `${sourcePath}: use explicit tokens and breakpoints`
    )

    if (sourcePath !== globalsPath) {
      for (const match of source.matchAll(/font-size\s*:\s*([^;]+);/g)) {
        assert.match(match[1].trim(), /^var\(--fs-[a-z0-9-]+\)$/i, sourcePath)
      }
      for (const match of source.matchAll(/fontSize\s*:\s*['"]([^'"]+)['"]/g)) {
        assert.match(match[1].trim(), /^var\(--fs-[a-z0-9-]+\)$/i, sourcePath)
      }
    }

    for (const match of source.matchAll(/var\((--fs-[a-z0-9-]+)\)/g)) {
      assert.ok(tokenDefinitions.has(match[1]), `${sourcePath}: ${match[1]}`)
    }
  }
})

test('project styles do not cap horizontal content', () => {
  const cappedWidthProperty = ['max', '-', 'width'].join('')
  const cappedInlineProperty = ['max', '-', 'inline', '-', 'size'].join('')

  for (const sourcePath of listFiles(path.join(root, 'src'))) {
    if (!/\.(?:css|tsx?|jsx?)$/.test(sourcePath)) continue
    const source = readFileSync(sourcePath, 'utf8')

    assert.equal(source.includes(cappedWidthProperty), false, sourcePath)
    assert.equal(source.includes(cappedInlineProperty), false, sourcePath)
    if (sourcePath.endsWith('.css')) {
      assert.doesNotMatch(source, /(?<!min-)width\s*:\s*min\(/, sourcePath)
    }
  }
})
