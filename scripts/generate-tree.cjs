// scripts/generate-tree.js
const fs = require('fs')
const path = require('path')

const IGNORE = ['node_modules', '.git', '.next']
const MAX_DEPTH = 3

function generateTree(dir, depth = 0) {
  if (depth > MAX_DEPTH) return ''

  const items = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => !IGNORE.includes(item.name))

  let output = ''
  for (const item of items) {
    const prefix = '  '.repeat(depth) + (item.isDirectory() ? '📁 ' : '📄 ')
    output += `${prefix}${item.name}\n`

    if (item.isDirectory()) {
      output += generateTree(path.join(dir, item.name), depth + 1)
    }
  }
  return output
}

const projectRoot = path.resolve(__dirname, '..') // one level up from /scripts
const tree = generateTree(projectRoot)

const outputPath = path.join(projectRoot, 'scripts/file-structure.txt')
fs.writeFileSync(outputPath, tree, 'utf-8')

console.log(`✅ File structure saved to ${outputPath}`)
