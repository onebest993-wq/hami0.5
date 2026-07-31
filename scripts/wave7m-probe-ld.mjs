import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist', 'assets');
const ld = fs.readdirSync(dist).find(
  (f) => /^LawyerDashboard-[a-zA-Z0-9_-]+\.js$/.test(f) && !/HomeTab|Post|Shell|Parts|css/.test(f),
);
const lucide = fs.readdirSync(dist).find((f) => /^vendor-lucide-.*\.js$/.test(f));
function imps(file) {
  return [...fs.readFileSync(path.join(dist, file), 'utf8').matchAll(/from"\.\/([^"]+)"/g)].map((m) => m[1]);
}
const deps = imps(ld);
console.log('LD', ld, fs.statSync(path.join(dist, ld)).size);
console.log('LD->lucide', lucide ? deps.includes(lucide) : null);
console.log(
  'top deps',
  deps
    .map((d) => ({ d, b: fs.statSync(path.join(dist, d)).size }))
    .sort((a, b) => b.b - a.b)
    .slice(0, 12)
    .map((x) => `${x.b} ${x.d}`)
    .join('\n'),
);
