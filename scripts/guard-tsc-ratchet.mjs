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

/**
 * معرّف غير معرَّف = استدعاء دالة غير موجودة وقت التشغيل. هذا الصنف لا مِسنَنة له:
 * صفر دائماً. خمس دوال مفقودة الاستيراد أسقطت ترحيل الأضابير الجزائية صامتةً.
 */
const FORBIDDEN_CODES = ['TS2304', 'TS2552'];

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
        const output = err.stdout || '';
        // خرج tsc بفشل دون أن يطبع تشخيصاً: انهيار، لا "صفر أخطاء".
        if (!output.trim()) {
            console.error('[tsc ratchet] tsc failed without producing diagnostics — treating as crash, not as zero errors');
            console.error(err.stderr || err.message || '(no stderr)');
            process.exit(2);
        }
        return output;
    }
}

const perFile = {};
const perCode = {};
const forbiddenHits = [];
for (const line of runTsc().split(/\r?\n/)) {
    const m = /^(.+?)\(\d+,\d+\): error (TS\d+)/.exec(line);
    if (!m) continue;
    const file = m[1].replace(/\\/g, '/');
    const code = m[2];
    perFile[file] = (perFile[file] ?? 0) + 1;
    perCode[code] = (perCode[code] ?? 0) + 1;
    if (FORBIDDEN_CODES.includes(code)) forbiddenHits.push(line.trim());
}
const total = Object.values(perFile).reduce((s, n) => s + n, 0);

if (forbiddenHits.length) {
    console.log(`FAIL: ${forbiddenHits.length} undefined identifier(s) — these throw ReferenceError at runtime:`);
    for (const hit of forbiddenHits) console.log(`  + ${hit}`);
    console.log('');
    console.log(`codes ${FORBIDDEN_CODES.join('/')} have no baseline allowance; add the missing import.`);
    process.exit(1);
}

if (process.argv.includes('--save') || !existsSync(join(ROOT, BASELINE))) {
    writeFileSync(
        join(ROOT, BASELINE),
        JSON.stringify({ savedAt: new Date().toISOString(), total, perCode, perFile }, null, 2),
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
