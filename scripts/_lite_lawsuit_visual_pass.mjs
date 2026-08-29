/**
 * One-shot: strip heavy glow / blur stacks from lawsuit visual strings.
 * Run: node scripts/_lite_lawsuit_visual_pass.mjs
 */
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
  'src/app/domain/urgent',
];

const exts = new Set(['.ts', '.tsx', '.css']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
      walk(p, out);
    } else if (exts.has(path.extname(ent.name))) out.push(p);
  }
  return out;
}

function transform(src) {
  let s = src;
  const before = s;

  // Heavy blur → lighter
  s = s.replaceAll('backdrop-blur-2xl', 'backdrop-blur-md');
  s = s.replaceAll('backdrop-blur-xl', 'backdrop-blur-sm');

  // Glow blooms → remove (keep surrounding spaces tidy)
  s = s.replace(/ ?shadow-\[0_0_[^\]]+\]/g, '');
  s = s.replace(/group-hover:shadow-\[0_0_[^\]]+\]/g, '');

  // Very heavy drop shadows commonly used on modals/cards
  s = s.replace(/shadow-\[0_24px_80px_rgba\(0,0,0,0\.6[0-9]?\)\]/g, 'shadow-[0_12px_36px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_24px_80px_rgba\(0,0,0,0\.65\)\]/g, 'shadow-[0_12px_36px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_24px_64px_rgba\(0,0,0,0\.(38|52)\)[^\]]*\]/g, 'shadow-[0_12px_36px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_24px_60px_rgba\(0,0,0,0\.45\)\]/g, 'shadow-[0_12px_36px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_20px_60px_rgba\(0,0,0,0\.72\)\]/g, 'shadow-[0_12px_36px_rgba(0,0,0,0.3)]');
  s = s.replace(/shadow-\[0_20px_50px_rgba\(0,0,0,0\.55\)\]/g, 'shadow-[0_10px_28px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_20px_56px_rgba\(0,0,0,0\.[0-9]+\)[^\]]*\]/g, 'shadow-[0_10px_28px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_-16px_48px_rgba\(0,0,0,0\.[0-9]+\)[^\]]*\]/g, 'shadow-[0_-10px_28px_rgba(0,0,0,0.28)]');
  s = s.replace(/shadow-\[0_16px_48px_rgba\(0,0,0,0\.38\)\]/g, 'shadow-[0_10px_28px_rgba(0,0,0,0.26)]');
  s = s.replace(/shadow-\[0_12px_28px_rgba\(0,0,0,0\.35\)\]/g, 'shadow-[0_8px_20px_rgba(0,0,0,0.22)]');

  return s === before ? null : s;
}

let changed = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const next = transform(src);
    if (!next) continue;
    fs.writeFileSync(file, next);
    changed++;
    console.log('updated', file.replace(/\\/g, '/'));
  }
}
console.log('files_changed', changed);
