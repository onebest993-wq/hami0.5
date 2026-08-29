import fs from 'fs';
import path from 'path';

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

const roots = [
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/execution',
];
const all = roots.flatMap((r) => walk(r));
const withNc = [];
for (const f of all) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\n/);
  const idx = lines.findIndex((l) => /^\s*\/\/\s*@ts-nocheck\b/.test(l));
  if (idx >= 0) withNc.push({ f, idx, line: lines[idx].slice(0, 100), total: lines.length });
}
console.log('REMAINING', withNc.length);
withNc.filter((x) => x.idx > 0).forEach((x) => console.log('NOT_LINE0', x.idx, x.f, x.line));
withNc
  .sort((a, b) => a.total - b.total)
  .forEach((x) => console.log(String(x.total).padStart(4), x.f));
