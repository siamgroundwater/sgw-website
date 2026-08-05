import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectFile = path.resolve(
  process.argv[2] ?? 'src/data/wordpress-projects-recovered.json'
)
const imageDirectory = path.resolve(
  process.argv[3] ?? 'public/images/projects/wordpress'
)
const projectConcurrency = 3
const galleryConcurrencyPerProject = 4

const projects = JSON.parse(await fs.readFile(projectFile, 'utf8'))
await fs.mkdir(imageDirectory, { recursive: true })

function isImageUrl(sourceUrl) {
  try {
    return /\.(?:jpe?g|png|webp|gif)$/i.test(new URL(sourceUrl).pathname)
  } catch {
    return false
  }
}

function extensionFor(sourceUrl) {
  try {
    const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)
      ? extension
      : '.jpg'
  } catch {
    return '.jpg'
  }
}

function sourceUrlForDownload(sourceUrl) {
  return sourceUrl.replace(
    /^https:\/\/www\.siamgroundwater\.com/i,
    'http://www.siamgroundwater.com'
  )
}

function canonicalImageKey(sourceUrl) {
  try {
    return decodeURIComponent(new URL(sourceUrl).pathname)
      .toLocaleLowerCase('en')
      .replace(/-\d+x\d+(?=\.[^.]+$)/, '')
      .replace(/-scaled(?=\.[^.]+$)/, '')
      .replace(/-e\d+(?=\.[^.]+$)/, '')
  } catch {
    return sourceUrl.toLocaleLowerCase('en')
  }
}

function selectGallerySources(project) {
  const selectedSources = []
  const usedImageKeys = new Set()

  for (const sourceUrl of [project.coverImage, ...project.galleryImages]) {
    if (!sourceUrl || !isImageUrl(sourceUrl)) continue
    const imageKey = canonicalImageKey(sourceUrl)
    if (usedImageKeys.has(imageKey)) continue
    usedImageKeys.add(imageKey)
    selectedSources.push(sourceUrl)
  }

  return selectedSources
}

async function fetchImage(sourceUrl) {
  const response = await fetch(sourceUrlForDownload(sourceUrl), {
    headers: { 'user-agent': 'SiamGroundwaterContentRecovery/1.0' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content type: ${contentType || 'unknown'}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 256) throw new Error('Downloaded file is unexpectedly small')
  return bytes
}

async function downloadProjectCover(project) {
  if (!project.coverImage) return { status: 'missing-source', project }

  const filename = `${String(project._id).padStart(3, '0')}-${project.legacyPostId}${extensionFor(project.coverImage)}`
  const absolutePath = path.join(imageDirectory, filename)
  const publicPath = `/images/projects/wordpress/${filename}`

  try {
    const existing = await fs.stat(absolutePath)
    if (existing.size > 0) {
      project.localCoverImage = publicPath
      return { status: 'cover-existing', project }
    }
  } catch {
    // Download files that do not exist yet.
  }

  try {
    const bytes = await fetchImage(project.coverImage)
    await fs.writeFile(absolutePath, bytes)
    project.localCoverImage = publicPath
    return { status: 'cover-downloaded', project, bytes: bytes.length }
  } catch (error) {
    return {
      status: 'cover-failed',
      project,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function downloadGalleryImage(project, sourceUrl, slideIndex) {
  const projectDirectory = path.join(
    imageDirectory,
    'gallery',
    String(project._id).padStart(3, '0')
  )
  const filename = `${String(slideIndex).padStart(2, '0')}.webp`
  const absolutePath = path.join(projectDirectory, filename)
  const publicPath = `/images/projects/wordpress/gallery/${String(project._id).padStart(3, '0')}/${filename}`
  await fs.mkdir(projectDirectory, { recursive: true })

  try {
    const existing = await fs.stat(absolutePath)
    if (existing.size > 0) {
      return { status: 'gallery-existing', publicPath, project }
    }
  } catch {
    // Download files that do not exist yet.
  }

  try {
    const bytes = await fetchImage(sourceUrl)
    await sharp(bytes)
      .rotate()
      .resize({
        width: 1600,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(absolutePath)
    return { status: 'gallery-downloaded', publicPath, project }
  } catch (error) {
    return {
      status: 'gallery-failed',
      project,
      error: error instanceof Error ? error.message : String(error),
      sourceUrl,
    }
  }
}

async function recoverProjectImages(project) {
  const results = [await downloadProjectCover(project)]
  const selectedSources = selectGallerySources(project)
  const additionalSources = selectedSources.slice(1)
  const galleryResults = []
  for (
    let index = 0;
    index < additionalSources.length;
    index += galleryConcurrencyPerProject
  ) {
    const sourceBatch = additionalSources.slice(
      index,
      index + galleryConcurrencyPerProject
    )
    galleryResults.push(
      ...(await Promise.all(
        sourceBatch.map((sourceUrl, batchIndex) =>
          downloadGalleryImage(project, sourceUrl, index + batchIndex + 2)
        )
      ))
    )
  }
  results.push(...galleryResults)

  project.localGalleryImages = [
    project.localCoverImage,
    ...galleryResults
      .filter((result) => result.publicPath)
      .map((result) => result.publicPath),
  ].filter(Boolean)

  return results
}

const results = []
for (let index = 0; index < projects.length; index += projectConcurrency) {
  const batch = projects.slice(index, index + projectConcurrency)
  const batchResults = await Promise.all(batch.map(recoverProjectImages))
  results.push(...batchResults.flat())
}

await fs.writeFile(projectFile, `${JSON.stringify(projects, null, 2)}\n`)

const summary = results.reduce(
  (counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1
    return counts
  },
  {}
)

console.log(
  JSON.stringify(
    {
      recoveredDistinctImages: projects.reduce(
        (total, project) => total + project.localGalleryImages.length,
        0
      ),
      summary,
      projectsWithMultipleImages: projects.filter(
        (project) => project.localGalleryImages.length > 1
      ).length,
      failed: results
        .filter((item) => item.status.endsWith('failed'))
        .map((item) => ({
          id: item.project._id,
          title: item.project.title,
          sourceUrl: item.sourceUrl,
          error: item.error,
        })),
    },
    null,
    2
  )
)
