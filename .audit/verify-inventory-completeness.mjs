#!/usr/bin/env node
/**
 * تدقيق مستقل لاكتمال الجرد.
 *
 * يفحص كل ملف كود في المستودع **غير** المدرج في execution-inventory.json،
 * ويبحث فيه عن مفاهيم تنفيذية (عربية وإنجليزية). أي ملف يحمل إشارات قوية
 * ولم يُدرج = ثقب في الجرد يجب سدّه.
 *
 * الناتج: .audit/inventory-gap-report.json + ملخص على stdout
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = ['src', 'api', 'e2e', 'scripts', 'public'];
const CODE_EXT = /\.(ts|tsx|mjs|js|cjs)$/;
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    '.git',
    'coverage',
    'test-results',
    'playwright-report',
    '.audit',
]);

/** إشارات قوية: وجودها يعني انتماء شبه مؤكد لقسم التنفيذ */
const STRONG = [
    /ExecutionDashboard/,
    /ExecutionCreationView/,
    /FinancialOperationsCenter/,
    /executionDossier/,
    /executionStorageKey/,
    /executorDecision/,
    /executorSeizure/,
    /executionDomainIsolation/,
    /executionFilesStorage/,
    /seizedAsset/i,
    /seizureMatrix/,
    /maritalFurniture/,
    /alimonyPayment/,
    /coerciveAction/i,
    /إضبارة/,
    /اضبارة/,
    /منفذ العدل/,
    /المنفذ العدل/,
    /الحجز التنفيذي/,
    /التنفيذ الجبري/,
    /الإجراءات الجبرية/,
];

/** إشارات ضعيفة: تحتاج حكماً بشرياً */
const WEAK = [
    /\bexecution\b/i,
    /\bseizure\b/i,
    /\bdossier\b/i,
    /\bexecutor\b/i,
    /\beviction\b/i,
    /\balimony\b/i,
    /\bgarnish/i,
    /تنفيذ/,
    /حجز/,
    /تخلية/,
    /نفقة/,
    /كفيل/,
    /أثاث/,
    /محضون/,
    /مشاهدة/,
];

function walk(dir, out = []) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        if (e.name.startsWith('.') && e.name !== '.github') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue;
            walk(full, out);
        } else if (CODE_EXT.test(e.name)) {
            out.push(full);
        }
    }
    return out;
}

const toPosix = (p) => p.split(sep).join('/');

const inventory = JSON.parse(readFileSync(join(ROOT, '.audit', 'execution-inventory.json'), 'utf8'));
const inInventory = new Set(inventory.records.map((r) => r.path));

const allFiles = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));
const excluded = allFiles.map((abs) => toPosix(relative(ROOT, abs))).filter((rel) => !inInventory.has(rel));

const strongHits = [];
const weakHits = [];

for (const rel of excluded) {
    let src = '';
    try {
        src = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
        continue;
    }
    const lines = src.split('\n').length;

    const strong = STRONG.filter((re) => re.test(src)).map(String);
    if (strong.length > 0) {
        strongHits.push({ path: rel, lines, signals: strong.slice(0, 6) });
        continue;
    }
    const weak = WEAK.filter((re) => re.test(src)).map(String);
    if (weak.length >= 3) {
        weakHits.push({ path: rel, lines, signalCount: weak.length, signals: weak.slice(0, 6) });
    }
}

strongHits.sort((a, b) => b.lines - a.lines);
weakHits.sort((a, b) => b.signalCount - a.signalCount || b.lines - a.lines);

writeFileSync(
    join(ROOT, '.audit', 'inventory-gap-report.json'),
    JSON.stringify(
        {
            generatedAt: new Date().toISOString(),
            totals: {
                repoCodeFiles: allFiles.length,
                inInventory: inInventory.size,
                excluded: excluded.length,
                strongGaps: strongHits.length,
                weakCandidates: weakHits.length,
            },
            strongHits,
            weakHits,
        },
        null,
        2,
    ),
    'utf8',
);

console.log('=== INVENTORY COMPLETENESS AUDIT ===');
console.log(`repo code files : ${allFiles.length}`);
console.log(`in inventory    : ${inInventory.size}`);
console.log(`excluded        : ${excluded.length}`);
console.log('');
console.log(`STRONG gaps (execution-specific identifiers, NOT in inventory): ${strongHits.length}`);
for (const h of strongHits.slice(0, 40)) {
    console.log(`  ${String(h.lines).padStart(5)}  ${h.path}`);
    console.log(`         ${h.signals.join(' ')}`);
}
console.log('');
console.log(`WEAK candidates (>=3 generic signals): ${weakHits.length}`);
for (const h of weakHits.slice(0, 30)) {
    console.log(`  ${String(h.lines).padStart(5)}  [${h.signalCount}]  ${h.path}`);
}
