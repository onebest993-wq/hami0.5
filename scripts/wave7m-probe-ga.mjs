import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist', 'assets');
const ld = fs.readdirSync(dist).find(
  (f) => /^LawyerDashboard-[a-zA-Z0-9_-]+\.js$/.test(f) && !/HomeTab|Post|Shell|Parts|css/.test(f),
);
const t = fs.readFileSync(path.join(dist, ld), 'utf8');
const hits = [];
const re = /\bGa\b/g;
let m;
while ((m = re.exec(t)) && hits.length < 20) {
  hits.push({ i: m.index, ctx: t.slice(Math.max(0, m.index - 60), m.index + 100) });
}
console.log(JSON.stringify(hits, null, 2));

// decode lucide: find x0 definition
const lucide = fs.readdirSync(dist).find((f) => f.startsWith('vendor-lucide-'));
const lt = fs.readFileSync(path.join(dist, lucide), 'utf8');
const x0 = lt.match(/x0=([^=,\n]{0,200})/);
console.log('x0 def sample', x0 ? x0[0].slice(0, 200) : null);
// lucide often: const x0 = createLucideIcon("IconName", ...
const named = lt.match(/createLucideIcon\("([^"]+)"/g);
console.log('icons sample', named?.slice(0, 5));
// find which createLucideIcon is assigned to x0
const assign = lt.match(/x0=([A-Za-z0-9_$]+)/);
console.log('x0 assign', assign?.[0]);
if (assign) {
  const id = assign[1];
  const cre = new RegExp(`${id}=\\w*\\(?\"([^\"]+)\"`);
  // search createLucideIcon near x0
  const idx = lt.indexOf('x0=');
  console.log('around x0', lt.slice(Math.max(0, idx - 100), idx + 150));
}
