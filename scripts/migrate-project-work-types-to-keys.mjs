import { MongoClient } from 'mongodb'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Environment variables may already be supplied by the host.
}

if (!process.env.MONGODB_URI) {
  throw new Error('Missing MONGODB_URI. Add it to .env.local first.')
}

const apply = process.argv.includes('--apply')
const workTypeLabels = {
  'groundwater-survey': ['งานสำรวจน้ำบาดาล', 'Groundwater survey'],
  'groundwater-well-drilling': ['งานเจาะบ่อน้ำบาดาล', 'Groundwater well drilling'],
  'groundwater-project-remediation': ['งานแก้ไขโครงการที่มีปัญหา', 'Problem project remediation'],
  'groundwater-well-maintenance': ['งานซ่อมบำรุง', 'Maintenance work'],
  'mineral-water': ['งานน้ำแร่', 'Mineral water work'],
  'island-work': ['งานบนเกาะ', 'Island work'],
  other: ['งานอื่นๆ', 'Other work'],
}
const validWorkTypes = new Set(Object.keys(workTypeLabels))
const aliases = new Map()
for (const [key, labels] of Object.entries(workTypeLabels)) {
  aliases.set(key, key)
  for (const label of labels) aliases.set(label.toLocaleLowerCase('en'), key)
}

for (const [value, key] of Object.entries({
  'dewatering-well-construction': 'other',
  'groundwater-use-capacity-adjustment': 'other',
  'mineral-water-survey': 'mineral-water',
  'mineral-water-well-drilling': 'mineral-water',
  'งานขุดเจาะก่อสร้างบ่อสูบลดระดับน้ำ': 'other',
  'งานแก้ไขปริมาณการใช้น้ำบาดาล': 'other',
  'งานเจาะบ่อน้ำแร่คุณภาพดี': 'mineral-water',
  'งานสำรวจศึกษาน้ำแร่': 'mineral-water',
  'งานแก้ไขโครงการที่เจาะน้ำบาดาลแล้วมีปัญหา': 'groundwater-project-remediation',
  'งานซ่อมบำรุงรักษาบ่อน้ำบาดาล': 'groundwater-well-maintenance',
})) aliases.set(value.toLocaleLowerCase('en'), key)

const islandProjectSlugs = new Set([
  'บริษัท-มิวกี้-เบย์-จํากัด',
  'บริษัท-มิวกี้-เบย์-จำกัด',
])

function normalizeWorkTypes(value, slug) {
  const normalized = []
  const unknown = []
  for (const item of Array.isArray(value) ? value : []) {
    const clean = typeof item === 'string' ? item.trim() : ''
    const key = aliases.get(clean.toLocaleLowerCase('en'))
    if (!key) {
      if (clean) unknown.push(clean)
      continue
    }
    if (!normalized.includes(key)) normalized.push(key)
  }
  if (islandProjectSlugs.has(String(slug || '').normalize('NFKC')) && !normalized.includes('island-work')) {
    normalized.push('island-work')
  }
  return { normalized, unknown }
}

function sameArray(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((item, index) => item === right[index])
}

const dbName = process.env.MONGODB_DB || 'siamgroundwater'
const client = new MongoClient(process.env.MONGODB_URI, {
  appName: 'siamgroundwater-project-work-type-key-migration',
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 10_000,
})

await client.connect()

