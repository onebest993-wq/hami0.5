/**
 * يحسب حجم المسار الحرج الحقيقي: entry + modulepreload + كل static imports المتسلسلة.
 * الاستخدام: npm run build && node scripts/analyze-entry-critical-path.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'dist', 'assets');
const indexHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
const entry = entryMatch?.[1];
if (!entry) {
    console.error('[analyze-entry-critical-path] entry chunk missing — run build first');
    process.exit(1);
}

const preloaded = [...indexHtml.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)].map(
    (m) => m[1],
);

const visited = new Set([entry, ...preloaded]);
const queue = [...visited];
let totalGzip = 0;
let totalRaw = 0;

while (queue.length) {
    const file = queue.shift();
    if (!file || !visited.has(file)) continue;
    const abs = path.join(assetsDir, file);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs);
    const gzip = gzipSync(raw);
    totalRaw += raw.length;
    totalGzip += gzip.length;
    const s = raw.toString('utf8');
    for (const match of s.matchAll(/from"\.\/([^"]+\.js)"/g)) {
        const imp = match[1];
        if (!visited.has(imp)) {
            visited.add(imp);
            queue.push(imp);
        }
    }
}

console.log(`[analyze-entry-critical-path] entry ${entry}`);
console.log(`[analyze-entry-critical-path] files ${visited.size}`);
console.log(`[analyze-entry-critical-path] raw ~${Math.round(totalRaw / 1024)}KB gzip ~${Math.round(totalGzip / 1024)}KB`);
