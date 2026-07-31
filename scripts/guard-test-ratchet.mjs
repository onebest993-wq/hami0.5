#!/usr/bin/env node
/**
 * مِسنَنة الاختبارات — خطّ أساس للاختبارات الفاشلة، يُسقط عند أي فشل جديد.
 *
 * الحالة عند التثبيت: 216 اختباراً فاشلاً في 77 ملفاً من 6,063. المجموعة حمراء
 * أصلاً، فبوّابة «كل الاختبارات تنجح» تُسقط كل بناء فتُهمَل. المِسنَنة تُثبّت
 * الإرث وتُسقط فوراً عند فشل اختبار كان ناجحاً — وهذا هو الانحدار الحقيقي.
 *
 *   node scripts/guard-test-ratchet.mjs          # فحص
 *   node scripts/guard-test-ratchet.mjs --save   # تثبيت خطّ أساس جديد
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const BASELINE = '.audit/test-ratchet-baseline.json';
const REPORT = '.audit/vitest-run.json';
const toPosix = (p) => p.split(sep).join('/');

function runVitest() {
    const cli = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
    const args = existsSync(cli)
        ? [cli, 'run', '--reporter=json', `--outputFile=${REPORT}`]
        : [join(ROOT, 'node_modules', '.bin', 'vitest'), 'run', '--reporter=json', `--outputFile=${REPORT}`];
    try {
        execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    } catch {
        // كود خروج غير صفري متوقّع مع وجود فشل — التقرير هو المصدر
    }
    if (!existsSync(join(ROOT, REPORT))) {
        console.error(`[test ratchet] vitest produced no report at ${REPORT}`);
        process.exit(2);
    }
    return JSON.parse(readFileSync(join(ROOT, REPORT), 'utf8'));
}

/** يجمع أسماء الاختبارات الفاشلة بمفتاح مستقر: مسار الملف + العنوان الكامل */
function collectFailures(report) {
    const failures = new Set();
    for (const suite of report.testResults ?? []) {
        const file = toPosix(relative(ROOT, suite.name ?? ''));
        for (const t of suite.assertionResults ?? []) {
            if (t.status === 'failed') failures.add(`${file} :: ${(t.fullName || t.title || '').trim()}`);
        }
    }
    return [...failures].sort();
}

const report = runVitest();
const failures = collectFailures(report);
const summary = {
    numTotalTests: report.numTotalTests ?? 0,
    numFailedTests: report.numFailedTests ?? failures.length,
    numFailedTestSuites: report.numFailedTestSuites ?? 0,
};

if (process.argv.includes('--save') || !existsSync(join(ROOT, BASELINE))) {
    writeFileSync(
        join(ROOT, BASELINE),
        JSON.stringify({ savedAt: new Date().toISOString(), ...summary, failures }, null, 2),
        'utf8',
    );
    console.log(`[test ratchet] baseline saved: ${failures.length} failing tests of ${summary.numTotalTests}`);
    process.exit(0);
}

const base = JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'));
const baseSet = new Set(base.failures ?? []);
const added = failures.filter((f) => !baseSet.has(f));
const fixed = (base.failures ?? []).filter((f) => !failures.includes(f));

console.log(`[test ratchet] failing  baseline ${base.failures?.length ?? 0}  ->  current ${failures.length}`);
console.log(`[test ratchet] total tests ${summary.numTotalTests}`);

if (fixed.length) {
    console.log('');
    console.log(`good: ${fixed.length} test(s) now pass`);
    for (const f of fixed.slice(0, 20)) console.log(`  - ${f}`);
}

if (added.length) {
    console.log('');
    console.log(`FAIL: ${added.length} test(s) newly failing:`);
    for (const f of added.slice(0, 40)) console.log(`  + ${f}`);
    if (added.length > 40) console.log(`  ... and ${added.length - 40} more`);
    process.exit(1);
}

if (fixed.length) {
    console.log('');
    console.log('run with --save to lock in the improvement');
}
console.log('');
console.log('[test ratchet] OK — no new failures');
