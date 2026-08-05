import fs from 'node:fs'
import path from 'node:path'

const legacyRoot = path.resolve(process.argv[2] ?? 'C:/Coding/2025/sgw')
const outputRoot = path.resolve(process.argv[3] ?? 'src/data')

const sqlPath = fs
  .readdirSync(legacyRoot)
  .map((name) => path.join(legacyRoot, name))
  .find((filePath) => filePath.endsWith('_wpdb.sql'))

if (!sqlPath) {
  throw new Error(`WordPress database dump not found in ${legacyRoot}`)
}

const pageSourcePaths = [
  path.join(legacyRoot, 'home.txt'),
  path.join(legacyRoot, 'projects', 'Private.txt'),
  path.join(legacyRoot, 'projects', 'Government.txt'),
  path.join(legacyRoot, 'projects', 'projects.txt'),
]

const decodeHtml = (value = '') =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&nbsp;|&#038;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const cleanText = (value = '') =>
  decodeHtml(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/li>|<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const normalizedTitle = (value = '') =>
  cleanText(value)
    .toLocaleLowerCase('th')
    .replace(/[\s\u200b]+/g, '')
    .replace(/[()\-–—.,/&]/g, '')

function projectKeyFromUrl(value = '') {
  try {
    const url = new URL(decodeHtml(value), 'http://www.siamgroundwater.com')
    const queryProject = url.searchParams.get('project')
    if (queryProject) return normalizeProjectKey(queryProject)

    const match = decodeURIComponent(url.pathname).match(/\/project\/([^/]+)/i)
    return normalizeProjectKey(match?.[1] ?? '')
  } catch {
    return ''
  }
}

function normalizeProjectKey(value = '') {
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    // Keep WordPress slugs that contain a literal percent sign unchanged.
  }

  return decoded.toLocaleLowerCase('th').replace(/^\/+|\/+$/g, '')
}

function projectKeysMatch(first = '', second = '') {
  const a = normalizeProjectKey(first)
  const b = normalizeProjectKey(second)
  if (!a || !b) return false
  return a === b || a.startsWith(b) || b.startsWith(a)
}

function splitPublicList(value = '') {
  return cleanText(value)
    .replace(/^ประเภทธุรกิจ\s*:\s*/i, '')
    .split(/\s*,\s*|\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseMapFeatures(source) {
  const features = []
  const featurePattern =
    /coordinates:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\][\s\S]*?title:\s*'([^']*)'[\s\S]*?url:\s*'([^']*)'[\s\S]*?type:\s*'([^']*)'/g

  for (const match of source.matchAll(featurePattern)) {
    features.push({
      lng: Number(match[1]),
      lat: Number(match[2]),
      title: cleanText(match[3]),
      key: projectKeyFromUrl(match[4]),
      projectType: cleanText(match[5]),
    })
  }

  return features
}

