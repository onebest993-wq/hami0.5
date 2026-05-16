/**
 * Static scan of src/ for client-visible security footguns.
 * Exit 1 on critical findings (e.g. service_role in app code).
 * Warnings for patterns that need human review.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const CRITICAL_PATTERNS = [
  { re: /service_role/i, name: 'Supabase service_role (must never ship to client)' },
  { re: /\bsk_live_[a-zA-Z0-9]+/i, name: 'Stripe-style secret key' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, name: 'AWS access key id pattern' },
]

const WARNING_PATTERNS = [
  { re: /\beval\s*\(/, name: 'eval(' },
  { re: /new\s+Function\s*\(/, name: 'new Function(' },
  { re: /\.innerHTML\s*=/, name: '.innerHTML =' },
  { re: /dangerouslySetInnerHTML/, name: 'dangerouslySetInnerHTML' },
  { re: /document\.write\s*\(/, name: 'document.write(' },
]

/** @type {string[]} */
const critical = []
/** @type {string[]} */
const warnings = []

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === 'dist') continue
      walk(full, out)
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name.name)) {
      out.push(full)
    }
  }
  return out
}

function scanFile(filePath) {
  let text
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return
  }
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  for (const { re, name } of CRITICAL_PATTERNS) {
    if (re.test(text)) critical.push(`${rel}: ${name}`)
  }
  for (const { re, name } of WARNING_PATTERNS) {
    if (re.test(text)) warnings.push(`${rel}: ${name}`)
  }
}

const files = walk(SRC)
for (const f of files) scanFile(f)

console.log(`security-audit: scanned ${files.length} files under src/\n`)

if (warnings.length) {
  console.log('Warnings (review manually — not all are vulnerabilities):\n')
  for (const w of [...new Set(warnings)].sort()) console.log('  ', w)
  console.log('')
}

if (critical.length) {
  console.error('CRITICAL:\n')
  for (const c of [...new Set(critical)].sort()) console.error('  ', c)
  process.exit(1)
}

console.log('No critical patterns found.')
process.exit(0)
