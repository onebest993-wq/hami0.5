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
  return /^\s*\/\/\s*@ts-nocheck\b/m.test(src.slice(0, 400));
}

function stripNc(src) {
  const lines = src.split(/\n/);
  const idx = lines.findIndex((l) => /^\s*\/\/\s*@ts-nocheck\b/.test(l));
  if (idx < 0) return src;
  lines.splice(idx, 1);
  if (lines[idx] === '') lines.splice(idx, 1);
  return lines.join('\n');
}

const roots = [
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/execution',
];
const all = roots.flatMap((r) => walk(r));
const withNc = all.filter((f) => hasNc(fs.readFileSync(f, 'utf8')));
console.log('current_nocheck', withNc.length);

const pollute = [];
const keep = [];
const untracked = [];

for (const f of withNc) {
  let head = '';
  try {
    head = execSync(`git show HEAD:${f}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    // Untracked: treat as "originally had nocheck" if we can't know — check sibling evidence:
    // Prefer: if file is new, leave nocheck only if restore script added it AND file was in error set.
    // Safer: for untracked, keep nocheck (many evictionField files were new with nocheck).
    untracked.push(f);
    keep.push(f);
    continue;
  }
  if (!hasNc(head)) {
    pollute.push(f);
  } else {
    keep.push(f);
  }
}

console.log('POLLUTE_COUNT', pollute.length);
console.log('KEEP_COUNT', keep.length);
console.log('UNTRACKED_WITH_NC', untracked.length);

for (const f of pollute) {
  const src = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, stripNc(src));
  console.log('UNPOLLUTE', f);
}

console.log('DONE_UNPOLLUTE', pollute.length);
console.log(
  'REMAINING_NOCHECK',
  all.filter((f) => hasNc(fs.readFileSync(f, 'utf8'))).length,
);
