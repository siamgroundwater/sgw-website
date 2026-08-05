// scripts/convertProjectsToNewShape.js
// Node script to convert old GeoJSON-style projects into new array shape

const fs = require('fs')
const path = require('path')

// 🔧 Adjust these if your paths are different
const INPUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'app',
  '(site)',
  'home',
  'projects-old.json'
)

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'app',
  '(site)',
  'home',
  'projects.json' // <= new file (simple array)
)

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ INPUT_PATH not found:', INPUT_PATH)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))

  const features = Array.isArray(raw.features) ? raw.features : []

  const projects = features.map((feature, index) => {
    const coords = feature?.geometry?.coordinates || [0, 0]
    const props = feature?.properties || {}

    const lng = typeof coords[0] === 'number' ? coords[0] : 0
    const lat = typeof coords[1] === 'number' ? coords[1] : 0

    const title =
      typeof props.title === 'string' && props.title.trim().length > 0
        ? props.title.trim()
        : `โครงการหมายเลข ${index + 1}`

    /** @type {{
     *  _id: number;
     *  title: string;
     *  year: number;
     *  logo: string;
     *  projectType: string;
     *  lat: number;
     *  lng: number;
     *  coverImage: string;
     *  category: string[];
     *  contents: { image: string; text: string }[];
     * }} */
    const project = {
      _id: index + 1,
      title,
      year: null,
      logo: '/images/logo/logo_SGW_white.svg',
      projectType:
        typeof props.type === 'string' && props.type.trim().length > 0
          ? props.type.trim()
          : 'project',
      lat,
      lng,
      coverImage: '/images/logo/logo_SGW_white.svg',
      category: [],
      contents: [],
    }

    return project
  })

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(projects, null, 2), 'utf8')
  console.log(`✅ Converted ${projects.length} projects -> ${OUTPUT_PATH}`)
}

main()
