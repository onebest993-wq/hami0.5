import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function resolveFile(base) {
  const cands = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) return resolveFile(path.join(root, 'src', spec.slice(2)));
  if (spec.startsWith('.')) return resolveFile(path.resolve(path.dirname(fromFile), spec));
  return null;
}

function listStaticSpecs(src) {
  const specs = [];
  // strip block comments
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const re = /(?:^|\n)\s*import\s([\s\S]*?)\sfrom\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(cleaned))) {
    const clause = m[1].trim();
    const spec = m[2];
    if (clause.startsWith('type ') && !clause.includes('{')) continue;
    // import type { ... }
    if (/^type\s*\{/.test(clause)) continue;
    specs.push({ clause, spec });
  }
  return specs;
}

function hasValueLucide(src) {
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /(?:^|\n)\s*import\s([\s\S]*?)\sfrom\s+['"]lucide-react['"]/g;
  let m;
  while ((m = re.exec(cleaned))) {
    const clause = m[1].trim();
    if (clause.startsWith('type ') || /^type\s*\{/.test(clause)) continue;
    return true;
  }
  return false;
}

const start = path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx');
const queue = [[start, [start]]];
const seen = new Set([start]);
const hits = [];

while (queue.length) {
  const [cur, trail] = queue.shift();
  const src = fs.readFileSync(cur, 'utf8');
  if (hasValueLucide(src)) {
    hits.push({ file: path.relative(root, cur).replace(/\\/g, '/'), depth: trail.length, via: trail.slice(-5).map((t) => path.relative(root, t).replace(/\\/g, '/')) });
  }
  for (const { spec } of listStaticSpecs(src)) {
    const resolved = resolveImport(cur, spec);
    if (!resolved || seen.has(resolved)) continue;
    if (resolved.includes(`${path.sep}__tests__${path.sep}`)) continue;
    seen.add(resolved);
    if (trail.length < 16) queue.push([resolved, [...trail, resolved]]);
  }
}

console.log(JSON.stringify({ seen: seen.size, hits }, null, 2));
