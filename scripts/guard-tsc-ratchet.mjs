#!/usr/bin/env node
/**
 * مِسنَنة أخطاء الأنواع — خطّ أساس لكل ملف، يُسقط عند أي تصاعد.
 *
 * الحالة عند التثبيت: 299 خطأ في 96 ملفاً، **مع** `strict: false` و195 ملفاً
 * معفياً بـ`@ts-nocheck`. أي أن `npm run typecheck` لم يكن أخضر يوماً، فبوّابة
 * «صفر أخطاء» غير واقعية اليوم. المِسنَنة تسمح بالإرث وتمنع الزيادة، وتُسقط
 * فوراً عند ظهور خطأ في ملف كان نظيفاً.
 *
 *   node scripts/guard-tsc-ratchet.mjs          # فحص
 *   node scripts/guard-tsc-ratchet.mjs --save   # تثبيت خطّ أساس جديد
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASELINE = '.audit/tsc-ratchet-baseline.json';

function runTsc() {
    const cli = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
    if (!existsSync(cli)) {
        console.error(`[tsc ratchet] typescript not found at ${cli} — run npm install`);
        process.exit(2);
    }
    try {
        execFileSync(process.execPath, [cli, '--noEmit', '--pretty', 'false'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 128 * 1024 * 1024,
        });
        return '';
    } catch (err) {
        return err.stdout || '';
    }
}

const perFile = {};
for (const line of runTsc().split(/\r?\n/)) {
    const m = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line);
    if (!m) continue;
    const file = m[1].replace(/\\/g, '/');
    perFile[file] = (perFile[file] ?? 0) + 1;
}
const total = Object.values(perFile).reduce((s, n) => s + n, 0);

if (process.argv.includes('--save') || !existsSync(join(ROOT, BASELINE))) {
    writeFileSync(
        join(ROOT, BASELINE),
        JSON.stringify({ savedAt: new Date().toISOString(), total, perFile }, null, 2),
        'utf8',
    );
    console.log(`[tsc ratchet] baseline saved: ${total} errors across ${Object.keys(perFile).length} files`);
    process.exit(0);
}

const base = JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'));
const regressed = [];
const improved = [];
for (const [file, count] of Object.entries(perFile)) {
    const was = base.perFile?.[file] ?? 0;
    if (count > was) regressed.push({ file, was, now: count });
}
for (const [file, was] of Object.entries(base.perFile ?? {})) {
    const now = perFile[file] ?? 0;
    if (now < was) improved.push({ file, was, now });
}

console.log(`[tsc ratchet] errors  baseline ${base.total}  ->  current ${total}`);

if (improved.length) {
    console.log('');
    console.log(`good: ${improved.length} file(s) improved`);
    for (const i of improved.slice(0, 15)) console.log(`  - ${i.file}: ${i.was} -> ${i.now}`);
}

if (regressed.length) {
    console.log('');
    console.log(`FAIL: ${regressed.length} file(s) gained type errors:`);
    for (const r of regressed) console.log(`  + ${r.file}: ${r.was} -> ${r.now}`);
    console.log('');
    console.log('a new type error is how the execution section acquired a runtime crash');
    console.log('and three imports pointing at files that do not exist.');
    process.exit(1);
}

if (improved.length) {
    console.log('');
    console.log('run with --save to lock in the improvement');
}
console.log('');
console.log('[tsc ratchet] OK — no regression');