function parseProjectCards(source, sourceFile) {
  const cards = []
  const cardPattern =
    /<div class="listing-item">[\s\S]*?<div class="image">\s*<a href="([^"]+)"[^>]*>\s*<img[^>]*?src="([^"]+)"[\s\S]*?<h4 class="Project-Title[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<h5 class="project-date[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<p class="project-location[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p class="project-type-of-work[^>]*>([\s\S]*?)<\/p>(?:[\s\S]*?<p class="project-business-type[^>]*>([\s\S]*?)<\/p>)?/g

  for (const match of source.matchAll(cardPattern)) {
    const yearText = cleanText(match[4])
    const parsedYear = /^(19|20)\d{2}$/.test(yearText) ? Number(yearText) : null
    cards.push({
      key: projectKeyFromUrl(match[1]),
      sourceUrl: decodeHtml(match[1]),
      coverImage: decodeHtml(match[2]).replace(/^http:/, 'https:'),
      title: cleanText(match[3]),
      year: parsedYear,
      location: cleanText(match[5]),
      workTypes: splitPublicList(match[6]),
      businessTypes: splitPublicList(match[7] ?? ''),
      sourceFile,
    })
  }

  return cards
}

function forEachInsertPayload(sql, table, callback) {
  const marker = `INSERT INTO \`${table}\` VALUES `
  let searchFrom = 0
  let statementCount = 0

  while (true) {
    const markerIndex = sql.indexOf(marker, searchFrom)
    if (markerIndex === -1) break

    const payloadStart = markerIndex + marker.length
    let payloadEnd = sql.indexOf(';\n', payloadStart)
    if (payloadEnd === -1) payloadEnd = sql.indexOf(';\r\n', payloadStart)
    if (payloadEnd === -1) throw new Error(`Unterminated ${table} insert`)

    callback(sql.slice(payloadStart, payloadEnd))
    statementCount += 1
    searchFrom = payloadEnd + 2
  }

  return statementCount
}

function forEachSqlRow(payload, callback) {
  let index = 0

  const skipWhitespace = () => {
    while (/\s/.test(payload[index] ?? '')) index += 1
  }

  while (index < payload.length) {
    skipWhitespace()
    if (payload[index] === ',') index += 1
    skipWhitespace()
    if (payload[index] !== '(') {
      index += 1
      continue
    }

    index += 1
    const row = []

    while (index < payload.length) {
      skipWhitespace()
      let value = ''

      if (payload[index] === "'") {
        index += 1
        while (index < payload.length) {
          const character = payload[index]
          if (character === "'") {
            index += 1
            break
          }

          if (character === '\\') {
            index += 1
            const escaped = payload[index]
            const escapeMap = {
              0: '\0',
              b: '\b',
              n: '\n',
              r: '\r',
              t: '\t',
              Z: '\u001a',
            }
            value += escapeMap[escaped] ?? escaped ?? ''
            index += 1
            continue
          }

          value += character
          index += 1
        }
      } else {
        const valueStart = index
        while (
          index < payload.length &&
          payload[index] !== ',' &&
          payload[index] !== ')'
        ) {
          index += 1
        }
        const rawValue = payload.slice(valueStart, index).trim()
        value = rawValue === 'NULL' ? null : Number(rawValue)
        if (Number.isNaN(value)) value = rawValue
      }

      row.push(value)
      skipWhitespace()

      if (payload[index] === ',') {
        index += 1
        continue
      }

      if (payload[index] === ')') {
        index += 1
        callback(row)
        break
      }

      throw new Error(`Unexpected SQL token near offset ${index}`)
    }
  }
}

function extractElementorContent(rawValue = '') {
  const texts = []
  const images = []

  const addText = (value) => {
    const text = cleanText(value)
    if (
      text.length >= 4 &&
      !/^[-–—\s]+$/.test(text) &&
      !/^(descript|details|head|p)$/i.test(text.replace(/[-–—\s]/g, ''))
    ) {
      texts.push(text)
    }
  }

  const visit = (value, key = '') => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key))
      return
    }

    if (!value || typeof value !== 'object') return

    for (const [childKey, childValue] of Object.entries(value)) {
      if (
        typeof childValue === 'string' &&
        ['editor', 'title', 'description', 'text'].includes(childKey)
      ) {
        addText(childValue)
      }

      if (
        childKey === 'url' &&
        typeof childValue === 'string' &&
        childValue.includes('/wp-content/uploads/')
      ) {
        images.push(childValue.replace(/^http:/, 'https:'))
      }

      visit(childValue, childKey)
    }
  }

  try {
    visit(JSON.parse(rawValue))
  } catch {
    addText(rawValue)
  }

  return {
    texts: [...new Set(texts)],
    images: [...new Set(images)],
  }
}

function inferProjectType(title, businessTypes, fallback = 'other') {
  const validTypes = new Set([
    'government',
    'factory',
    'resort',
    'island, resort',
    'agriculture',
    'train',
    'infrastructure',
    'other',
  ])
  if (validTypes.has(fallback) && fallback !== 'other') return fallback
  const haystack = `${title} ${businessTypes.join(' ')}`
  if (/รัฐบาล|องค์การบริหาร|กรม|เทศบาล|มหาวิทยาลัย|โรงเรียน|วัด/.test(haystack)) {
    return 'government'
  }
  if (/โรงแรม|รีสอร์ท|resort|hotel/i.test(haystack)) return 'resort'
  if (/เกษตร|ฟาร์ม|ปศุสัตว์|สวน/.test(haystack)) return 'agriculture'
  if (/รถไฟ|ทางด่วน|อุโมงค์|dewatering/i.test(haystack)) return 'infrastructure'
  if (/โรงงาน|อุตสาหกรรม|บริษัท/.test(haystack)) return 'factory'
  return 'other'
}

const sql = fs.readFileSync(sqlPath, 'utf8')
const posts = new Map()
const attachments = new Map()
const postTypeCounts = new Map()

