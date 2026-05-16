import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'src')
const exts = new Set(['.tsx', '.ts', '.jsx', '.js'])

const results = []

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p)
      continue
    }
    if (!exts.has(path.extname(ent.name))) continue
    const text = fs.readFileSync(p, 'utf8')
    let i = 0
    let line = 1
    for (;;) {
      const idx = text.indexOf('<button', i)
      if (idx === -1) break
      line += text.slice(i, idx).split('\n').length - 1
      let j = idx
      let tag = ''
      while (j < text.length) {
        const ch = text[j]
        tag += ch
        j++
        if (ch === '>') break
      }
      const hasType = /\btype\s*=/.test(tag)
      if (!hasType) results.push({ file: p, line, tag: tag.trim().replace(/\s+/g, ' ').slice(0, 160) })
      i = j
    }
  }
}

walk(root)

results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
for (const r of results) {
  process.stdout.write(`${r.file}:${r.line}  ${r.tag}\n`)
}
process.stdout.write(`\nTOTAL_MISSING_TYPE=${results.length}\n`)