try {
  const db = client.db(dbName)
  const projects = db.collection('cmsProjects')
  const revisions = db.collection('cmsProjectRevisions')
  const projectRows = await projects.find({}, { projection: {
    slug: 1,
    workTypes: 1,
    'translations.en.workTypes': 1,
    'draft.workTypes': 1,
    'draft.slug': 1,
    'draft.translations.en.workTypes': 1,
  } }).toArray()
  const revisionRows = await revisions.find({}, { projection: {
    'content.slug': 1,
    'content.workTypes': 1,
    'content.translations.en.workTypes': 1,
  } }).toArray()
  const projectOperations = []
  const revisionOperations = []
  const unknownValues = new Set()

  for (const row of projectRows) {
    const published = normalizeWorkTypes(row.workTypes, row.slug)
    const draft = row.draft ? normalizeWorkTypes(row.draft.workTypes, row.draft.slug) : null
    published.unknown.forEach((value) => unknownValues.add(value))
    draft?.unknown.forEach((value) => unknownValues.add(value))
    const set = {}
    const unset = {}
    if (!sameArray(row.workTypes, published.normalized)) set.workTypes = published.normalized
    if (draft && !sameArray(row.draft.workTypes, draft.normalized)) set['draft.workTypes'] = draft.normalized
    if (row.translations?.en && Object.hasOwn(row.translations.en, 'workTypes')) unset['translations.en.workTypes'] = ''
    if (row.draft?.translations?.en && Object.hasOwn(row.draft.translations.en, 'workTypes')) unset['draft.translations.en.workTypes'] = ''
    const update = {}
    if (Object.keys(set).length) update.$set = set
    if (Object.keys(unset).length) update.$unset = unset
    if (Object.keys(update).length) projectOperations.push({ updateOne: { filter: { _id: row._id }, update } })
  }

  for (const row of revisionRows) {
    const result = normalizeWorkTypes(row.content?.workTypes, row.content?.slug)
    result.unknown.forEach((value) => unknownValues.add(value))
    const set = {}
    const unset = {}
    if (!sameArray(row.content?.workTypes, result.normalized)) set['content.workTypes'] = result.normalized
    if (row.content?.translations?.en && Object.hasOwn(row.content.translations.en, 'workTypes')) unset['content.translations.en.workTypes'] = ''
    const update = {}
    if (Object.keys(set).length) update.$set = set
    if (Object.keys(unset).length) update.$unset = unset
    if (Object.keys(update).length) revisionOperations.push({ updateOne: { filter: { _id: row._id }, update } })
  }

  console.log(`Database: ${dbName}`)
  console.log(`Projects to update: ${projectOperations.length}; revisions to update: ${revisionOperations.length}.`)
  console.log(`Unmapped work type values: ${unknownValues.size}.`)
  if (unknownValues.size) console.log([...unknownValues].sort().map((value) => `- ${value}`).join('\n'))

  if (!apply) {
    console.log('Dry run complete. Run with --apply after confirming there are no unmapped values.')
  } else if (unknownValues.size) {
    console.error('Migration stopped without writing because some values are not mapped.')
    process.exitCode = 1
  } else {
    if (projectOperations.length) await projects.bulkWrite(projectOperations, { ordered: true })
    if (revisionOperations.length) await revisions.bulkWrite(revisionOperations, { ordered: true })

    const invalidProjects = await projects.countDocuments({ workTypes: { $elemMatch: { $nin: [...validWorkTypes] } } })
    const invalidDrafts = await projects.countDocuments({ 'draft.workTypes': { $elemMatch: { $nin: [...validWorkTypes] } } })
    const invalidRevisions = await revisions.countDocuments({ 'content.workTypes': { $elemMatch: { $nin: [...validWorkTypes] } } })
    const translatedProjects = await projects.countDocuments({ $or: [
      { 'translations.en.workTypes': { $exists: true } },
      { 'draft.translations.en.workTypes': { $exists: true } },
    ] })
    const translatedRevisions = await revisions.countDocuments({ 'content.translations.en.workTypes': { $exists: true } })
    console.log(`Remaining invalid values: ${invalidProjects} projects, ${invalidDrafts} drafts, ${invalidRevisions} revisions.`)
    console.log(`Remaining translated work type arrays: ${translatedProjects} projects, ${translatedRevisions} revisions.`)
    if (invalidProjects || invalidDrafts || invalidRevisions || translatedProjects || translatedRevisions) process.exitCode = 1
  }
} finally {
  await client.close()
}
