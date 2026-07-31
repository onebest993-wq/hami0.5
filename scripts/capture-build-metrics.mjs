/**
 * Capture production JS metrics for before/after performance reports.
 * Usage: node scripts/capture-build-metrics.mjs [--label=now]
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'now';
const outPath = path.join(ROOT, '.cursor', `build-metrics-${label}.json`);

function kb(bytes) {
    return Math.round((bytes / 1024) * 10) / 10;
}

if (!fs.existsSync(assetsDir)) {
    console.error('[capture-build-metrics] dist/assets missing — run npm run build first');
    process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const rows = jsFiles.map((file) => {
    const raw = fs.readFileSync(path.join(assetsDir, file));
    return { file, rawKb: kb(raw.length), gzipKb: kb(gzipSync(raw).length) };
});
rows.sort((a, b) => b.rawKb - a.rawKb);

const indexHtml = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
const entry = entryMatch ? rows.find((r) => r.file === entryMatch[1]) : null;
const preloaded = [...indexHtml.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)].map(
    (m) => m[1],
);
let criticalPathGzipKb = 0;
const preloadRows = [];
for (const f of preloaded) {
    const row = rows.find((r) => r.file === f);
    if (row) {
        criticalPathGzipKb += row.gzipKb;
        preloadRows.push(row);
    }
}

const surfaces = [
    { id: 'ExecutionDashboard', re: /ExecutionDashboard/i },
    { id: 'criminal-runtime', re: /criminal-runtime|CriminalDashboard/i },
    { id: 'SmartFileModal', re: /SmartFileModal/i },
    { id: 'FinancialOperations', re: /FinancialOperations/i },
    { id: 'SmartRepository', re: /SmartRepository/i },
    { id: 'TransactionsThreading', re: /TransactionsThreading/i },
];

const surfaceLargest = surfaces.map((s) => {
    const hit = rows.find((r) => s.re.test(r.file));
    return hit
        ? { id: s.id, file: hit.file, rawKb: hit.rawKb, gzipKb: hit.gzipKb }
        : { id: s.id, file: null, rawKb: null, gzipKb: null };
});

const payload = {
    capturedAt: new Date().toISOString(),
    label,
    totalJsChunks: rows.length,
    totalRawKb: Math.round(rows.reduce((s, r) => s + r.rawKb, 0) * 10) / 10,
    totalGzipKb: Math.round(rows.reduce((s, r) => s + r.gzipKb, 0) * 10) / 10,
    criticalPathGzipKb: Math.round(criticalPathGzipKb * 10) / 10,
    entryGzipKb: entry?.gzipKb ?? null,
    entryRawKb: entry?.rawKb ?? null,
    entryFile: entry?.file ?? null,
    preloadCount: preloadRows.length,
    top15: rows.slice(0, 15),
    surfaceLargest,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
console.log(`[capture-build-metrics] wrote ${outPath}`);
