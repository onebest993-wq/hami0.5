#!/usr/bin/env node
/**
 * لقطة حجم dist — للمقارنة قبل/بعد تحسينات الحجم.
 * Usage:
 *   npm run build && node scripts/report-size-baseline.mjs
 *   node scripts/report-size-baseline.mjs --save .audit/size-baseline.json
 *   node scripts/report-size-baseline.mjs --diff .audit/size-baseline.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');

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

function summarize() {
    const files = walk(DIST);
    const byExt = {};
    let total = 0;
    for (const abs of files) {
        const size = fs.statSync(abs).size;
        total += size;
        const ext = path.extname(abs) || '(none)';
        byExt[ext] = (byExt[ext] ?? 0) + size;
    }

    const jsFiles = fs.existsSync(ASSETS)
        ? fs
              .readdirSync(ASSETS)
              .filter((f) => f.endsWith('.js'))
              .map((file) => {
                  const raw = fs.statSync(path.join(ASSETS, file)).size;
                  return { file, rawBytes: raw };
              })
              .sort((a, b) => b.rawBytes - a.rawBytes)
        : [];

    const topJs = jsFiles.slice(0, 20).map((r) => ({
        file: r.file,
        rawKb: Math.round((r.rawBytes / 1024) * 10) / 10,
    }));

    const microUnder5k = jsFiles.filter((r) => r.rawBytes < 5 * 1024).length;

    return {
        generatedAt: new Date().toISOString(),
        totalMb: Math.round((total / (1024 * 1024)) * 100) / 100,
        fileCount: files.length,
        byExtMb: Object.fromEntries(
            Object.entries(byExt).map(([ext, bytes]) => [
                ext,
                Math.round((bytes / (1024 * 1024)) * 100) / 100,
            ]),
        ),
        js: {
            fileCount: jsFiles.length,
            totalMb: Math.round((jsFiles.reduce((s, r) => s + r.rawBytes, 0) / (1024 * 1024)) * 100) / 100,
            microUnder5k,
            top: topJs,
            hasExecutionLawsChunk: jsFiles.some((r) => /executionLaws\.articles/i.test(r.file)),
            hasVendorCapacitor: jsFiles.some((r) => /vendor-capacitor/i.test(r.file)),
            hasBundledPdfWorker: jsFiles.some((r) => /pdf\.worker/i.test(r.file)),
        },
        pdfAssetsMb: fs.existsSync(path.join(DIST, 'pdfjs-assets'))
            ? Math.round(
                  (walk(path.join(DIST, 'pdfjs-assets')).reduce(
                      (s, f) => s + fs.statSync(f).size,
                      0,
                  ) /
                      (1024 * 1024)) *
                      100,
              ) / 100
            : 0,
    };
}

function printReport(report) {
    console.log('\n=== Hami size baseline ===\n');
    console.log(`Total dist: ${report.totalMb} MB (${report.fileCount} files)`);
    console.log(`CSS total: ${report.byExtMb['.css'] ?? 0} MB`);
    console.log(`JS: ${report.js.totalMb} MB (${report.js.fileCount} files, micro<5KB: ${report.js.microUnder5k})`);
    console.log(`executionLaws.articles chunk: ${report.js.hasExecutionLawsChunk ? 'YES (leak)' : 'no'}`);
    console.log(`vendor-capacitor chunk: ${report.js.hasVendorCapacitor ? 'yes' : 'no (web slim)'}`);
    console.log(`pdf.worker in assets: ${report.js.hasBundledPdfWorker ? 'YES (leak)' : 'no'}`);
    console.log(`pdfjs-assets folder: ${report.pdfAssetsMb} MB`);
    console.log('\nTop JS:');
    for (const row of report.js.top) {
        console.log(`  ${String(row.rawKb).padStart(7)} KB  ${row.file}`);
    }
    console.log('');
}

const args = process.argv.slice(2);
const saveIdx = args.indexOf('--save');
const diffIdx = args.indexOf('--diff');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('[size-baseline] dist missing — run npm run build first');
    process.exit(1);
}

const report = summarize();
printReport(report);

if (saveIdx >= 0) {
    const out = args[saveIdx + 1] ?? path.join(ROOT, '.audit', 'size-baseline.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[size-baseline] saved → ${path.relative(ROOT, out)}`);
}

if (diffIdx >= 0) {
    const baselinePath = args[diffIdx + 1] ?? path.join(ROOT, '.audit', 'size-baseline.json');
    if (!fs.existsSync(baselinePath)) {
        console.error(`[size-baseline] baseline missing: ${baselinePath}`);
        process.exit(1);
    }
    const before = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const dTotal = report.totalMb - before.totalMb;
    const dJs = report.js.totalMb - before.js.totalMb;
    const dMicro = report.js.microUnder5k - before.js.microUnder5k;
    console.log('[size-baseline] diff vs saved baseline:');
    console.log(`  total: ${dTotal >= 0 ? '+' : ''}${dTotal.toFixed(2)} MB`);
    console.log(`  JS:    ${dJs >= 0 ? '+' : ''}${dJs.toFixed(2)} MB`);
    console.log(`  micro: ${dMicro >= 0 ? '+' : ''}${dMicro}`);
}
