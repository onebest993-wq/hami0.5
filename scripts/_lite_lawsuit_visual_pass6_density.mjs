import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/app/components/lawyer/smart-modal',
  'src/app/components/lawyer/Dashboard_Active_Order_File',
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let n = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    let s = fs.readFileSync(file, 'utf8');
    const b = s;
    s = s.replaceAll('md:space-y-6', 'md:space-y-4');
    s = s.replaceAll('space-y-6', 'space-y-4');
    s = s.replace(/shadow-\[0_26px_90px_rgba\(0,0,0,0\.55\)\]/g, 'shadow-[0_8px_24px_rgba(0,0,0,0.28)]');
    s = s.replaceAll('rounded-[28px]', 'rounded-2xl');
    if (s !== b) {
      fs.writeFileSync(file, s);
      n++;
      console.log(file.replace(/\\/g, '/'));
    }
  }
}
console.log('files_changed', n);
