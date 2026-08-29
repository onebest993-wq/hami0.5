/** تحقّق سريع: هل فرق المجموعات المتعدّدة يكشف العشرة المبتلعة؟ */
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

const ROOT = process.cwd();
const toPosix = (p) => p.split(sep).join('/');

function collectFailures(report) {
    const failures = [];
    for (const suite of report.testResults ?? []) {
        const file = toPosix(relative(ROOT, suite.name ?? ''));
        for (const t of suite.assertionResults ?? []) {
            if (t.status === 'failed') failures.push(`${file} :: ${(t.fullName || t.title || '').trim()}`);
        }
    }
    return failures.sort();
}

function multisetDiff(from, to) {
    const counts = new Map();
    for (const f of from) counts.set(f, (counts.get(f) ?? 0) + 1);
    for (const f of to) counts.set(f, (counts.get(f) ?? 0) - 1);
    const out = [];
    for (const [f, n] of counts) for (let i = 0; i < n; i += 1) out.push(f);
    return out.sort();
}

const report = JSON.parse(readFileSync('.audit/vitest-run.json', 'utf8'));
const base = JSON.parse(readFileSync('.audit/test-ratchet-baseline.json', 'utf8'));
const failures = collectFailures(report);

console.log(`الحارس الآن يرى: ${failures.length} (vitest يقول ${report.numFailedTests})`);
console.log(`خطّ الأساس القديم: ${(base.failures ?? []).length}`);

const added = multisetDiff(failures, base.failures ?? []);
const fixed = multisetDiff(base.failures ?? [], failures);
console.log(`\nمكشوف بعد الإصلاح (كان مخفيّاً): ${added.length}`);
for (const f of added) console.log(`  + ${f}`);
console.log(`نجح بعد أن كان فاشلاً: ${fixed.length}`);

/* محاكاة الانحدار الذي كان يمرّ: إخفاق إضافي بمفتاح مكرّر قائم */
const dupKey = failures.find((f, i) => failures[i + 1] === f);
const regressed = [...failures, dupKey].sort();
const caughtBefore = new Set(failures).size !== new Set(regressed).size;
const caughtAfter = multisetDiff(regressed, failures).length > 0;
console.log(`\nمحاكاة: إخفاق جديد باسم مطابق`);
console.log(`  الحارس القديم يكشفه؟ ${caughtBefore ? 'نعم' : 'لا'}`);
console.log(`  الحارس الجديد يكشفه؟ ${caughtAfter ? 'نعم' : 'لا'}`);
