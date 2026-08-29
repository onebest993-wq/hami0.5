import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const roots = [
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/execution',
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function findNocheckLine(src) {
  const lines = src.split(/\n/);
  const idx = lines.findIndex((l) => /^\s*\/\/\s*@ts-nocheck\b/.test(l));
  return { lines, idx };
}

function hasNocheck(f) {
  return findNocheckLine(fs.readFileSync(f, 'utf8')).idx >= 0;
}

function stripNocheck(src) {
  const { lines, idx } = findNocheckLine(src);
  if (idx < 0) return src;
  lines.splice(idx, 1);
  if (lines[idx] === '') lines.splice(idx, 1);
  return lines.join('\n');
}

function runTsc() {
  try {
    return execSync('npx tsc --noEmit --pretty false 2>&1', {
      encoding: 'utf8',
      maxBuffer: 80 * 1024 * 1024,
    });
  } catch (e) {
    return String(e.stdout || '') + String(e.stderr || '');
  }
}

function errorFingerprints(tscOut) {
  const set = new Set();
  for (const line of tscOut.split(/\n/)) {
    const m = line.match(/^(src[^:(]+)\((\d+),\d+\):\s+error\s+(TS\d+):\s*(.*)$/);
    if (m) {
      const file = m[1].replace(/\\/g, '/');
      set.add(`${file}|${m[2]}|${m[3]}|${m[4]}`);
    }
  }
  return set;
}

function errorFilesFromFingerprints(fps) {
  return new Set([...fps].map((fp) => fp.split('|')[0]));
}

const maxLines = Number(process.argv[2] || 250);
const all = roots.flatMap((r) => walk(r));
const nocheck = all.filter(hasNocheck);
console.log('BASELINE_NOCHECK', nocheck.length);

console.log('Running baseline tsc...');
const t0 = Date.now();
const baselineOut = runTsc();
console.log('BASELINE_TSC_MS', Date.now() - t0);
const baselineFp = errorFingerprints(baselineOut);
console.log('BASELINE_ERRORS', baselineFp.size);

const ranked = nocheck
  .map((f) => ({ f, lines: fs.readFileSync(f, 'utf8').split(/\n/).length }))
  .sort((a, b) => a.lines - b.lines);

const candidates = ranked.filter((x) => x.lines <= maxLines).map((x) => x.f);
console.log('CANDIDATES_LE_' + maxLines, candidates.length);

const backups = new Map();
for (const f of candidates) {
  const src = fs.readFileSync(f, 'utf8');
  backups.set(f, src);
  const next = stripNocheck(src);
  if (next !== src) fs.writeFileSync(f, next);
}

console.log('Stripped candidates; running tsc...');
const t1 = Date.now();
let out = runTsc();
console.log('STRIPPED_TSC_MS', Date.now() - t1);

let currentFp = errorFingerprints(out);
const stillStripped = new Set(candidates);
const reverted = [];

function newErrors(fp) {
  const neu = new Set();
  for (const e of fp) if (!baselineFp.has(e)) neu.add(e);
  return neu;
}

{
  const neu = newErrors(currentFp);
  const badFiles = errorFilesFromFingerprints(neu);
  for (const f of [...stillStripped]) {
    if (badFiles.has(f)) {
      fs.writeFileSync(f, backups.get(f));
      stillStripped.delete(f);
      reverted.push(f);
    }
  }
  console.log('PASS1_REVERTED_DIRECT', reverted.length, 'still', stillStripped.size);
}

function tscAfterCurrentState() {
  return errorFingerprints(runTsc());
}

currentFp = tscAfterCurrentState();
let neu = newErrors(currentFp);
console.log('AFTER_PASS1_NEW_ERRORS', neu.size);

// If cascade remains, revert remaining stripped one-by-one largest-first until clean
if (neu.size > 0 && stillStripped.size > 0) {
  const order = [...stillStripped].sort(
    (a, b) => backups.get(b).split(/\n/).length - backups.get(a).split(/\n/).length,
  );
  for (const f of order) {
    if (neu.size === 0) break;
    fs.writeFileSync(f, backups.get(f));
    stillStripped.delete(f);
    reverted.push(f);
    currentFp = tscAfterCurrentState();
    const nextNeu = newErrors(currentFp);
    console.log('TRY_REVERT', path.basename(f), 'newErr', nextNeu.size);
    if (nextNeu.size < neu.size) {
      neu = nextNeu;
    } else {
      // didn't help — re-strip and keep looking
      fs.writeFileSync(f, stripNocheck(backups.get(f)));
      stillStripped.add(f);
      reverted.pop();
      currentFp = tscAfterCurrentState();
      neu = newErrors(currentFp);
    }
  }
}

const removed = [...stillStripped];
console.log('REMOVED', removed.length);
console.log('REVERTED', reverted.length);
removed.forEach((f) => console.log('OK', f));
reverted.forEach((f) => console.log('NO', f));

const remaining = roots.flatMap((r) => walk(r)).filter(hasNocheck);
console.log('REMAINING_NOCHECK', remaining.length);

const finalFp = tscAfterCurrentState();
const finalNew = newErrors(finalFp);
console.log('FINAL_NEW_ERRORS', finalNew.size);
if (finalNew.size > 0) {
  console.log('FAIL_CLOSED');
  for (const f of removed) fs.writeFileSync(f, backups.get(f));
  [...finalNew].slice(0, 15).forEach((e) => console.log(e));
}
