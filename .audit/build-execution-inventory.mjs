#!/usr/bin/env node
/**
 * جرد نهائي لقسم التنفيذ — أساس سجل التغطية الذرّي.
 *
 * التصنيف يعتمد ثلاث قواعد بترتيب الأولوية:
 *   1. مجلدات التنفيذ الصريحة (انتماء مباشر)
 *   2. اسم الملف يحمل مفهوماً تنفيذياً
 *   3. الملف يستورد من مجلدات/وحدات التنفيذ (انتماء بالرسم البياني)
 *
 * الناتج: .audit/execution-inventory.json + ملخص على stdout
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = ['src', 'api', 'e2e', 'scripts', 'public'];
const CODE_EXT = /\.(ts|tsx|mjs|js|cjs)$/;

/** مجلدات تنتمي كلياً لقسم التنفيذ */
const EXPLICIT_DIRS = [
    'src/app/components/lawyer/ExecutionDashboard',
    'src/app/components/lawyer/execution',
    'src/app/components/lawyer/ExecutionCreationView',
    'src/app/components/lawyer/FinancialOperationsCenter',
    'src/app/domain/execution',
    'src/app/application/execution',
    'src/app/slices/financial',
    'src/app/api/execution-files',
    'src/app/types/execution',
];

/** ملفات مفردة تنتمي صريحاً */
const EXPLICIT_FILES = [
    'src/app/components/lawyer/ExecutionCreationView.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter.tsx',
    'src/app/types/execution.ts',
    'src/app/stores/executionDashboardStore.ts',
];

/** مفاهيم تنفيذية في اسم الملف */
const NAME_CONCEPTS = [
    /execution/i,
    /seiz/i,
    /seizure/i,
    /maritalFurniture/i,
    /alimony/i,
    /coercive/i,
    /eviction/i,
    /garnish/i,
    /imprisonment/i,
    /summon/i,
    /tabligh/i,
    /followup/i,
    /custodyWard/i,
    /visitation/i,
    /inaba/i,
    /unifiedLedger/i,
    /settlement/i,
    /guarantor/i,
    /executor/i,
    /^foc/i,
    /dossier/i,
];

/** وحدات يعتبر استيرادها انتماءً للقسم */
const IMPORT_MARKERS = [
    'ExecutionDashboard',
    'ExecutionCreationView',
    'FinancialOperationsCenter',
    'lawyer/execution',
    'domain/execution',
    'application/execution',
    'slices/financial',
    'types/execution',
    'executionDashboardStore',
    'executionStorageKeys',
    'executionDossierBlobPersistence',
    'executionDomainIsolation',
    'executionFilesStorage',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report', '.audit']);

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

function toPosix(p) {
    return p.split(sep).join('/');
}

function countLines(abs) {
    try {
        const src = readFileSync(abs, 'utf8');
        return { lines: src.split('\n').length, src };
    } catch {
        return { lines: 0, src: '' };
    }
}

/** تصنيف الوحدة المنطقية — لتوزيع الفحص على دفعات متماسكة */
function classifyModule(rel) {
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore')) return 'A1-core-hooks';
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard/hooks')) return 'A2-dashboard-hooks';
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard/components')) return 'A3-dashboard-components';
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard/utils')) return 'A4-dashboard-utils';
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard/helpers')) return 'A5-dashboard-helpers';
    if (rel.startsWith('src/app/components/lawyer/ExecutionDashboard')) return 'A6-dashboard-root';
    if (rel.startsWith('src/app/components/lawyer/execution')) return 'B-execution-components';
    if (rel.startsWith('src/app/components/lawyer/ExecutionCreationView')) return 'C-creation-view';
    if (rel === 'src/app/components/lawyer/ExecutionCreationView.tsx') return 'C-creation-view';
    if (rel.startsWith('src/app/components/lawyer/FinancialOperationsCenter')) return 'D-financial-center';
    if (rel === 'src/app/components/lawyer/FinancialOperationsCenter.tsx') return 'D-financial-center';
    if (rel.startsWith('src/app/domain/execution')) return 'E1-domain';
    if (rel.startsWith('src/app/application/execution')) return 'E2-application';
    if (rel.startsWith('src/app/slices/financial')) return 'E3-financial-slice';
    if (rel.startsWith('src/app/types')) return 'E4-types';
    if (rel.startsWith('src/app/stores')) return 'E5-stores';
    if (rel.startsWith('src/app/utils')) return 'F-utils';
    if (rel.startsWith('src/app/api')) return 'G-api';
    if (rel.startsWith('src/app/services')) return 'H-services';
    if (rel.startsWith('src/app/runtime')) return 'I-runtime';
    if (rel.startsWith('src/app/hooks')) return 'J-app-hooks';
    if (rel.startsWith('src/app/components/lawyer/ArchivePortal')) return 'K-archive-portal';
    if (rel.startsWith('src/app/components/lawyer/dashboard')) return 'L-dashboard-shell';
    if (rel.startsWith('src/app/components/lawyer')) return 'M-lawyer-other';
    if (rel.startsWith('src/app/components')) return 'N-components-other';
    if (rel.startsWith('e2e')) return 'O-e2e';
    if (rel.startsWith('scripts')) return 'P-scripts';
    if (rel.startsWith('api')) return 'G-api';
    return 'Z-other';
}

const allFiles = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));