forEachInsertPayload(sql, 'wp_posts', (payload) => {
  forEachSqlRow(payload, (row) => {
    const post = {
      id: Number(row[0]),
      date: String(row[2] ?? ''),
      content: String(row[4] ?? ''),
      title: cleanText(String(row[5] ?? '')),
      excerpt: cleanText(String(row[6] ?? '')),
      status: String(row[7] ?? ''),
      slug: String(row[11] ?? ''),
      modified: String(row[14] ?? ''),
      parent: Number(row[17] ?? 0),
      guid: String(row[18] ?? ''),
      type: String(row[20] ?? ''),
      mimeType: String(row[21] ?? ''),
    }

    postTypeCounts.set(post.type, (postTypeCounts.get(post.type) ?? 0) + 1)

    if (post.type === 'attachment') {
      attachments.set(post.id, {
        url: post.guid.replace(/^http:/, 'https:'),
        parent: post.parent,
        mimeType: post.mimeType,
      })
    }

    if (
      post.status === 'publish' &&
      (post.type === 'project' || post.type === 'page')
    ) {
      posts.set(post.id, post)
    }
  })
})

const attachmentsByParent = new Map()
for (const attachment of attachments.values()) {
  if (!attachment.parent || !attachment.mimeType.startsWith('image/')) continue
  const parentAttachments = attachmentsByParent.get(attachment.parent) ?? []
  parentAttachments.push(attachment.url)
  attachmentsByParent.set(attachment.parent, parentAttachments)
}

const metaByPost = new Map([...posts.keys()].map((postId) => [postId, new Map()]))

forEachInsertPayload(sql, 'wp_postmeta', (payload) => {
  forEachSqlRow(payload, (row) => {
    const postId = Number(row[1])
    const postMeta = metaByPost.get(postId)
    if (!postMeta) return

    const key = String(row[2] ?? '')
    const values = postMeta.get(key) ?? []
    values.push(String(row[3] ?? ''))
    postMeta.set(key, values)
  })
})

const homeSource = fs.readFileSync(pageSourcePaths[0], 'utf8')
const mapFeatures = parseMapFeatures(homeSource)
const cards = pageSourcePaths.flatMap((sourcePath) =>
  parseProjectCards(
    fs.readFileSync(sourcePath, 'utf8'),
    path.relative(legacyRoot, sourcePath).replaceAll('\\', '/')
  )
)

const uniqueCards = new Map()
for (const card of cards) {
  const cardKey = normalizeProjectKey(card.key) || normalizedTitle(card.title)
  const existing = uniqueCards.get(cardKey)
  if (!existing || (!existing.businessTypes.length && card.businessTypes.length)) {
    uniqueCards.set(cardKey, card)
  }
}

const cardsByTitle = new Map(
  [...uniqueCards.values()].map((card) => [normalizedTitle(card.title), card])
)

const publishedProjects = [...posts.values()].filter(
  (post) => post.type === 'project'
)
const publishedPages = [...posts.values()].filter((post) => post.type === 'page')

const projects = publishedProjects.map((post) => {
  const meta = metaByPost.get(post.id) ?? new Map()
  const postKey = normalizeProjectKey(post.slug)
  const card =
    uniqueCards.get(postKey) ?? cardsByTitle.get(normalizedTitle(post.title))
  const elementor = extractElementorContent(
    meta.get('_elementor_data')?.at(-1) ?? ''
  )
  const thumbnailId = Number(meta.get('_thumbnail_id')?.at(-1) ?? 0)
  const contentText = cleanText(post.content)
  const elementorDetails = elementor.texts.filter(
    (text) =>
      text.toLocaleLowerCase('en') !== 'divider' &&
      !text.includes('[display_project_title]') &&
      !/^[-–—\s]*(details|head|descript)[-–—\s]*$/i.test(text)
  )
  const details = [...new Set(elementorDetails)].filter(Boolean)
  if (!details.length && contentText) {
    details.push(contentText.replace(/\[[^\]]+\]/g, '').trim())
  }
  const summary =
    details.find((text) => text.length >= 120) ??
    details.find((text) => text.length >= 60) ??
    details[0] ??
    ''
  const businessTypes =
    card?.businessTypes ?? splitPublicList(meta.get('business_type')?.at(-1) ?? '')
  const projectType = inferProjectType(post.title, businessTypes)

  return {
    legacyPostId: post.id,
    slug: post.slug,
    title: card?.title || post.title,
    year: card?.year ?? null,
    projectType,
    lat: null,
    lng: null,
    location: card?.location || cleanText(meta.get('location')?.at(-1) ?? ''),
    workTypes:
      card?.workTypes ?? splitPublicList(meta.get('type_of_work')?.at(-1) ?? ''),
    businessTypes,
    coverImage:
      card?.coverImage ||
      attachments.get(thumbnailId)?.url ||
      elementor.images[0] ||
      '',
    galleryImages: [
      ...new Set([
        ...elementor.images,
        ...(attachmentsByParent.get(post.id) ?? []),
      ]),
    ],
    summary,
    details,
    legacyUrl: card?.sourceUrl || `https://www.siamgroundwater.com/?project=${post.slug}`,
  }
})

