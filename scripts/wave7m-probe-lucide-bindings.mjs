import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist', 'assets');
const ld = fs.readdirSync(dist).find(
  (f) => /^LawyerDashboard-[a-zA-Z0-9_-]+\.js$/.test(f) && !/HomeTab|Post|Shell|Parts|css/.test(f),
);
const t = fs.readFileSync(path.join(dist, ld), 'utf8');
const m = t.match(/import\{([^}]+)\}from"\.\/vendor-lucide-[^"]+"/);
console.log('lucide import bindings:', m ? m[1].slice(0, 500) : 'none');
// also check side-effect import
const m2 = t.match(/from"\.\/vendor-lucide-[^"]+"/g);
console.log('all lucide froms', m2);

// Which other chunks import the same lucide and share with LD?
const lucide = (m2?.[0] || '').replace(/^from"\.\//, '').replace(/"$/, '');
console.log('lucide file', lucide);
