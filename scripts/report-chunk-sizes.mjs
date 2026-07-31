/**
 * تقرير أحجام chunks بعد البناء — للمقارنة قبل/بعد تحسينات lazy/prefetch.
 * الاستخدام: npm run build && node scripts/report-chunk-sizes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

const KEYWORDS = [
    'LawyerDashboard',
    'ExecutionDashboard',
    'ExecutionCreation',
    'SmartFileModal',
    'NotepadModal',
    'TasksManager',
    'DecisionsHub',
    'DocumentVault',
    'CriminalDashboard',
    'TransactionsThreading',
    'index-',
];

function kb(bytes) {
    return Math.round((bytes / 1024) * 10) / 10;
}

if (!fs.existsSync(assetsDir)) {
    console.error('[report-chunk-sizes] dist/assets missing — run npm run build first');
    process.exit(1);
}

const rows = fs
    .readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .map((file) => {
        const raw = fs.readFileSync(path.join(assetsDir, file));
        const gzip = gzipSync(raw);
        return { file, rawKb: kb(raw.length), gzipKb: kb(gzip.length) };
    })
    .sort((a, b) => b.rawKb - a.rawKb);

const top = rows.slice(0, 25);
const _matched = rows.filter((r) => KEYWORDS.some((k) => r.file.includes(k) || fs.readFileSync(path.join(assetsDir, r.file), 'utf8').slice(0, 500).includes(k)));

console.log('\n=== Top 25 JS chunks (raw KB) ===');
for (const r of top) {
    console.log(`${String(r.rawKb).padStart(7)} KB raw | ${String(r.gzipKb).padStart(6)} KB gzip | ${r.file}`);
}

console.log('\n=== Entry + critical path ===');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
if (entryMatch) {
    const entry = rows.find((r) => r.file === entryMatch[1]);
    if (entry) console.log(`entry: ${entry.rawKb} KB raw / ${entry.gzipKb} KB gzip`);
}

const preloaded = [...indexHtml.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)].map((m) => m[1]);
let criticalGzip = 0;
for (const f of preloaded) {
    const row = rows.find((r) => r.file === f);
    if (row) {
        criticalGzip += row.gzipKb;
        console.log(`preload: ${row.rawKb} KB raw / ${row.gzipKb} KB gzip | ${f}`);
    }
}
console.log(`critical path (preload sum gzip): ~${Math.round(criticalGzip)} KB`);

console.log('\n=== Keyword-related chunks (filename heuristic) ===');
const byName = rows.filter((r) =>
    /Lawyer|Execution|SmartFile|Criminal|Notepad|Tasks|Decisions|DocumentVault|Transactions/i.test(r.file),
);
for (const r of byName.slice(0, 20)) {
    console.log(`${String(r.rawKb).padStart(7)} KB raw | ${String(r.gzipKb).padStart(6)} KB gzip | ${r.file}`);
}

console.log(`\nTotal JS chunks: ${rows.length}, total raw: ${kb(rows.reduce((s, r) => s + r.rawKb * 1024, 0))} KB\n`);
