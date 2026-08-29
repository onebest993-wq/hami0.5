import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '__snapshots__'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|mjs|js|json)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      acc.push(p.split(path.sep).join('/'));
    }
  }
  return acc;
}

const roots = [
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/application/execution',
  'src/app/utils/execution',
];
const utilsFlat = fs
  .readdirSync('src/app/utils')
  .filter((f) => f.startsWith('execution'))
  .map((f) => path.join('src/app/utils', f).split(path.sep).join('/'));

const e2e = walk('e2e').filter((f) => /execution/i.test(f));
const scripts = walk('scripts').filter((f) => /execution/i.test(path.basename(f)) || /execution/i.test(f));

const scopeFiles = [...roots.flatMap((r) => walk(r)), ...utilsFlat];

function normalize(h) {
  const lower = h.toLowerCase();
  const marker = 'new folder';
  const idx = lower.indexOf(marker);
  if (idx >= 0) return h.slice(idx + marker.length).replace(/^[\\/]/, '').split(path.sep).join('/');
  return h.split(path.sep).join('/');
}

function rgCount(pattern) {
  try {
    const out = execFileSync(
      'rg',
      ['-l', '--glob', '!**/node_modules/**', '--glob', '!**/.audit/**', '-F', pattern, '.'],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    return out.trim().split(/\r?\n/).filter(Boolean).map(normalize);
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

// Orphan detection: module basename / relative import path never referenced
const orphans = [];
const weaklyReferenced = [];

for (const file of scopeFiles) {
  if (/\.(test|spec)\.(ts|tsx)$/.test(file) || file.includes('__tests__/')) continue;
  if (file.endsWith('.json')) continue;
  const base = path.basename(file).replace(/\.(tsx?|mjs|js)$/, '');
  // skip common entry names that may be dynamically imported
  if (['index', 'types', 'constants'].includes(base)) continue;

  // Search for import path fragments
  const withoutExt = file.replace(/\.(tsx?)$/, '');
  const relFromSrc = withoutExt.replace(/^src\//, '@/');
  const shortPath = withoutExt.replace(/^src\/app\//, '');
  const patterns = [
    base,
    withoutExt.split('/').slice(-2).join('/'),
    withoutExt.split('/').slice(-3).join('/'),
  ];

  // Prefer path-based search
  const pathHits = new Set([
    ...rgCount(withoutExt.replace(/^src\//, '')),
    ...rgCount(relFromSrc),
    ...rgCount(`/${base}'`),
    ...rgCount(`/${base}"`),
    ...rgCount(`/${base}.ts`),
    ...rgCount(`/${base}.tsx`),
  ]);

  const external = [...pathHits].filter((h) => {
    const n = h.split(path.sep).join('/');
    return n !== file && !n.endsWith(file);
  });

  // Also check if filename string appears anywhere besides self
  const nameHits = rgCount(base).filter((h) => h.split(path.sep).join('/') !== file);

  if (external.length === 0 && nameHits.length === 0) {
    orphans.push(file);
  } else if (external.length === 0 && nameHits.every((h) => h.includes('__tests__') || h.includes('.test.') || h.includes('scripts/'))) {
    weaklyReferenced.push({ file, nameHits });
  }
}

fs.writeFileSync(
  '.audit/execution-orphans.json',
  JSON.stringify({ orphans, weaklyReferenced, total: scopeFiles.length }, null, 2),
);
console.log(JSON.stringify({ orphans: orphans.length, weak: weaklyReferenced.length, total: scopeFiles.length }, null, 2));
console.log('---ORPHANS---');
orphans.slice(0, 80).forEach((o) => console.log(o));
console.log('---WEAK---');
weaklyReferenced.slice(0, 40).forEach((o) => console.log(JSON.stringify(o)));

// scripts usage in package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const pkgText = JSON.stringify(pkg);
const scriptFiles = scripts.filter((s) => s.endsWith('.mjs') || s.endsWith('.js'));
const unusedScripts = [];
for (const s of scriptFiles) {
  const base = path.basename(s);
  const hits = rgCount(base).filter((h) => !h.endsWith(s) && !h.includes('.audit/'));
  const inPkg = pkgText.includes(base);
  if (!inPkg && hits.length === 0) unusedScripts.push({ s, hits: 0 });
  else if (!inPkg && hits.every((h) => h.startsWith('scripts/'))) unusedScripts.push({ s, hits, note: 'only scripts' });
}
fs.writeFileSync('.audit/execution-unused-scripts.json', JSON.stringify(unusedScripts, null, 2));
console.log('---UNUSED SCRIPTS---');
unusedScripts.forEach((u) => console.log(JSON.stringify(u)));
