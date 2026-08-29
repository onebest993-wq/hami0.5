import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const roots = [
  'src/app/components/lawyer/criminal-system',
  'src/app/components/lawyer/smart-modal',
  'src/app/domain/lawsuit',
  'src/app/components/lawyer/ArchivePortal',
];

const bad = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const f of walk(root)) {
    const lines = fs.readFileSync(f, 'utf8').split(/\n/);
    lines.forEach((l, i) => {
      const t = l.trim();
      if (/^>\s*=/.test(t) || /^\[\]\s*=/.test(t) || /^\)\s*=/.test(t)) {
        bad.push(`${f}:${i + 1}: ${t.slice(0, 100)}`);
      }
    });
  }
}
console.log(bad.length ? bad.join('\n') : 'no mangled remnants');
