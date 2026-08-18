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
    businessTypes: ['โรงงาน'],
    category: ['โรงงาน'],
    coverImage: 'https://res.cloudinary.com/example/image/upload/cover.webp',
    details: ['Detail'],
    galleryImages: ['https://res.cloudinary.com/example/image/upload/gallery.webp'],
    lat: 13.7,
    legacyPostId: 123,
    legacyUrl: 'https://example.com/project',
    lng: 100.5,
    location: 'กรุงเทพมหานคร',
    projectType: 'factory',
    projectTypeLabel: 'Factory',
    slug: 'factory-project',
    summary: 'Summary',
    title: 'Project',
    workTypes: ['Survey'],
    year: 2024,
  }
  assert.deepEqual(toProjectSummary(project), {
    _id: objectId,
    category: ['โรงงาน'],
    coverImage: project.coverImage,
    lat: 13.7,
    lng: 100.5,
    location: 'กรุงเทพมหานคร',
    projectType: 'factory',
    projectTypeLabel: 'Factory',
    title: 'Project',
    workTypes: ['Survey'],
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

test('service detail pages have complete recovered copy and local field imagery', () => {
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

  for (const serviceKey of serviceKeys) {
    const details = recoveredThaiServiceDetails[serviceKey]
    assert.equal(details.length, 4, serviceKey)
    assert.ok(details.every((detail) => detail.title.length > 4))
    assert.ok(details.every((detail) => detail.text.length > 40))

    for (let imageNumber = 1; imageNumber <= 3; imageNumber += 1) {
      const legacyImagePath = path.join(
        root,
        'public',
        'images',
        'services',
        serviceKey,
        `legacy-${String(imageNumber).padStart(2, '0')}.jpg`
      )
      const restoredImagePath = path.join(
        root,
        'public',
        'images',
        'services',
        serviceKey,
        `restored-${String(imageNumber).padStart(2, '0')}.webp`
      )
      const ppeImagePath = path.join(
        root,
        'public',
        'images',
        'services',
        serviceKey,
        `gallery-ppe-${String(imageNumber).padStart(2, '0')}.webp`
      )
      assert.ok(existsSync(legacyImagePath), legacyImagePath)
      assert.ok(existsSync(restoredImagePath), restoredImagePath)
      assert.ok(existsSync(ppeImagePath), ppeImagePath)
    }

    const heroImagePath = path.join(
      root,
      'public',
      'images',
      'services',
      serviceKey,
      'hero-ppe.webp'
    )
    assert.ok(existsSync(heroImagePath), heroImagePath)
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
  assert.doesNotMatch(servicePageSource, /gallery-ppe-|restored-/)
  assert.match(servicePageSource, /padStart\(2, '0'\)/)
  assert.doesNotMatch(servicePageSource, /0[1-4] \/ \{/)
  assert.equal(
    (servicePageSource.match(/hero: '\/images\/services\/[^']+\/legacy-/g) ?? [])
      .length,
    4
  )
})

test('historical customer and project assets are available locally', () => {
  const historicalAssets = [
    path.join(root, 'public', 'images', 'customers', 'legacy-customer-logos.png'),
    path.join(root, 'public', 'images', 'customers', 'legacy-project-map.jpg'),
  ]

  for (const asset of historicalAssets) {
    assert.ok(existsSync(asset), asset)
  }

  const legacyMapComponent = readFileSync(
    path.join(root, 'src', 'components', 'LegacyProjectMapSection', 'LegacyProjectMapSection.tsx'),
    'utf8'
  )
  assert.doesNotMatch(legacyMapComponent, /openHint/)
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
  assert.match(
    desktopStyles,
    /\.navbar-subnav\s*\{[\s\S]*?width:\s*fit-content;/
  )
  assert.match(
    desktopStyles,
    /\.navbar-subnav-link\s*\{[\s\S]*?white-space:\s*nowrap;/
  )
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

  assert.match(component, /openstreetmap\.org\/export\/embed\.html/)
  assert.match(component, /<iframe/)
  assert.match(component, /navigator\.clipboard\.writeText/)
  assert.match(component, /document\.execCommand\('copy'\)/)
  assert.match(component, /google\.com\/maps\/search/)
  assert.match(component, /0105530015432/)
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
  assert.match(projectsPage, /<Projects projects=\{projects\} showHistoryMap headingLevel="h1" \/>/)
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
    projectBrowser.indexOf('className="projects-grid display-posts-listing"') <
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
