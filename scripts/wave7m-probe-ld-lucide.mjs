import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist', 'assets');
const ld = fs.readdirSync(dist).find(
  (f) => /^LawyerDashboard-[a-zA-Z0-9_-]+\.js$/.test(f) && !/HomeTab|Post|Shell|Parts|css/.test(f),
);
if (!ld) {
  console.error('LD chunk not found');
  process.exit(1);
}
const t = fs.readFileSync(path.join(dist, ld), 'utf8');
const lucide = [...t.matchAll(/from"\.\/(vendor-lucide-[^"]+)"/g)].map((m) => m[1]);
const sizeKb = (fs.statSync(path.join(dist, ld)).size / 1024).toFixed(1);
console.log(JSON.stringify({ ld, sizeKb, lucideImports: lucide, ldToLucide: lucide.length > 0 }, null, 2));
