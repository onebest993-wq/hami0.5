import { readFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC_APP = join(ROOT, 'src', 'app');
const OUT_DIR = join(ROOT, '.audit', 'button-full-inventory');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const BASELINE_FILES = 1569; // TSX prod (±10 ok)
const BASELINE_B3 = 4;
const BASELINE_ROLE = 13;
const BASELINE_RADIX_NESTED = 33;

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

const files = walk(SRC_APP).filter(f => !f.match(/(\\|\/)(__tests__|tests)(\\|\/)/) && !f.match(/\.(test|spec)\./));
const deltaFiles = Math.abs(files.length - BASELINE_FILES);
console.log(`[button-integrity] files=${files.length} baseline=${BASELINE_FILES} delta=${deltaFiles}`);
if (deltaFiles > 50) {
  console.error(`[button-integrity] DRIFT files: ${files.length} vs ${BASELINE_FILES} (Δ=${deltaFiles} > 50) FAIL`);
  process.exit(1);
}

let b3Count = 0;   // no-type buttons
let roleCount = 0; // role=button non-native button
let nestedViolations = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  // B3: <button without type attribute (multiline-aware scan 200 lines each in memory)
  const re = /<button\b(?![^>]*?\btype\s*=)[\s\S]*?>/gm;
  let m;
  while ((m = re.exec(text)) !== null) { b3Count++; }
  // role=button on non-<button
  const re2 = /<\s*([A-Za-z][A-Za-z0-9.]*)\b[\s\S]*?role\s*=\s*['"]button['"][\s\S]*?>/gm;
  let m2;
  while ((m2 = re2.exec(text)) !== null) {
    const tag = m2[1].toLowerCase();
    if (tag !== 'button') roleCount++;
  }
  // nested button
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const b1 = lines[i].indexOf('<button');
    if (b1 < 0) continue;
    // look for second <button before next unbalanced >
    let depth = 0;
    for (let j = b1; j < lines[i].length; j++) {
      const c = lines[i][j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) { break; }
    }
    const rest = lines[i].slice(b1 + 7);
    if (/<button\b/.test(rest) || /<\/button\b.*?<button\b/.test(lines.slice(i, i + 8).join('\n'))) {
      // Radix asChild?
      const radix = /asChild/.test(lines.slice(Math.max(0, i - 3), i + 8).join('\n'));
      nestedViolations.push({ file: relative(ROOT, f), line: (i + 1), radix });
    }
  }
}

const radixNested = nestedViolations.filter(n => n.radix).length;
const newNested = nestedViolations.length - BASELINE_RADIX_NESTED;
console.log(`[button-integrity] B3 no-type buttons: current=${b3Count} baseline=${BASELINE_B3}`);
console.log(`[button-integrity] role=button non-native: current=${roleCount} baseline=${BASELINE_ROLE}`);
console.log(`[button-integrity] nested-button total=${nestedViolations.length} radix-asChild=${radixNested} NEW=${newNested}`);

// Write detail CSV for nested
const csvRows = [['file','line','radix_asChild_context'].join(',')];
for (const n of nestedViolations) csvRows.push([`"${n.file}"`, n.line, n.radix ? '1' : '0'].join(','));
writeFileSync(join(OUT_DIR, 'nested-button-violations.csv'), csvRows.join('\n') + '\n');

// Write integrity report text
writeFileSync(join(OUT_DIR, 'final-integrity-audit.txt'),
  '=== BUTTON-FULL FINAL INTEGRITY ===\n' +
  `Date: ${new Date().toISOString()}\n` +
  `Files scanned: ${files.length}\n` +
  `B3 (no-type buttons): ${b3Count} (TARGET 0)\n` +
  `role=button non-native: ${roleCount} (TARGET 13 - N_swapped)\n` +
  `Nested button total: ${nestedViolations.length} (33 Radix preexisting OK)\n` +
  `  Radix-asChild: ${radixNested}  NEW violations: ${newNested}\n`
);

// Exit rules
if (b3Count !== 0 || newNested > 0) {
  if (b3Count === 0 && newNested === 0 && radixNested === BASELINE_RADIX_NESTED) {
    console.log('[button-integrity] EXIT 0 ALL PASS');
    process.exit(0);
  } else if (newNested === 0 && radixNested === BASELINE_RADIX_NESTED && b3Count === 0) {
    console.log('[button-integrity] EXIT 0 (B3 0 + role ' + roleCount + ')');
    process.exit(0);
  } else if (newNested === 0 && b3Count === 0) {
    console.log('[button-integrity] EXIT 2 (only Radix 33 preexisting)');
    process.exit(2);
  }
  console.error('[button-integrity] FAIL: B3=' + b3Count + ' NEW nested=' + newNested);
  process.exit(1);
}
console.log('[button-integrity] EXIT 0 B3=0');
process.exit(0);
