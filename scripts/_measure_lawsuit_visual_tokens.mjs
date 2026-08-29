import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/app/components/lawyer/criminal-system',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/smart-modal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/personal-status',
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard',
  'src/app/components/lawyer/Form_Urgent_Actions',
  'src/app/components/lawyer/Dashboard_Active_Order_File',
  'src/app/components/lawyer/Modal_Unified_Summons_Hub',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    out.push(dir);
    return out;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.(ts|tsx|css)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const counts = {
  filesScanned: 0,
  backdropBlur2xl: 0,
  backdropBlurXl: 0,
  backdropBlurMd: 0,
  backdropBlurSm: 0,
  glowShadow00: 0,
  shadow2xl: 0,
};

for (const root of roots) {
  for (const file of walk(root)) {
    counts.filesScanned++;
    const s = fs.readFileSync(file, 'utf8');
    counts.backdropBlur2xl += (s.match(/backdrop-blur-2xl/g) || []).length;
    counts.backdropBlurXl += (s.match(/backdrop-blur-xl/g) || []).length;
    counts.backdropBlurMd += (s.match(/backdrop-blur-md/g) || []).length;
    counts.backdropBlurSm += (s.match(/backdrop-blur-sm/g) || []).length;
    counts.glowShadow00 += (s.match(/shadow-\[0_0_/g) || []).length;
    counts.shadow2xl += (s.match(/shadow-2xl/g) || []).length;
  }
}

console.log(JSON.stringify(counts, null, 2));
