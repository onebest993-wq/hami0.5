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
    /* untracked */
  }
}

function cascadeCount() {
  const err = errorFiles(runTsc());
  return [...headMiss].filter((f) => err.has(f));
}

// Candidates currently WITHOUT nocheck that HEAD had
let suspects = [...headHad]
  .filter((f) => !hasNc(fs.readFileSync(f, 'utf8')))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);

console.log('SUSPECTS', suspects.length);
let cascade = cascadeCount();
console.log('INITIAL_CASCADE', cascade.length);

const restored = [];

// Prefer restoring larger files first (more likely to export bad types)
while (cascade.length > 0 && suspects.length > 0) {
  // Try restore one largest
  const f = suspects.shift();
  addNc(f);
  const next = cascadeCount();
  console.log(
    'TRY',
    path.basename(f),
    'cascade',
    cascade.length,
    '->',
    next.length,
  );
  if (next.length < cascade.length) {
    restored.push(f);
    cascade = next;
    // keep restored
  } else {
    // didn't help — undo
    stripNc(f);
  }
}

console.log('RESTORED_FOR_CASCADE', restored.length);
restored.forEach((f) => console.log('RESTORE', f));

const nowRemoved = [...headHad].filter((f) => !hasNc(fs.readFileSync(f, 'utf8')));
const nowNc = all.filter((f) => hasNc(fs.readFileSync(f, 'utf8')));
cascade = cascadeCount();
console.log(
  JSON.stringify(
    {
      removedFromHead: nowRemoved.length,
      remainingNocheckScope: nowNc.length,
      cascadeRemaining: cascade.length,
    },
    null,
    2,
  ),
);
if (cascade.length) {
  console.log('CASCADE_LEFT');
  cascade.forEach((f) => console.log(f));
}
nowRemoved.sort().forEach((f) => console.log('KEEP_REMOVED', f));
