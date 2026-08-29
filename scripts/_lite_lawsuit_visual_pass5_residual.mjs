import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/app/components/lawyer/criminal-system',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/smart-modal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/personal-status',
  'src/app/components/lawyer/DecisionsAndAppealsEngine',
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/ExecutionCreationView',
  'src/app/components/lawyer/execution',
  'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard',
  'src/app/components/lawyer/Form_Urgent_Actions',
  'src/app/components/lawyer/Dashboard_Active_Order_File',
  'src/app/components/lawyer/Modal_Unified_Summons_Hub',
  'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome.tsx',
  'src/app/components/lawyer/dashboard/LawsuitsWorkspaceUrgentTab.tsx',
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
    } else if (/\.(ts|tsx|css)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function transform(src) {
  let s = src;
  const before = s;

  s = s.replaceAll('backdrop-blur-md', 'backdrop-blur-sm');
  s = s.replaceAll('shadow-xl', 'shadow-lg');
  s = s.replaceAll('bg-black/90', 'bg-black/70');
  s = s.replaceAll('bg-black/80', 'bg-black/62');
  s = s.replaceAll("bg-[#03050B]/94", "bg-[#03050B]/72");
  s = s.replaceAll("bg-[#03050B]/82", "bg-[#03050B]/68");
  s = s.replaceAll("bg-[#020309]/96", "bg-[#03050B]/68");

  // Remaining heavy freeform shadows
  s = s.replace(
    /shadow-\[0_16px_48px_rgba\(0,0,0,0\.32\)\]/g,
    'shadow-[0_8px_22px_rgba(0,0,0,0.22)]',
  );
  s = s.replace(
    /shadow-\[0_16px_48px_-8px_rgba\(0,0,0,0\.75\)\]/g,
    'shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
  );
  s = s.replace(
    /hover:shadow-\[0_18px_48px_rgba\(0,0,0,0\.45\),0_0_0_1px_rgba\(230,198,115,0\.08\)\]/g,
    'hover:shadow-[0_8px_22px_rgba(0,0,0,0.24)]',
  );
  s = s.replace(
    /shadow-\[0_10px_32px_-14px_rgba\(0,0,0,0\.7\)\]/g,
    'shadow-[0_6px_18px_rgba(0,0,0,0.22)]',
  );
  s = s.replace(
    /shadow-\[0_12px_40px_rgba\(0,0,0,0\.32\)[^\]]*\]/g,
    'shadow-[0_8px_22px_rgba(0,0,0,0.24)]',
  );
  s = s.replace(
    /shadow-\[0_12px_36px_rgba\(0,0,0,0\.2[68]\)[^\]]*\]/g,
    'shadow-[0_8px_22px_rgba(0,0,0,0.22)]',
  );
  s = s.replace(
    /shadow-\[0_8px_32px_rgba\(240,168,180,0\.18\),inset_0_1px_0_rgba\(255,220,228,0\.35\)\]/g,
    'shadow-[0_4px_14px_rgba(0,0,0,0.2)]',
  );
  s = s.replace(
    /hover:shadow-\[0_12px_40px_rgba\(240,168,180,0\.24\)\]/g,
    'hover:shadow-[0_6px_16px_rgba(0,0,0,0.22)]',
  );
  s = s.replace(
    /shadow-\[0_8px_28px_rgba\(201,184,154,0\.12\),inset_0_1px_0_rgba\(255,255,255,0\.12\)\]/g,
    'shadow-[0_4px_14px_rgba(0,0,0,0.18)]',
  );
  s = s.replace(
    /shadow-\[0_8px_28px_rgba\(240,168,180,0\.18\),inset_0_1px_0_rgba\(255,220,228,0\.22\)\]/g,
    'shadow-[0_4px_14px_rgba(0,0,0,0.18)]',
  );
  s = s.replace(
    /shadow-\[0_8px_28px_rgba\(52,211,153,0\.14\),inset_0_1px_0_rgba\(167,243,208,0\.18\)\]/g,
    'shadow-[0_4px_12px_rgba(0,0,0,0.16)]',
  );
  s = s.replace(
    /shadow-\[0_8px_28px_rgba\(244,63,94,0\.12\),inset_0_1px_0_rgba\(254,205,211,0\.16\)\]/g,
    'shadow-[0_4px_12px_rgba(0,0,0,0.16)]',
  );
  s = s.replace(
    /shadow-\[0_-12px_36px_rgba\(0,0,0,0\.36\)\]/g,
    'shadow-[0_-8px_22px_rgba(0,0,0,0.26)]',
  );
  s = s.replace(
    /shadow-\[0_4px_24px_rgba\(0,0,0,0\.25\)\]/g,
    'shadow-[0_4px_14px_rgba(0,0,0,0.18)]',
  );
  s = s.replace(
    /shadow-\[0_10px_28px_rgba\(0,0,0,0\.3\)\]/g,
    'shadow-[0_6px_16px_rgba(0,0,0,0.22)]',
  );

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
