/**
 * Undo first-fixer damage in compiled JS:
 *   var a:_a, b:_b  →  var _a, _b
 *   for (i:_i, ...) → for (_i, ...)
 * Does NOT touch object literals `{ a: _a }` (preceded by `{` or after `=` in objects).
 * Heuristic: only rewrite when the match is inside a var/let/const/for declaration list.
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app/api'];
const exts = new Set(['.js']);

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (exts.has(path.extname(e.name))) acc.push(p);
    }
    return acc;
}

const pairRe = /\b([A-Za-z])(:_\1)\b/g;

let files = 0;
let total = 0;
for (const root of roots) {
    for (const file of walk(root)) {
        const src = fs.readFileSync(file, 'utf8');
        if (!/:\s*_[A-Za-z]/.test(src)) continue;
        let count = 0;
        // Fix `name:_name` → `_name` everywhere in .js for single-letter ts helpers
        // and also multi-letter: `nowMs:_nowMs` in params
        const out = src
            .replace(/\b([A-Za-z][\w]*):(_\1)\b/g, (full, bare, underscored, offset) => {
                // Skip object literals: look back for `{` without `var|let|const|for|(` declaration intent
                const before = src.slice(Math.max(0, offset - 40), offset);
                if (/[{,]\s*$/.test(before) && !/\b(var|let|const|for)\b[^;{]*$/.test(before)) {
                    // might be object - keep if preceded by { or ,
                    if (/[{,]\s*$/.test(before)) return full;
                }
                count++;
                return underscored;
            });
        if (count > 0 && out !== src) {
            fs.writeFileSync(file, out);
            files++;
            total += count;
            console.log(`${count}\t${file}`);
        }
    }
}
console.log(JSON.stringify({ files, total }));