const orderedProjects = []
const usedProjectIds = new Set()

for (const feature of mapFeatures) {
  const candidatesBySlug = projects.filter(
    (project) =>
      !usedProjectIds.has(project.legacyPostId) &&
      projectKeysMatch(feature.key, project.slug)
  )
  const candidatesByTitle = projects.filter(
    (project) =>
      !usedProjectIds.has(project.legacyPostId) &&
      normalizedTitle(project.title) === normalizedTitle(feature.title)
  )
  const project = candidatesBySlug[0] ?? candidatesByTitle[0]
  if (project && !usedProjectIds.has(project.legacyPostId)) {
    orderedProjects.push({
      ...project,
      lat: feature.lat,
      lng: feature.lng,
      projectType: inferProjectType(
        project.title,
        project.businessTypes,
        feature.projectType
      ),
    })
    usedProjectIds.add(project.legacyPostId)
  }
}

for (const project of projects) {
  if (!usedProjectIds.has(project.legacyPostId)) orderedProjects.push(project)
}

const numberedProjects = orderedProjects.map((project, index) => ({
  _id: index + 1,
  ...project,
}))

const pages = publishedPages.map((post) => {
  const meta = metaByPost.get(post.id) ?? new Map()
  const elementor = extractElementorContent(
    meta.get('_elementor_data')?.at(-1) ?? ''
  )
  const contentText = cleanText(post.content)

  return {
    legacyPostId: post.id,
    slug: post.slug,
    title: post.title,
    modified: post.modified,
    excerpt: post.excerpt,
    texts: [...new Set([contentText, ...elementor.texts])].filter(Boolean),
    images: elementor.images,
  }
})

fs.mkdirSync(outputRoot, { recursive: true })
const projectsOutput = path.join(outputRoot, 'wordpress-projects-recovered.json')
const pagesOutput = path.join(outputRoot, 'wordpress-pages-recovered.json')

fs.writeFileSync(projectsOutput, `${JSON.stringify(numberedProjects, null, 2)}\n`)
fs.writeFileSync(pagesOutput, `${JSON.stringify(pages, null, 2)}\n`)

const metaKeyCounts = new Map()
for (const project of publishedProjects) {
  for (const key of metaByPost.get(project.id)?.keys() ?? []) {
    metaKeyCounts.set(key, (metaKeyCounts.get(key) ?? 0) + 1)
  }
}

const summary = {
  sqlPath,
  postTypes: Object.fromEntries(
    [...postTypeCounts.entries()].sort((a, b) => b[1] - a[1])
  ),
  publishedProjects: publishedProjects.length,
  recoveredProjects: numberedProjects.length,
  mapFeatures: mapFeatures.length,
  uniqueProjectCards: uniqueCards.size,
  projectsWithCoordinates: numberedProjects.filter(
    (project) => project.lat !== null && project.lng !== null
  ).length,
  projectsWithYears: numberedProjects.filter((project) => project.year).length,
  projectsWithLocations: numberedProjects.filter((project) => project.location)
    .length,
  projectsWithDetails: numberedProjects.filter((project) => project.details.length)
    .length,
  projectsWithCoverImages: numberedProjects.filter((project) => project.coverImage)
    .length,
  publishedPages: pages.length,
  projectMetaKeys: Object.fromEntries(
    [...metaKeyCounts.entries()].sort((a, b) => b[1] - a[1])
  ),
  outputs: [projectsOutput, pagesOutput],
}

console.log(JSON.stringify(summary, null, 2))
