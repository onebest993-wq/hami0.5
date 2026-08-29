import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function hasNc(src) {
  return /^\s*\/\/\s*@ts-nocheck\b/m.test(String(src).slice(0, 400));
}

function addNc(f) {
  const src = fs.readFileSync(f, 'utf8');
  if (hasNc(src)) return;
  fs.writeFileSync(f, `// @ts-nocheck\n${src}`);
}

function stripNc(f) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\n/);
  const idx = lines.findIndex((l) => /^\s*\/\/\s*@ts-nocheck\b/.test(l));
  if (idx < 0) return;
  lines.splice(idx, 1);
  if (lines[idx] === '') lines.splice(idx, 1);
  fs.writeFileSync(f, lines.join('\n'));
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

function errorFiles(tscOut) {
  const set = new Set();
  for (const raw of tscOut.split(/\n/)) {
    const line = raw.replace(/\r/g, '').replace(/^\uFEFF/, '');
    const m = line.match(/^(src[^:(]+)\(\d+,\d+\):\s*error\s+TS\d+/);
    if (m) set.add(m[1].replace(/\\/g, '/'));
  }
  return set;
}

const roots = [
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/execution',
];
const all = roots.flatMap((r) => walk(r));

const headHad = new Set();
const headMiss = new Set();
for (const f of all) {
  try {
    const head = execSync(`git show HEAD:${f}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (hasNc(head)) headHad.add(f);
    else headMiss.add(f);
  } catch {
    /* untracked — treat current nocheck as eligible */
  }
}

const baselineErr = errorFiles(runTsc());
const baselineCascade = [...headMiss].filter((f) => baselineErr.has(f));
console.log('BASELINE_CASCADE', baselineCascade.length);

// Candidates: currently have nocheck, lines 101..220, tracked headHad or untracked
const pool = all
  .filter((f) => hasNc(fs.readFileSync(f, 'utf8')))
  .map((f) => ({ f, lines: fs.readFileSync(f, 'utf8').split(/\n/).length }))
  .filter((x) => x.lines >= 101 && x.lines <= 220)
  .sort((a, b) => a.lines - b.lines)
  .map((x) => x.f)
  .slice(0, 36);

console.log('POOL', pool.length);

function isSafe(strippedSet) {
  const err = errorFiles(runTsc());
  const cascade = [...headMiss].filter((f) => err.has(f));
  const selfBad = [...strippedSet].filter((f) => err.has(f));
  return {
    ok: selfBad.length === 0 && cascade.length <= baselineCascade.length,
    cascade: cascade.length,
    selfBad,
  };
}

function bisect(files) {
  if (!files.length) return [];
  for (const f of files) stripNc(f);
  const r = isSafe(new Set(files));
  console.log('TEST', files.length, 'ok', r.ok, 'cascade', r.cascade, 'self', r.selfBad.length);
  if (r.ok) return files;
  for (const f of files) addNc(f);
  if (files.length === 1) return [];
  const mid = Math.ceil(files.length / 2);
  return [...bisect(files.slice(0, mid)), ...bisect(files.slice(mid))];
}

const removed = bisect(pool);
console.log(JSON.stringify({ removed: removed.length, remaining: all.filter((f) => hasNc(fs.readFileSync(f, 'utf8'))).length }, null, 2));
removed.forEach((f) => console.log('REMOVED', f));
