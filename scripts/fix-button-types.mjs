import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'src')
const exts = new Set(['.tsx', '.jsx'])

function shouldSkipDir(name) {
  return name === 'node_modules' || name === 'dist' || name === '.git'
}

function fixFile(filePath) {
  const input = fs.readFileSync(filePath, 'utf8')
  let out = ''
  let i = 0
  let changed = false

  while (i < input.length) {
    const idx = input.indexOf('<button', i)
    if (idx === -1) {
      out += input.slice(i)
      break
    }
    out += input.slice(i, idx)
    let j = idx
    let tag = ''
    while (j < input.length) {
      const ch = input[j]
      tag += ch
      j++
      if (ch === '>') break
    }
    if (!/\btype\s*=/.test(tag)) {
      tag = tag.replace('<button', '<button type="button"')
      changed = true
    }
    out += tag
    i = j
  }

  if (changed) {
    fs.writeFileSync(filePath, out, 'utf8')
  }
  return changed
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipDir(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p)
      continue
    }
    if (!exts.has(path.extname(ent.name))) continue
    fixFile(p)
  }
}

walk(root)

