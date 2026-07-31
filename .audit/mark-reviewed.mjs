#!/usr/bin/env node
/**
 * تعليم وحدات مفحوصة في سجل التغطية.
 * الاستخدام: node .audit/mark-reviewed.mjs <round> <module> [module...]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), '.audit', 'execution-inventory.json');
const [round, ...modules] = process.argv.slice(2);

if (!round || modules.length === 0) {
    console.error('usage: node .audit/mark-reviewed.mjs <round> <module> [module...]');
    process.exit(1);
}

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const set = new Set(modules);
let marked = 0;

for (const r of data.records) {
    if (set.has(r.module) && !r.reviewed) {
        r.reviewed = true;
        r.reviewedInRound = Number(round);
        marked += 1;
    }
}

const reviewed = data.records.filter((r) => r.reviewed);
const pending = data.records.filter((r) => !r.reviewed);

data.coverage = {
    reviewedFiles: reviewed.length,
    reviewedLines: reviewed.reduce((s, r) => s + r.lines, 0),
    pendingFiles: pending.length,
    pendingLines: pending.reduce((s, r) => s + r.lines, 0),
    percentFiles: Number(((reviewed.length / data.records.length) * 100).toFixed(1)),
    percentLines: Number(((reviewed.reduce((s, r) => s + r.lines, 0) / data.totals.lines) * 100).toFixed(1)),
};

writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');

console.log(`round ${round}: marked ${marked} files across ${modules.length} module(s)`);
console.log(
    `coverage: ${data.coverage.reviewedFiles}/${data.records.length} files (${data.coverage.percentFiles}%) | ${data.coverage.reviewedLines}/${data.totals.lines} lines (${data.coverage.percentLines}%)`,
);
console.log('');
console.log('PENDING modules:');
const byModule = {};
for (const r of pending) {
    byModule[r.module] ??= { files: 0, lines: 0 };
    byModule[r.module].files += 1;
    byModule[r.module].lines += r.lines;
}
for (const [m, v] of Object.entries(byModule).sort((a, b) => b[1].lines - a[1].lines)) {
    console.log(`  ${m.padEnd(26)} ${String(v.files).padStart(5)} files  ${String(v.lines).padStart(7)} lines`);
}
