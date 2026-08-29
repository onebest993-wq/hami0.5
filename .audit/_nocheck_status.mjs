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
const untracked = new Set();
for (const f of all) {
  try {
    const head = execSync(`git show HEAD:${f}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (hasNc(head)) headHad.add(f);
    else headMiss.add(f);
  } catch {
    untracked.add(f);
  }
}

const nowNc = new Set(all.filter((f) => hasNc(fs.readFileSync(f, 'utf8'))));

const removedFromHead = [...headHad].filter((f) => !nowNc.has(f));
const stillFromHead = [...headHad].filter((f) => nowNc.has(f));
const pollutedNow = [...nowNc].filter((f) => headMiss.has(f));

console.log(
  JSON.stringify(
    {
      headHadNocheck: headHad.size,
      nowNocheck: nowNc.size,
      removedFromHead: removedFromHead.length,
      stillFromHead: stillFromHead.length,
      pollutedTracked: pollutedNow.length,
      untracked: untracked.size,
      untrackedWithNc: [...untracked].filter((f) => nowNc.has(f)).length,
    },
    null,
    2,
  ),
);

console.log('---REMOVED_FROM_HEAD---');
removedFromHead.sort().forEach((f) => console.log(f));

console.log('Running tsc to validate removals...');
const err = errorFiles(runTsc());
const badRemovals = removedFromHead.filter((f) => err.has(f));
const cascadeClean = [...headMiss].filter((f) => err.has(f));
console.log('BAD_REMOVALS_SELF_ERROR', badRemovals.length);
badRemovals.forEach((f) => console.log('BAD', f));
console.log('CASCADE_INTO_PREVIOUSLY_CLEAN', cascadeClean.length);
cascadeClean.slice(0, 40).forEach((f) => console.log('CASCADE', f));
