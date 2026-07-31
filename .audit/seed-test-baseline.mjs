#!/usr/bin/env node
/** يبني خطّ أساس مِسنَنة الاختبارات من تقرير vitest موجود، ويحلّل توزيع الفشل */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

const ROOT = process.cwd();
const toPosix = (p) => p.split(sep).join('/');
const report = JSON.parse(readFileSync('.audit/vitest-baseline.json', 'utf8'));

const failures = new Set();
const perFile = {};
for (const suite of report.testResults ?? []) {
    const file = toPosix(relative(ROOT, suite.name ?? ''));
    for (const t of suite.assertionResults ?? []) {
        if (t.status !== 'failed') continue;
        failures.add(`${file} :: ${(t.fullName || t.title || '').trim()}`);
        perFile[file] = (perFile[file] ?? 0) + 1;
    }
}
const sorted = [...failures].sort();

writeFileSync(
    '.audit/test-ratchet-baseline.json',
    JSON.stringify(
        {
            savedAt: new Date().toISOString(),
            numTotalTests: report.numTotalTests ?? 0,
            numFailedTests: report.numFailedTests ?? sorted.length,
            numFailedTestSuites: report.numFailedTestSuites ?? 0,
            failures: sorted,
        },
        null,
        2,
    ),
    'utf8',
);

const inv = new Set(JSON.parse(readFileSync('.audit/execution-inventory.json', 'utf8')).records.map((r) => r.path));
const entries = Object.entries(perFile).sort((a, b) => b[1] - a[1]);
const execEntries = entries.filter(([f]) => inv.has(f));

console.log(`baseline written: ${sorted.length} failing tests of ${report.numTotalTests} total`);
console.log(`failing test files: ${entries.length}`);
console.log(`  of which in execution scope: ${execEntries.length} files / ${execEntries.reduce((s, e) => s + e[1], 0)} tests`);
console.log('');
console.log('--- top 20 failing test files ---');
for (const [f, n] of entries.slice(0, 20)) {
    console.log(`  ${String(n).padStart(4)}  ${inv.has(f) ? '[EXEC]' : '[----]'}  ${f}`);
}
