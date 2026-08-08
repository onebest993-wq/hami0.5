#!/usr/bin/env node
/**
 * تقرير ميزانية dist — يُبرز الأصول الثقيلة بعد البناء.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function walk(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(abs));
        else out.push(abs);
    }
    return out;
}

function rel(abs) {
    return path.relative(dist, abs).replace(/\\/g, '/');
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('[dist-budget] dist/index.html missing — run npm run build first');
    process.exit(1);
}

const files = walk(dist).map((abs) => ({
    rel: rel(abs),
    size: fs.statSync(abs).size,
}));

files.sort((a, b) => b.size - a.size);
const total = files.reduce((sum, f) => sum + f.size, 0);

const heavy = files.filter((f) => f.size >= 200 * 1024).slice(0, 20);
const hasSentry = files.some((f) => /vendor-sentry/i.test(f.rel));
const hasPdfWorker = files.some((f) => /pdf\.worker/i.test(f.rel));

console.log('\n=== Hami dist budget ===\n');
console.log(`Total: ${(total / (1024 * 1024)).toFixed(2)} MB (${files.length} files)`);
console.log(`vendor-sentry in bundle: ${hasSentry ? 'yes' : 'no (slim)'}`);
console.log(`pdf.worker present: ${hasPdfWorker ? 'yes (vault lazy)' : 'no'}`);
console.log('\nTop heavy assets (>= 200 KB):\n');
for (const f of heavy) {
    console.log(`  ${(f.size / 1024).toFixed(1).padStart(8)} KB  ${f.rel}`);
}
console.log('');
