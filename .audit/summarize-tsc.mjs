#!/usr/bin/env node
/** تحليل مخرَج tsc مع كشف الترميز — PowerShell يكتب UTF-16LE افتراضياً */
import { readFileSync } from 'node:fs';

const buf = readFileSync('.audit/tsc-baseline.txt');
const text =
    buf.length > 1 && buf[0] === 0xff && buf[1] === 0xfe
        ? buf.toString('utf16le')
        : buf.includes(0)
          ? buf.toString('utf16le')
          : buf.toString('utf8');

const perFile = {};
const perCode = {};
for (const line of text.split(/\r?\n/)) {
    const m = /^(.+?)\((\d+),\d+\): error (TS\d+)/.exec(line);
    if (!m) continue;
    const file = m[1].replace(/\\/g, '/');
    perFile[file] = (perFile[file] ?? 0) + 1;
    perCode[m[3]] = (perCode[m[3]] ?? 0) + 1;
}

const inv = new Set(JSON.parse(readFileSync('.audit/execution-inventory.json', 'utf8')).records.map((r) => r.path));
const entries = Object.entries(perFile).sort((a, b) => b[1] - a[1]);
const total = entries.reduce((s, e) => s + e[1], 0);
const execEntries = entries.filter(([f]) => inv.has(f));

console.log(`TS errors: ${total} across ${entries.length} files`);
console.log(`in execution scope: ${execEntries.length} files / ${execEntries.reduce((s, e) => s + e[1], 0)} errors`);
console.log('');
console.log('--- top error codes ---');
for (const [c, n] of Object.entries(perCode).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(n).padStart(4)}  ${c}`);
}
console.log('');
console.log('--- top 20 files ---');
for (const [f, n] of entries.slice(0, 20)) {
    console.log(`  ${String(n).padStart(4)}  ${inv.has(f) ? '[EXEC]' : '[----]'}  ${f}`);
}
