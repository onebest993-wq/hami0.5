/**
 * حارس ميزانية chunks المسماة — يُستدعى من check-bundle-size أو منفصلاً.
 * يطابق stem قبل -[hash].js مع namedChunkMaxRawKb في perf-budget.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPerfBudget } from './load-perf-budget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

/** @returns {{ stem: string, file: string, rawKb: number }[]} */
export function listJsChunkSizes(dir = assetsDir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.js'))
        .map((file) => {
            const abs = path.join(dir, file);
            const rawKb = Math.round(fs.statSync(abs).size / 1024);
            const stem = file.replace(/-[A-Za-z0-9_]+\.js$/, '').replace(/\.js$/, '');
            return { stem, file, rawKb };
        });
}

/**
 * @param {{ namedChunkMaxRawKb?: Record<string, number> }} [budget]
 * @param {{ stem: string, file: string, rawKb: number }[]} [chunks]
 * @returns {{ ok: boolean, failures: string[], checked: number }}
 */
export function evaluateNamedChunkBudget(budget = loadPerfBudget(), chunks = listJsChunkSizes()) {
    const caps = budget.namedChunkMaxRawKb || {};
    const failures = [];
    let checked = 0;

    for (const [prefix, maxKb] of Object.entries(caps)) {
        const matches = chunks.filter(
            (c) => c.stem === prefix || c.stem.startsWith(`${prefix}-`) || c.file.startsWith(`${prefix}-`),
        );
        if (matches.length === 0) continue;
        const largest = matches.reduce((a, b) => (a.rawKb >= b.rawKb ? a : b));
        checked += 1;
        if (largest.rawKb > maxKb) {
            failures.push(
                `${largest.file}: ${largest.rawKb}KB raw exceeds named cap ${maxKb}KB (${prefix})`,
            );
        }
    }

    return { ok: failures.length === 0, failures, checked };
}

function main() {
    if (!fs.existsSync(assetsDir)) {
        console.error('[check-named-chunk-budget] dist/assets missing — run npm run build first');
        process.exit(1);
    }
    const result = evaluateNamedChunkBudget();
    if (result.checked === 0) {
        console.warn('[check-named-chunk-budget] no named chunks matched — skipped');
        return;
    }
    for (const f of result.failures) {
        console.error(`[check-named-chunk-budget] ${f}`);
    }
    if (!result.ok) process.exit(1);
    console.log(`[check-named-chunk-budget] OK (${result.checked} named stems checked)`);
}

const isDirect =
    process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
    main();
}
