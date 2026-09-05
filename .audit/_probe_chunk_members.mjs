/**
 * أثقل أعضاء الإغلاق الساكن لمدخل واحد + أقصر مسار سحب لكل عضو.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const staticImports = new Map();
const sizes = new Map();

const STATIC_RE = /(?:^|[;}\s])(?:import|export)\s*(?:[^"']*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const DYNAMIC_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;

for (const f of files) {
    const code = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    sizes.set(f, fs.statSync(path.join(ASSETS, f)).size);
    const s = new Set();
    for (const m of code.matchAll(STATIC_RE)) s.add(m[1]);
    for (const m of code.matchAll(DYNAMIC_RE)) s.delete(m[1]);
    staticImports.set(f, s);
}

const entryPrefix = process.argv[2];
const entry = files.find((f) => f.startsWith(entryPrefix));
if (!entry) {
    console.error('entry not found', entryPrefix);
    process.exit(1);
}

const parent = new Map([[entry, null]]);
const queue = [entry];
while (queue.length) {
    const cur = queue.shift();
    for (const dep of staticImports.get(cur) ?? []) {
        if (!parent.has(dep)) {
            parent.set(dep, cur);
            queue.push(dep);
        }
    }
}

function trail(node) {
    const out = [];
    let cur = node;
    while (cur) {
        out.unshift(cur.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''));
        cur = parent.get(cur);
    }
    return out.join(' < ');
}

const rows = [...parent.keys()]
    .map((f) => ({ f, kb: Math.round((sizes.get(f) ?? 0) / 1024) }))
    .sort((a, b) => b.kb - a.kb);

const total = rows.reduce((a, b) => a + b.kb, 0);
console.log(`ENTRY=${entry}  members=${rows.length}  totalKB=${total}\n`);
console.log('KB\tpullPath');
for (const r of rows.slice(0, 22)) console.log(`${r.kb}\t${trail(r.f)}`);
