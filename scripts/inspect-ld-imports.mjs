import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'dist/assets');
const files = fs.readdirSync(dir).filter((f) => /^LawyerDashboard-[A-Za-z0-9_-]+\.js$/.test(f));
const ld = files.sort((a, b) => fs.statSync(path.join(dir, a)).size - fs.statSync(path.join(dir, b)).size)[0];
const s = fs.readFileSync(path.join(dir, ld), 'utf8');
console.log('file', ld, 'bytes', s.length);
const imports = [];
for (const m of s.matchAll(/from"\.\/([^"]+)"|import"\.\/([^"]+)"/g)) {
  imports.push(m[1] || m[2]);
}
console.log('imports', imports);
console.log('has boot-reveal', imports.some((i) => i.includes('boot-reveal')));
console.log('has auth-storage', imports.some((i) => i.includes('auth-storage')));
console.log('has crypto', imports.some((i) => i.includes('crypto')));
console.log('snippet mark area', s.includes('dashboard-interactive') || s.includes('hami:boot'));
