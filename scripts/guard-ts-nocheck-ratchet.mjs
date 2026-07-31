#!/usr/bin/env node
/**
 * مِسنَنة @ts-nocheck — تمنع تصاعد فقدان الفحص النوعي.
 *
 * السبب: 107 سكربتات في هذا المستودع تُعدّل الكود المصدري، و27 منها تزرع
 * `@ts-nocheck` في ملفات حسّاسة. الحارس بالاستيراد يستلزم تعديل 107 ملفات
 * (تعديل جماعي خطر بذاته)، أما المِسنَنة فلا تُنسى ولا تُتجاوَز.
 *
 * السلوك: يُسقط عند ارتفاع العدد عن خطّ الأساس. الانخفاض يُقبل ويُطلب تحديث الأساس.
 *
 *   node scripts/guard-ts-nocheck-ratchet.mjs          # فحص
 *   node scripts/guard-ts-nocheck-ratchet.mjs --save   # تثبيت خطّ أساس جديد
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const BASELINE = '.audit/ts-nocheck-baseline.json';
const SCAN_DIRS = ['src', 'api'];
const toPosix = (p) => p.split(sep).join('/');

function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name === 'dist') continue;
            walk(p, out);
        } else if (/\.(ts|tsx|mts|cts)$/.test(e.name)) {
            out.push(p);
        }
    }
    return out;
}

const offenders = [];
for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
        let src = '';
        try {
            src = readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        // @ts-nocheck نافذ فقط في مقدّمة الملف
        if (/^\s*(?:\/\/|\/\*)\s*@ts-nocheck\b/m.test(src.slice(0, 600))) {
            offenders.push(toPosix(relative(ROOT, file)));
        }
    }
}
offenders.sort();

const save = process.argv.includes('--save');
if (save || !existsSync(join(ROOT, BASELINE))) {
    writeFileSync(
        join(ROOT, BASELINE),
        JSON.stringify({ savedAt: new Date().toISOString(), count: offenders.length, files: offenders }, null, 2),
        'utf8',
    );
    console.log(`[ts-nocheck ratchet] baseline saved: ${offenders.length} files`);
    process.exit(0);
}

const base = JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'));
const baseSet = new Set(base.files ?? []);
const added = offenders.filter((f) => !baseSet.has(f));
const removed = (base.files ?? []).filter((f) => !offenders.includes(f));

console.log(`[ts-nocheck ratchet] baseline ${base.count}  ->  current ${offenders.length}`);

if (removed.length) {
    console.log('');
    console.log(`good: ${removed.length} file(s) regained type checking`);
    for (const f of removed.slice(0, 20)) console.log(`  - ${f}`);
}

if (added.length) {
    console.log('');
    console.log(`FAIL: ${added.length} file(s) newly opted out of type checking:`);
    for (const f of added) console.log(`  + ${f}`);
    console.log('');
    console.log('`@ts-nocheck` hides real defects — three broken imports and a runtime crash');
    console.log('in the execution section were masked this way. Fix the types, or if this');
    console.log('is deliberate, run with --save and say why in the commit message.');
    process.exit(1);
}

if (removed.length) {
    console.log('');
    console.log('run with --save to lock in the improvement');
}
console.log('');
console.log('[ts-nocheck ratchet] OK — no new opt-outs');
