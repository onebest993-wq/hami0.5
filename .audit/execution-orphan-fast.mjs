import fs from 'fs';
import path from 'path';

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', '.next', 'android', 'ios', 'test-results', 'playwright-report'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) acc.push(p.split(path.sep).join('/'));
  }
  return acc;
}

const all = [...walk('src'), ...walk('e2e'), ...walk('scripts')];
const importRe = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const referenced = new Set();
for (const f of all) {
  let src;
  try {
    src = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const spec = m[1] || m[2];
    if (spec) referenced.add(spec);
  }
}

const roots = [
  ...walk('src/app/components/lawyer/ExecutionDashboard'),
  ...walk('src/app/application/execution'),
  ...walk('src/app/utils/execution'),
  ...fs
    .readdirSync('src/app/utils')
    .filter((f) => f.startsWith('execution') && /\.tsx?$/.test(f))
    .map((f) => `src/app/utils/${f}`),
];

const orphans = [];
for (const file of roots) {
  if (/\.(test|spec)\./.test(file) || file.includes('__tests__/')) continue;
  if (/\/index\.tsx?$/.test(file)) continue;
  const base = path.basename(file).replace(/\.(tsx?)$/, '');
  const noExt = file.replace(/\.(tsx?)$/, '');
  const rel = noExt.replace(/^src\//, '');
  let hit = false;
  for (const ref of referenced) {
    if (
      ref === `@/${rel}` ||
      ref === `@/app/${rel.replace(/^app\//, '')}` ||
      ref.endsWith(`/${base}`) ||
      ref.includes(rel) ||
      ref.includes(noExt)
    ) {
      hit = true;
      break;
    }
  }
  // also relative basename-only matches are noisy; require path fragment for weak hits
  if (!hit) {
    // chunk scope / lazy registry string references
    const blob = [...referenced].some((r) => r.includes(base));
    if (blob) hit = true;
  }
  if (!hit) orphans.push(file);
}

fs.writeFileSync('.audit/execution-orphan-candidates.json', JSON.stringify(orphans, null, 2));
console.log('orphan candidates', orphans.length);
orphans.forEach((o) => console.log(o));