const records = [];
for (const abs of allFiles) {
    const rel = toPosix(relative(ROOT, abs));
    const base = rel.split('/').pop();

    const byDir = EXPLICIT_DIRS.some((d) => rel.startsWith(d + '/')) || EXPLICIT_FILES.includes(rel);
    const byName = !byDir && NAME_CONCEPTS.some((re) => re.test(base));

    let byImport = false;
    let lines = 0;
    let src = '';
    if (byDir || byName) {
        ({ lines, src } = countLines(abs));
    } else {
        ({ lines, src } = countLines(abs));
        byImport = IMPORT_MARKERS.some((m) => src.includes(m));
    }

    if (!byDir && !byName && !byImport) continue;

    records.push({
        path: rel,
        lines,
        module: classifyModule(rel),
        reason: byDir ? 'dir' : byName ? 'name' : 'import',
        isTest: /__tests__|\.test\.|\.spec\./.test(rel),
        tsNocheck: /^\s*\/\/\s*@ts-nocheck/m.test(src.slice(0, 400)),
        reviewed: false,
    });
}

records.sort((a, b) => (a.module === b.module ? b.lines - a.lines : a.module.localeCompare(b.module)));

const byModule = {};
for (const r of records) {
    byModule[r.module] ??= { files: 0, lines: 0, tests: 0, nocheck: 0 };
    byModule[r.module].files += 1;
    byModule[r.module].lines += r.lines;
    if (r.isTest) byModule[r.module].tests += 1;
    if (r.tsNocheck) byModule[r.module].nocheck += 1;
}

const byReason = { dir: 0, name: 0, import: 0 };
for (const r of records) byReason[r.reason] += 1;

const totals = {
    files: records.length,
    lines: records.reduce((s, r) => s + r.lines, 0),
    prodFiles: records.filter((r) => !r.isTest).length,
    prodLines: records.filter((r) => !r.isTest).reduce((s, r) => s + r.lines, 0),
    testFiles: records.filter((r) => r.isTest).length,
    tsNocheckFiles: records.filter((r) => r.tsNocheck).length,
};

mkdirSync(join(ROOT, '.audit'), { recursive: true });
writeFileSync(
    join(ROOT, '.audit', 'execution-inventory.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totals, byModule, byReason, records }, null, 2),
    'utf8',
);

console.log('=== EXECUTION SECTION — DEFINITIVE INVENTORY ===');
console.log(`total files      : ${totals.files}`);
console.log(`total lines      : ${totals.lines}`);
console.log(`production files : ${totals.prodFiles}  (${totals.prodLines} lines)`);
console.log(`test files       : ${totals.testFiles}`);
console.log(`@ts-nocheck files: ${totals.tsNocheckFiles}`);
console.log(`membership       : dir=${byReason.dir} name=${byReason.name} import=${byReason.import}`);
console.log('');
console.log('module'.padEnd(26) + 'files'.padStart(7) + 'lines'.padStart(9) + 'tests'.padStart(7) + 'nocheck'.padStart(9));
for (const [m, v] of Object.entries(byModule).sort()) {
    console.log(m.padEnd(26) + String(v.files).padStart(7) + String(v.lines).padStart(9) + String(v.tests).padStart(7) + String(v.nocheck).padStart(9));
}
