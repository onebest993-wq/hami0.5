/**
 * Find unused re-exports from a barrel file (identifier never appears outside the barrel).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const barrelRel = process.argv[2];
if (!barrelRel) {
  console.error('usage: node slim-barrel-probe.mjs <barrel-rel-path>');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const barrelAbs = path.join(ROOT, barrelRel);
const barrel = fs.readFileSync(barrelAbs, 'utf8');
const reExportNames = [];
for (const m of barrel.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s+from\s+['"][^'"]+['"]/g)) {
  for (const part of m[2].split(',')) {
    const bits = part.trim();
    if (!bits) continue;
    const exported = bits.split(/\s+as\s+/).pop().trim();
    if (/^[A-Za-z_$]/.test(exported)) reExportNames.push(exported);
  }
}

const files = walk(path.join(ROOT, 'src'));
const dead = [];
for (const name of reExportNames) {
  let hits = 0;
  const re = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (rel === barrelRel.replace(/\\/g, '/')) continue;
    if (re.test(fs.readFileSync(abs, 'utf8'))) hits += 1;
  }
  if (hits === 0) dead.push(name);
}
console.log(`barrel=${barrelRel} reexports=${reExportNames.length} dead=${dead.length}`);
dead.forEach((n) => console.log(n));
