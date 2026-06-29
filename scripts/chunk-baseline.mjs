/**
 * حفظ/مقارنة baseline أحجام chunks.
 * الاستخدام:
 *   npm run build:chunks
 *   node scripts/chunk-baseline.mjs save
 *   node scripts/chunk-baseline.mjs diff
 *   node scripts/chunk-baseline.mjs diff --fail
 */
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPerfBudget } from './load-perf-budget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(__dirname, 'chunk-baseline.json');
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');
const budget = loadPerfBudget();
const WATCH = budget.chunkRegression?.watchPrefixes ?? [];

function collect() {
    if (!fs.existsSync(assetsDir)) {
        console.error('[chunk-baseline] run npm run build first');
        process.exit(1);
    }
    const rows = fs
        .readdirSync(assetsDir)
        .filter((f) => f.endsWith('.js'))
        .map((file) => {
            const raw = fs.readFileSync(path.join(assetsDir, file));
            return { file, rawKb: Math.round((raw.length / 1024) * 10) / 10 };
        })
        .filter((r) => WATCH.some((w) => r.file.includes(w)))
        .sort((a, b) => b.rawKb - a.rawKb);
    return { capturedAt: new Date().toISOString(), rows };
}

function chunkPrefix(file) {
    return file.replace(/-[a-zA-Z0-9]+\.js$/, '');
}

const cmd = process.argv[2] || 'save';
const failOnRegression = process.argv.includes('--fail');
const maxPct = budget.chunkRegression?.maxPercentIncrease ?? 5;

if (cmd === 'save') {
    const data = collect();
    fs.writeFileSync(baselinePath, JSON.stringify(data, null, 2) + '\n');
    console.log('[chunk-baseline] saved', baselinePath);
    for (const r of data.rows) console.log(`  ${r.rawKb} KB | ${r.file}`);
    process.exit(0);
}

if (cmd === 'diff') {
    if (!fs.existsSync(baselinePath)) {
        console.error('[chunk-baseline] no baseline — run: node scripts/chunk-baseline.mjs save');
        process.exit(1);
    }
    const prev = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const next = collect();
    const prevMap = new Map(prev.rows.map((r) => [chunkPrefix(r.file), r.rawKb]));
    console.log('[chunk-baseline] diff (by chunk prefix, KB raw):');
    let failed = false;
    for (const r of next.rows) {
        const key = chunkPrefix(r.file);
        const before = prevMap.get(key);
        if (before == null) {
            console.log(`  + ${r.rawKb} KB | ${r.file} (new)`);
        } else {
            const delta = Math.round((r.rawKb - before) * 10) / 10;
            const sign = delta > 0 ? '+' : '';
            const pct = before > 0 ? Math.round((delta / before) * 1000) / 10 : 0;
            console.log(`  ${sign}${delta} KB (${before} → ${r.rawKb}, ${sign}${pct}%) | ${key}`);
            if (failOnRegression && delta > 0 && pct > maxPct) {
                console.error(`[chunk-baseline] regression ${key}: +${pct}% > ${maxPct}%`);
                failed = true;
            }
        }
    }
    process.exit(failed ? 1 : 0);
}

console.error('usage: save | diff [--fail]');
process.exit(1);
