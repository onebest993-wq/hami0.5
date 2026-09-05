/**
 * قياس الإغلاق الساكن لكل مدخل قسم من مخرجات dist مباشرة.
 * يقرأ import/from الساكنة في كل chunk ويحسب الإغلاق المتعدّي.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));

const staticImports = new Map();
const dynamicImports = new Map();
const sizes = new Map();

const STATIC_RE = /(?:^|[;}\s])(?:import|export)\s*(?:[^"']*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const DYNAMIC_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;

for (const f of files) {
    const p = path.join(ASSETS, f);
    const code = fs.readFileSync(p, 'utf8');
    sizes.set(f, fs.statSync(p).size);
    const s = new Set();
    const d = new Set();
    for (const m of code.matchAll(STATIC_RE)) s.add(m[1]);
    for (const m of code.matchAll(DYNAMIC_RE)) d.add(m[1]);
    for (const x of d) s.delete(x);
    staticImports.set(f, s);
    dynamicImports.set(f, d);
}

function closure(entry) {
    const seen = new Set();
    const stack = [entry];
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const dep of staticImports.get(cur) ?? []) stack.push(dep);
    }
    let bytes = 0;
    for (const c of seen) bytes += sizes.get(c) ?? 0;
    return { count: seen.size, kb: Math.round(bytes / 1024) };
}

const targets = process.argv.slice(2);
const picked = targets.length
    ? files.filter((f) => targets.some((t) => f.startsWith(t)))
    : files;

const rows = picked
    .map((f) => ({ chunk: f, ...closure(f), ownKb: Math.round((sizes.get(f) ?? 0) / 1024) }))
    .sort((a, b) => b.kb - a.kb);

console.log('chunk\tclosureModules\tclosureKB\townKB');
for (const r of rows.slice(0, 40)) {
    console.log(`${r.chunk}\t${r.count}\t${r.kb}\t${r.ownKb}`);
}
