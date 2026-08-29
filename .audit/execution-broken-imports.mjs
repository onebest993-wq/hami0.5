import fs from 'fs';
import path from 'path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (/\.(ts|tsx)$/.test(e.name)) a.push(p.split(path.sep).join('/'));
  }
  return a;
}

const files = [
  ...walk('e2e').filter((f) => /execution/i.test(f)),
  ...walk('src/app/application/execution').filter(
    (f) => /\.test\.|\.spec\./.test(f) || f.includes('__tests__/'),
  ),
  ...walk('src/app/components/lawyer/ExecutionDashboard').filter(
    (f) => /\.test\.|\.spec\./.test(f) || f.includes('__tests__/'),
  ),
  ...walk('src/app/utils/execution').filter(
    (f) => /\.test\.|\.spec\./.test(f) || f.includes('__tests__/'),
  ),
];

const importRe = /from\s+['"]([^'"]+)['"]/g;
const broken = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(src))) {
    const spec = m[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    let target;
    if (spec.startsWith('@/')) target = path.join('src', spec.slice(2));
    else target = path.resolve(path.dirname(f), spec);
    const cands = [
      target,
      target + '.ts',
      target + '.tsx',
      path.join(target, 'index.ts'),
      path.join(target, 'index.tsx'),
      target + '.json',
    ];
    if (!cands.some((c) => fs.existsSync(c))) {
      broken.push({ f, spec });
    }
  }
}
console.log('broken', broken.length);
broken.forEach((b) => console.log(JSON.stringify(b)));
fs.writeFileSync('.audit/execution-broken-test-imports.json', JSON.stringify(broken, null, 2));
