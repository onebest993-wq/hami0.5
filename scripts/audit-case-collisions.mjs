/**
 * يكتشف تعارض أسماء الملفات على Windows (case-insensitive FS)
 * مثل quantumTasksContext.ts + QuantumTasksContext.tsx في نفس المجلد.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'src');

function stem(filename) {
  return filename.replace(/\.[^.]+$/u, '').toLowerCase();
}

/** @param {string} dir */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '__tests__') continue;
      walk(abs, out);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/u.test(name.name)) {
      out.push(abs);
    }
  }
  return out;
}

const files = walk(root);
/** @type {Map<string, string[]>} */
const byDirStem = new Map();

for (const file of files) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  const key = `${dir}|${stem(base)}`;
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const list = byDirStem.get(key) ?? [];
  list.push(rel);
  byDirStem.set(key, list);
}

const collisions = [...byDirStem.entries()].filter(([, list]) => {
  if (list.length <= 1) return false;
  const basenames = new Set(list.map((rel) => path.basename(rel)));
  return basenames.size > 1;
});

if (collisions.length === 0) {
  console.log('[audit-case-collisions] OK — no same-folder case-insensitive stem collisions under src/');
  process.exit(0);
}

console.error('[audit-case-collisions] Found same-folder case-insensitive stem collisions:');
for (const [key, list] of collisions) {
  console.error(`  ${key.split('|')[1]} in ${path.relative(path.join(__dirname, '..'), key.split('|')[0]).replace(/\\/g, '/')}:`);
  for (const rel of list) console.error(`    - ${rel}`);
}
process.exit(1);
