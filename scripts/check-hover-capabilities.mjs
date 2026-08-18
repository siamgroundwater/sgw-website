import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'

const root = path.resolve('src')
const write = process.argv.includes('--write')
const capabilityQuery = '(hover: hover) and (pointer: fine)'

async function listCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listCssFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.css') ? [fullPath] : []
  }))
  return files.flat()
}

function isCapabilityGated(rule) {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('(hover: hover)') && parent.params.includes('(pointer: fine)')) return true
    parent = parent.parent
  }
  return false
}

function gateHoverRule(rule) {
  const hoverSelectors = rule.selectors.filter((selector) => selector.includes(':hover'))
  const otherSelectors = rule.selectors.filter((selector) => !selector.includes(':hover'))
  const media = postcss.atRule({ name: 'media', params: capabilityQuery })
  media.append(rule.clone({ selector: hoverSelectors.join(',\n') }))

  if (otherSelectors.length) {
    rule.selector = otherSelectors.join(',\n')
    rule.after(media)
  } else {
    rule.replaceWith(media)
  }
}

const violations = []
let changedFiles = 0

for (const filePath of await listCssFiles(root)) {
  const source = await readFile(filePath, 'utf8')
  const stylesheet = postcss.parse(source, { from: filePath })
  const rules = []
  stylesheet.walkRules((rule) => rules.push(rule))

  for (const rule of rules) {
    if (!rule.selector.includes(':hover') || isCapabilityGated(rule)) continue
    if (write) gateHoverRule(rule)
    else violations.push(`${path.relative(process.cwd(), filePath)}: ${rule.selector.replace(/\s+/g, ' ')}`)
  }

  if (write && stylesheet.toString() !== source) {
    await writeFile(filePath, stylesheet.toString(), 'utf8')
    changedFiles += 1
  }
}

async function listScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listScriptFiles(fullPath)
    return entry.isFile() && /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : []
  }))
  return files.flat()
}

for (const filePath of await listScriptFiles(root)) {
  const source = await readFile(filePath, 'utf8')
  for (const match of source.matchAll(/\bonMouse(?:Enter|Leave|Over|Out)\s*=/g)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length
    violations.push(`${path.relative(process.cwd(), filePath)}:${line}: use pointer events guarded by pointerType instead of mouse hover handlers`)
  }
}

if (write) {
  console.log(`Protected hover styles in ${changedFiles} stylesheet${changedFiles === 1 ? '' : 's'}.`)
}

if (violations.length) {
  console.error('Hover behavior must be limited to precise pointing devices:\n' + violations.join('\n'))
  process.exitCode = 1
} else if (!write) {
  console.log('All hover styles are limited to precise pointing devices.')
}
