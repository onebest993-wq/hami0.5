import fs from 'node:fs';
import path from 'node:path';

const timeline = 'src/app/components/lawyer/smart-modal/smartFile/timelineEventVisualPalettes.ts';
{
  let s = fs.readFileSync(timeline, 'utf8');
  s = s.replace(/dotGlow: 'group-hover:'/g, "dotGlow: ''");
  s = s.replace(
    /hover:shadow-\[0_12px_48px_rgba\([^\]]+\)\]/g,
    'hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)]',
  );
  fs.writeFileSync(timeline, s);
  console.log('fixed timeline palettes');
}

const roots = [
  'src/app/components/lawyer/criminal-system',
  'src/app/components/lawyer/ArchivePortal',
  'src/app/components/lawyer/smart-modal',
  'src/app/components/lawyer/LawyerNewCase',
  'src/app/components/lawyer/personal-status',
  'src/app/components/lawyer/DecisionsAndAppealsEngine',
  'src/app/components/lawyer/ExecutionDashboard',
  'src/app/components/lawyer/ExecutionCreationView',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let n = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    let t = fs.readFileSync(file, 'utf8');
    const before = t;
    t = t.replaceAll('shadow-2xl', 'shadow-lg');
    t = t.replaceAll('shadow-black/60', 'shadow-black/35');
    t = t.replaceAll('shadow-black/50', 'shadow-black/30');
    t = t.replaceAll('shadow-black/40', 'shadow-black/25');
    t = t.replace(
      /bg-\[radial-gradient\(circle_at_top,[^\]]+\),linear-gradient\(180deg,[^\]]+\)\]/g,
      'bg-[linear-gradient(165deg,rgba(16,22,36,0.96),rgba(10,15,28,0.99))]',
    );
    // leftover broken group-hover: after glow strip
    t = t.replace(/dotGlow: 'group-hover:'/g, "dotGlow: ''");
    t = t.replace(/ className=\{`([^`]*)group-hover:([^a-zA-Z])/g, ' className={`$1$2');
    if (t !== before) {
      fs.writeFileSync(file, t);
      n++;
      console.log(file.replace(/\\/g, '/'));
    }
  }
}
console.log('files_changed', n);
