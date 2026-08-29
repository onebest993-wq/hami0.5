import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '__snapshots__') continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
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
  .filter((f) => f.startsWith('execution') && /\.(ts|tsx)$/.test(f))
  .map((f) => path.join('src/app/utils', f).split(path.sep).join('/'));

const files = [
  ...roots.flatMap((r) => walk(r)),
  ...utilsFlat,
];

const exportRe =
  /export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g;
const exportListRe = /export\s*\{([^}]+)\}/g;

/** @type {Map<string, string[]>} */
const exportMap = new Map();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const symbols = new Set();
  let m;
  exportRe.lastIndex = 0;
  while ((m = exportRe.exec(src))) symbols.add(m[1]);
  exportListRe.lastIndex = 0;
  while ((m = exportListRe.exec(src))) {
    for (const part of m[1].split(',')) {
      let cleaned = part.trim();
      if (!cleaned) continue;
      cleaned = cleaned.replace(/^type\s+/, '');
      const asParts = cleaned.split(/\s+as\s+/);
      const name = (asParts[1] || asParts[0]).trim();
      if (name && name !== 'default') symbols.add(name);
    }
  }
  for (const s of symbols) {
    if (!exportMap.has(s)) exportMap.set(s, []);
    exportMap.get(s).push(file);
  }
}

function rgFiles(pattern) {
  try {
    const out = execFileSync(
      'rg',
      ['-l', '--glob', '*.{ts,tsx,mjs,js}', '-F', pattern, ROOT],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    return out
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((h) => h.split(path.sep).join('/').replace(/^.*?New folder[\\/]/, '').replace(/^\.\//, ''));
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

function normalizeHit(h) {
  const idx = h.toLowerCase().indexOf('new folder');
  if (idx >= 0) {
    return h.slice(idx + 'new folder'.length).replace(/^[\\/]/, '').split(path.sep).join('/');
  }
  return h.split(path.sep).join('/');
}

const candidates = [...exportMap.entries()]
  .map(([sym, locs]) => ({ sym, locs }))
  .filter(({ sym, locs }) => {
    if (sym.length < 3) return false;
    if (locs.every((l) => /__tests__|\.test\.|\.spec\./.test(l))) return false;
    // Prefer non-JSX modules + hooks/helpers/utils/application
    const interesting = locs.some(
      (l) =>
        /helpers|utils|application|hooks|Prefetch|ChunkScope|Registry|Bridge|normalize|build|resolve|submit|Constants|Store|types\.ts|Scope|Migrate|Reconcile|Isolation|Namespace|Wipe|Trash|Chrono|UiMeta|OwnerLite|BlobKey|BlobPersistence|HeaderFields|Tombstones|ActionIds|Bootstrap|Strategies|PartyNormalize|Summons|Ymd|amountInput|guarantorFollowup|isSalary/.test(
          l,
        ) || !/\.tsx$/.test(l),
    );
    if (!interesting) return false;
    return true;
  });

console.log(JSON.stringify({ files: files.length, exports: exportMap.size, candidates: candidates.length }));

const unused = [];
const barrelOnly = [];
let i = 0;
for (const { sym, locs } of candidates) {
  i++;
  if (i % 100 === 0) console.error(`progress ${i}/${candidates.length}`);
  const rawHits = rgFiles(sym).map(normalizeHit);
  const hits = [...new Set(rawHits)];
  const locSet = new Set(locs);
  const external = hits.filter((h) => !locSet.has(h) && !h.includes('node_modules'));
  if (external.length === 0) {
    unused.push({ sym, locs, hitCount: hits.length });
  } else if (
    external.every((h) => /index\.ts$|__tests__|\.test\.|\.spec\./.test(h)) &&
    !external.some((h) => /\.test\.|\.spec\.|__tests__/.test(h) && !/index\.ts$/.test(h))
  ) {
    // only barrels
    if (external.every((h) => /index\.ts$/.test(h))) {
      barrelOnly.push({ sym, locs, external });
    }
  } else if (external.every((h) => /__tests__|\.test\.|\.spec\./.test(h))) {
    unused.push({ sym, locs, hitCount: hits.length, onlyTests: external });
  }
}

fs.writeFileSync(
  '.audit/execution-unused-exports.json',
  JSON.stringify({ unused, barrelOnly, scanned: candidates.length }, null, 2),
);
console.log(JSON.stringify({ unused: unused.length, barrelOnly: barrelOnly.length }));
console.log('---UNUSED TOP---');
unused.slice(0, 60).forEach((u) => console.log(JSON.stringify(u)));
console.log('---BARREL ONLY---');
barrelOnly.slice(0, 40).forEach((u) => console.log(JSON.stringify(u)));
