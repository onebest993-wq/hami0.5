import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC_APP = join(ROOT, 'src', 'app');
const OUT_DIR = join(ROOT, '.audit', 'button-full-inventory');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const OUTFILE = join(OUT_DIR, 'code-quality-hits.csv');

const hits = [];

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.(tsx?)$/.test(e.name)) files.push(p);
  }
  return files;
}

const files = walk(SRC_APP).filter(f => !f.match(/(\\|\/)(__tests__|tests)(\\|\/)/) && !f.match(/\.(test|spec)\./));
let scanned = 0;
for (const f of files) {
  scanned++;
  const text = readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;

    // 1. throw new Error / throw createError / throw LSError without [domain:opid] prefix
    const throwMatch = rawLine.match(/\bthrow\s+(new\s+)?(Error|TypeError|RangeError|EvalError|SyntaxError|URIError|ReferenceError|createError|LSError|ValidationError)\s*\(\s*['"`]([^'"`]{0,300})/);
    if (throwMatch) {
      const msg = (throwMatch[3] || '').trim();
      const hasPrefix = /^\[domain_[a-z0-9_]+:[a-z0-9_-]+\]\s*/.test(msg) || /^\[services_[a-z0-9_]+:[a-z0-9_-]+\]\s*/.test(msg) || /^\[api_[a-z0-9_]+:[a-z0-9_-]+\]\s*/.test(msg) || /^\[app_[a-z0-9_]+:[a-z0-9_-]+\]\s*/.test(msg);
      // skip pure arabic-only messages (i18n WONTFIX per div-full rule)
      const hasArabic = /[\u0600-\u06FF]/.test(msg);
      if (!hasPrefix && !hasArabic && msg.length > 0) {
        hits.push({
          file: relative(ROOT, f), line: lineNo, col: (throwMatch.index || 0) + 1,
          category: 'throw-prefix-missing',
          snippet: msg.slice(0, 160).replace(/"/g, '""')
        });
      }
    }

    // 2. console.log / console.warn / console.error (non-test) in prod files (not logger wrappers)
    const consoleMatch = rawLine.match(/\bconsole\s*\.\s*(log|warn|error|info|debug|trace)\s*\(/);
    if (consoleMatch) {
      const fname = f.replace(/\\/g, '/');
      const allowedConsole = /(logger|log-service|debug-?panel|sentry|dev-?)/i.test(fname);
      if (!allowedConsole) {
        hits.push({
          file: relative(ROOT, f), line: lineNo, col: (consoleMatch.index || 0) + 1,
          category: 'console-prod-use',
          snippet: rawLine.trim().slice(0, 160).replace(/"/g, '""')
        });
      }
    }

    // 3. inline `: any` typed handler prop in TSX (rough)
    //    skip - keep hits manageable; focus throw + console
  });
}

const rows = [['file', 'line', 'col', 'category', 'message_snippet'].join(',')];
for (const h of hits) rows.push([h.file, h.line, h.col, h.category, `"${h.snippet}"`].join(','));
writeFileSync(OUTFILE, rows.join('\n') + '\n');

console.log(`[button-01-quality] scanned=${scanned} hits=${hits.length}`);
console.log(`[button-01-quality] throw-prefix=${hits.filter(h=>h.category==='throw-prefix-missing').length}`);
console.log(`[button-01-quality] console-prod=${hits.filter(h=>h.category==='console-prod-use').length}`);
console.log(`[button-01-quality] out=${relative(ROOT, OUTFILE)}`);
process.exit(0);
