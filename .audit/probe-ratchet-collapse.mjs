/** يقيس كم إخفاقاً يبتلعه مفتاح «الملفّ :: الاسم» المكرَّر في مِسنَنة الاختبارات. */
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

const ROOT = process.cwd();
const toPosix = (p) => p.split(sep).join('/');
const report = JSON.parse(readFileSync('.audit/vitest-run.json', 'utf8'));

const counts = new Map();
let rawFailed = 0;
for (const suite of report.testResults ?? []) {
    const file = toPosix(relative(ROOT, suite.name ?? ''));
    for (const t of suite.assertionResults ?? []) {
        if (t.status !== 'failed') continue;
        rawFailed += 1;
        const key = `${file} :: ${(t.fullName || t.title || '').trim()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
}

const dupes = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
const swallowed = dupes.reduce((s, [, n]) => s + (n - 1), 0);

console.log(`إخفاقات فعلية في التقرير: ${rawFailed}`);
console.log(`مفاتيح فريدة (ما يراه الحارس): ${counts.size}`);
console.log(`إخفاقات مبتلعة: ${swallowed}   مفاتيح مكرّرة: ${dupes.length}`);
console.log(`numFailedTests من vitest: ${report.numFailedTests}`);

console.log('\n--- المفاتيح المكرّرة ---');
for (const [k, n] of dupes) console.log(`  ×${n}  ${k}`);
