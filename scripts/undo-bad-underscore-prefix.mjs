/**
 * Undo unsafe underscore prefixes on object keys / exports / imports
 * introduced by scripts/prefix-unused-vars.mjs.
 *
 * Transforms:
 * - `{ _foo` → `{ foo: _foo` (destructure)
 * - `import { _foo` → `import { foo as _foo`
 * - `export function _foo` / `export const _foo` → without underscore on export name
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let filesChanged = 0;
let edits = 0;

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  // export function _name → export function name
  src = src.replace(/\bexport\s+(async\s+)?function\s+_([A-Za-z]\w*)/g, 'export $1function $2');
  // export const _name = → export const name =
  src = src.replace(/\bexport\s+const\s+_([A-Za-z]\w*)\b/g, 'export const $1');
  // export type/interface _name
  src = src.replace(/\bexport\s+(type|interface)\s+_([A-Za-z]\w*)\b/g, 'export $1 $2');

  // import { _foo → import { foo as _foo
  src = src.replace(/import\s*\{([^}]*)\}/g, (full, inner) => {
    const next = inner.replace(/(^|,)(\s*)_([A-Za-z]\w*)(\s*)(?=,|$)/g, (m, sep, sp1, name, sp2) => {
      // already aliased?
      if (/\bas\b/.test(m)) return m;
      return `${sep}${sp1}${name} as _${name}${sp2}`;
    });
    return `import {${next}}`;
  });

  // destructure { _foo → { foo: _foo  (but not { foo: _foo already)
  // Avoid matching `{ _foo:` already aliased wrong
  src = src.replace(/\{([^{}]{0,800})\}/g, (full, inner) => {
    // skip if looks like a type/object value block with many colons from types - heuristic: only if contains _ident without colon before
    const next = inner.replace(/(^|,)(\s*)_([A-Za-z]\w*)(\s*)(?=,|$|=)/g, (m, sep, sp1, name, sp2, offset, str) => {
      // if already `name: _name` form somewhere — check preceding
      const ahead = str.slice(Math.max(0, offset - 40), offset);
      if (/:\s*$/.test(ahead)) return m; // value position
      if (new RegExp(`${name}\\s*:\\s*_?${name}`).test(m)) return m;
      // `{ _foo =` default
      if (/=/.test(m)) {
        return `${sep}${sp1}${name}: _${name}${sp2}`;
      }
      return `${sep}${sp1}${name}: _${name}${sp2}`;
    });
    return `{${next}}`;
  });

  if (src !== before) {
    fs.writeFileSync(file, src);
    filesChanged += 1;
    edits += 1;
  }
}

console.log(JSON.stringify({ filesChanged, edits }, null, 2));
