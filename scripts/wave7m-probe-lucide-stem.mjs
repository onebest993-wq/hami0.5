import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const dist = path.join(process.cwd(), 'dist', 'assets');
const hasDist = fs.existsSync(dist);
if (!hasDist) {
  console.log('no dist — skip');
  process.exit(0);
}
const ld = fs.readdirSync(dist).find(
  (f) => /^LawyerDashboard-[a-zA-Z0-9_-]+\.js$/.test(f) && !/HomeTab|Post|Shell|Parts|css/.test(f),
);
const lucide = fs.readdirSync(dist).find((f) => /^vendor-lucide-.*\.js$/.test(f));
function imps(file) {
  return [...fs.readFileSync(path.join(dist, file), 'utf8').matchAll(/from"\.\/([^"]+)"/g)].map((m) => m[1]);
}
console.log('LD', ld, 'lucide', lucide, 'LD->lucide', ld && lucide ? imps(ld).includes(lucide) : null);

// Which source files under lawyer dashboard path still import lucide and are likely on stem
const roots = [
  'src/app/components/lawyer/LawyerDashboard.tsx',
  'src/app/components/lawyer/dashboard',
  'src/app/components/lawyer/LawyerDashboardParts',
  'src/app/hooks/lawyerDashboard',
  'src/app/hooks/useLawyerDashboardNavigation.ts',
  'src/app/hooks/useLawyerDashboardCore.ts',
];
const hits = [];
function walk(p) {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (!/\.(tsx?|jsx?)$/.test(p)) return;
    const t = fs.readFileSync(p, 'utf8');
    if (/from ['"]lucide-react['"]/.test(t)) hits.push(p.replace(/\\/g, '/'));
    return;
  }
  for (const name of fs.readdirSync(p)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    walk(path.join(p, name));
  }
}
for (const r of roots) walk(path.join(process.cwd(), r));
console.log('lucide imports in stem-ish sources:');
for (const h of hits) console.log(' ', h);
