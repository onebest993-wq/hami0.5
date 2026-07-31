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

const queue = [[ld, [ld]]];
const seen = new Set([ld]);
while (queue.length) {
  const [cur, trail] = queue.shift();
  for (const dep of imps(cur)) {
    if (dep === lucide) {
      console.log('PATH', [...trail, dep].join(' -> '));
      // also who among trail imports lucide directly
      for (const f of trail) {
        if (imps(f).includes(lucide)) console.log('direct importer', f);
      }
      process.exit(0);
    }
    if (seen.has(dep)) continue;
    seen.add(dep);
    if (trail.length < 8) queue.push([dep, [...trail, dep]]);
  }
}
console.log('no path');
