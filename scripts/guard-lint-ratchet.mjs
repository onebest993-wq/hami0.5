#!/usr/bin/env node
/**
 * مِسنَنة اللنت — خطّ أساس لكل قاعدة، يُسقط عند أي تصاعد.
 *
 * السبب: المستودع فيه 242 خطأ لنت متراكم. بوّابة «صفر أخطاء» تُسقط كل بناء
 * فتُهمَل، وبوّابة بلا حدّ لا تمنع شيئاً. المِسنَنة تسمح بالإرث وتمنع الزيادة.
 *
 * القواعد المُصنَّفة انهياراً (react-hooks/rules-of-hooks) لها حدّ إضافي:
 * أي ملف جديد يخالفها يُسقط البناء فوراً، لأن مخالفتها تعني انهيار تصيير حقيقياً
 * — أربع مخالفات مؤكَّدة في قسم التنفيذ وُجدت بهذه القاعدة.
 *
 *   node scripts/guard-lint-ratchet.mjs          # فحص
 *   node scripts/guard-lint-ratchet.mjs --save   # تثبيت خطّ أساس جديد
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const BASELINE = '.audit/lint-baseline.json';
const CRASH_RULES = new Set(['react-hooks/rules-of-hooks']);
const toPosix = (p) => p.split(sep).join('/');

/** إنذارات كاذبة موثَّقة: دوال عادية اسمها يبدأ بـ use فتحسبها القاعدة خطّافاً */
const KNOWN_FALSE_POSITIVES = new Set([
    'src/app/services/vaultBlobStore.ts',
    'src/app/services/voice/voiceNoteStorage.ts',
    'src/app/services/caseShare/caseShareLocalStore.ts',
    'src/app/components/lawyer/dashboard/quickNoteDraft.ts',
]);

function runEslint() {
    // استدعاء مباشر عبر node — لا صدفة، فمسار المشروع قد يحوي فراغات
    const cli = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
    if (!existsSync(cli)) {
        console.error(`[lint ratchet] eslint not found at ${cli} — run npm install`);
        process.exit(2);
    }
    const targets = ['src', 'api'].filter((d) => existsSync(join(ROOT, d)));
    let out = '';
    try {
        out = execFileSync(process.execPath, [cli, ...targets, '--no-error-on-unmatched-pattern', '--format', 'json'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
        });
    } catch (err) {
        // eslint يخرج بكود غير صفري عند وجود أخطاء — المخرج ما زال صالحاً
        out = err.stdout || '';
        if (!out) {
            console.error('[lint ratchet] eslint failed to produce output:');
            console.error(err.stderr || err.message);
            process.exit(2);
        }
    }
    const start = out.indexOf('[');
    return JSON.parse(start > 0 ? out.slice(start) : out);
}

const results = runEslint();
const byRule = {};
const crashFiles = {};

for (const file of results) {
    const rel = toPosix(relative(ROOT, file.filePath));
    for (const m of file.messages) {
        if (m.severity !== 2) continue;
        const rule = m.ruleId || '(parse-error)';
        byRule[rule] = (byRule[rule] ?? 0) + 1;
        if (CRASH_RULES.has(rule)) {
            (crashFiles[rel] ??= []).push(m.line);
        }
    }
}

const totalErrors = Object.values(byRule).reduce((s, n) => s + n, 0);

if (process.argv.includes('--save') || !existsSync(join(ROOT, BASELINE))) {
    writeFileSync(
        join(ROOT, BASELINE),
        JSON.stringify(
            { savedAt: new Date().toISOString(), totalErrors, byRule, crashFiles: Object.keys(crashFiles).sort() },
            null,
            2,
        ),
        'utf8',
    );
    console.log(`[lint ratchet] baseline saved: ${totalErrors} errors across ${Object.keys(byRule).length} rules`);
    process.exit(0);
}

const base = JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'));
let failed = false;

console.log(`[lint ratchet] errors  baseline ${base.totalErrors}  ->  current ${totalErrors}`);
console.log('');

for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    const was = base.byRule?.[rule] ?? 0;
    if (count > was) {
        console.log(`  FAIL  ${rule}: ${was} -> ${count}  (+${count - was})`);
        failed = true;
    } else if (count < was) {
        console.log(`  good  ${rule}: ${was} -> ${count}`);
    }
}

// حدّ الانهيار: أي ملف جديد يخالف ترتيب الخطافات
const baseCrash = new Set(base.crashFiles ?? []);
const newCrash = Object.keys(crashFiles).filter((f) => !baseCrash.has(f) && !KNOWN_FALSE_POSITIVES.has(f));
if (newCrash.length) {
    console.log('');
    console.log('FAIL: new Rules-of-Hooks violation(s) — these crash the render at runtime:');
    for (const f of newCrash) console.log(`  + ${f}  @ lines ${crashFiles[f].join(', ')}`);
    failed = true;
}

if (failed) {
    console.log('');
    console.log('run with --save only after confirming the increase is intentional');
    process.exit(1);
}

console.log('');
console.log('[lint ratchet] OK — no regression');
