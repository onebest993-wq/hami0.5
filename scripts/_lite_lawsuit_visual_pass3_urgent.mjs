import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard',
  'src/app/components/lawyer/Form_Urgent_Actions',
  'src/app/components/lawyer/Dashboard_Active_Order_File',
  'src/app/components/lawyer/Modal_Unified_Summons_Hub',
  'src/app/components/lawyer/Component_Urgent_Card.tsx',
  'src/app/components/lawyer/Component_Urgent_CardView.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsWorkspaceUrgentTab.tsx',
  'src/app/components/lawyer/smart-modal/appealTransitionModalChrome.ts',
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
      if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function transform(src) {
  let s = src;
  const before = s;
  s = s.replaceAll('backdrop-blur-2xl', 'backdrop-blur-md');
  s = s.replaceAll('backdrop-blur-xl', 'backdrop-blur-sm');
  s = s.replace(/ ?shadow-\[0_0_[^\]]+\]/g, '');
  s = s.replace(/group-hover:shadow-\[0_0_[^\]]+\]/g, '');
  s = s.replaceAll('shadow-2xl', 'shadow-lg');
  s = s.replaceAll('shadow-black/60', 'shadow-black/35');
  s = s.replaceAll('shadow-black/50', 'shadow-black/30');
  s = s.replaceAll('shadow-black/40', 'shadow-black/25');
  s = s.replace(
    /shadow-\[0_10px_36px_rgba\(0,0,0,0\.22\),inset_0_1px_0_rgba\(255,255,255,0\.04\)\]/g,
    'shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
  );
  s = s.replace(
    /shadow-\[0_10px_32px_rgba\(0,0,0,0\.26\),inset_0_1px_0_rgba\(255,255,255,0\.06\)\]/g,
    'shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
  );
  s = s.replace(
    /hover:shadow-\[0_12px_36px_rgba\(0,0,0,0\.32\),inset_0_1px_0_rgba\(255,255,255,0\.09\)\]/g,
    'hover:shadow-[0_8px_22px_rgba(0,0,0,0.22)]',
  );
  s = s.replace(/dotGlow: 'group-hover:'/g, "dotGlow: ''");
  return s === before ? null : s;
}

let n = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const next = transform(src);
    if (!next) continue;
    fs.writeFileSync(file, next);
    n++;
    console.log(file.replace(/\\/g, '/'));
  }
}
console.log('files_changed', n);
