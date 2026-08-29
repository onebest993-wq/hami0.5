import fs from 'fs';
import path from 'path';

const base = 'src/app/components/lawyer/smart-modal';
function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (/\.(tsx|ts)$/.test(e.name) && !p.includes('__tests__')) a.push(p);
  }
  return a;
}
const files = walk(base);
const tsx = files.filter((f) => f.endsWith('.tsx'));
let btnCount = 0;
let smallBtn = 0;
for (const f of tsx) {
  const c = fs.readFileSync(f, 'utf8');
  const re = /<button[^>]*className="([^"]*)"/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    btnCount++;
    const cls = m[1];
    if (!/min-h-\[44px\]|min-w-\[44px\]|h-11|w-11|size-11|p-2\.5|py-3/.test(cls)) smallBtn++;
  }
}
const touch44 = files.filter((f) => /min-h-\[44px\]|min-w-\[44px\]/.test(fs.readFileSync(f, 'utf8'))).length;
const safeArea = files.filter((f) => /safe-area/.test(fs.readFileSync(f, 'utf8'))).length;
const scrollLock = files.filter((f) => /useBodyScrollLock|bodyScrollLock/.test(fs.readFileSync(f, 'utf8'))).length;
const reduceMotion = files.filter((f) => /reduceMotion|prefers-reduced-motion/.test(fs.readFileSync(f, 'utf8'))).length;
console.log(JSON.stringify({ tsxFiles: tsx.length, btnCount, smallBtn, touch44Files: touch44, safeAreaFiles: safeArea, scrollLockFiles: scrollLock, reduceMotionFiles: reduceMotion, compliancePct: ((btnCount - smallBtn) / btnCount * 100).toFixed(1) }, null, 2));
