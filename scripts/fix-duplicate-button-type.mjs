import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'src')
const exts = new Set(['.tsx', '.jsx'])

function shouldSkipDir(name) {
  return name === 'node_modules' || name === 'dist' || name === '.git'
}

function pickKeep(matches) {
  const submitIdx = matches.findIndex((m) => /submit/u.test(m.value))
  if (submitIdx !== -1) return submitIdx
  const resetIdx = matches.findIndex((m) => /reset/u.test(m.value))
  if (resetIdx !== -1) return resetIdx
  return 0
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

    const re = /\s+\btype\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/gu
    const matches = []
    let m
    while ((m = re.exec(tag))) {
      matches.push({ start: m.index, end: re.lastIndex, raw: m[0], value: m[0] })
    }

    if (matches.length > 1) {
      const keepIdx = pickKeep(matches)
      for (let k = matches.length - 1; k >= 0; k--) {
        if (k === keepIdx) continue
        const seg = matches[k]
        tag = tag.slice(0, seg.start) + tag.slice(seg.end)
      }
      changed = true
    }

    out += tag
    i = j
  }

  if (changed) fs.writeFileSync(filePath, out, 'utf8')
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

