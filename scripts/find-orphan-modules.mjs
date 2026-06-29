import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const files = [];

function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '__tests__') continue;
            walk(p);
        } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
            files.push(p);
        }
    }
}
walk(SRC);

const importers = new Map(files.map((f) => [f, 0]));

function moduleKeys(filePath) {
    const rel = path.relative(SRC, filePath).replace(/\\/g, '/');
    const noExt = rel.replace(/\.(tsx?|jsx?)$/, '');
    const base = path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
    return new Set([
        `@/${rel.replace(/\.(tsx?|jsx?)$/, '')}`,
        `@/app/${noExt.replace(/^app\//, '')}`,
        `./${base}`,
        `../${base}`,
        noExt,
        base,
        filePath.replace(/\\/g, '/'),
    ]);
}

for (const file of files) {
    let text = '';
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        continue;
    }
    for (const other of files) {
        if (other === file) continue;
        const keys = moduleKeys(other);
        for (const k of keys) {
            if (k.length < 4) continue;
            if (text.includes(k)) {
                importers.set(other, (importers.get(other) ?? 0) + 1);
                break;
            }
        }
    }
}

const skip = (f) =>
    f.includes('__tests__') ||
    f.endsWith('.test.ts') ||
    f.endsWith('.test.tsx') ||
    f.endsWith('.spec.ts') ||
    f.includes('main.tsx') ||
    f.includes('App.tsx') ||
    f.includes('vite-env');

const orphans = [...importers.entries()]
    .filter(([f, n]) => n === 0 && !skip(f))
    .map(([f]) => path.relative(ROOT, f).replace(/\\/g, '/'))
    .sort();

console.log(JSON.stringify({ count: orphans.length, orphans }, null, 2));
