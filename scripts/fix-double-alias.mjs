/**
 * Undo double-alias damage from the first destructure fixer:
 *   parentId: drop: _drop  →  parentId: _drop
 *   timelineEvents: tl: _tl  →  timelineEvents: _tl
 *   foo: foo: _foo  →  foo: _foo
 */
import fs from 'node:fs';
import path from 'node:path';

const root = 'src';
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (exts.has(path.extname(e.name))) acc.push(p);
    }
    return acc;
}

const re = /([A-Za-z_$][\w$]*):\s*([A-Za-z_$][\w$]*):\s*(_[A-Za-z_$][\w$]*)/g;

let files = 0;
let total = 0;
for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes(': _') && !/:\s*\w+:\s*_/.test(src)) continue;
    let count = 0;
    const out = src.replace(re, (full, key, mid, underscored) => {
        // Only fix when underscored is `_` + mid OR `_` + key (common cases)
        if (underscored === `_${mid}` || underscored === `_${key}`) {
            count++;
            return `${key}: ${underscored}`;
        }
        return full;
    });
    if (count > 0 && out !== src) {
        fs.writeFileSync(file, out);
        files++;
        total += count;
        console.log(`${count}\t${file}`);
    }
}
console.log(JSON.stringify({ files, total }));
