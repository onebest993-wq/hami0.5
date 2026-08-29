import fs from 'fs';
import path from 'path';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p.split(path.sep).join('/'));
  }
  return acc;
}

const pkgText = fs.readFileSync('package.json', 'utf8');
const scripts = walk('scripts').filter(
  (f) => /execution/i.test(path.basename(f)) && /\.(mjs|js)$/.test(f),
);
const allMjs = walk('scripts').filter((f) => f.endsWith('.mjs'));
const results = [];
for (const s of scripts) {
  const base = path.basename(s);
  const inPkg = pkgText.includes(base);
  const refs = [];
  for (const other of allMjs) {
    if (other === s) continue;
    if (fs.readFileSync(other, 'utf8').includes(base)) refs.push(other);
  }
  results.push({ s, inPkg, refs, oneShot: !inPkg && refs.length === 0 });
}
results.sort((a, b) => Number(b.oneShot) - Number(a.oneShot) || a.s.localeCompare(b.s));
fs.writeFileSync('.audit/execution-scripts-usage.json', JSON.stringify(results, null, 2));
for (const r of results) console.log(JSON.stringify(r));
