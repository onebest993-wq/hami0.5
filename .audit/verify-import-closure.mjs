#!/usr/bin/env node
/**
 * إثبات اكتمال نطاق الفحص عبر **إغلاق شجرة الاستيراد** — لا كلمات مفتاحية.
 *
 * يبدأ من نقاط دخول قسم التنفيذ الحقيقية، ويتبع كل استيراد ثابت وديناميكي
 * وكل `export ... from` بشكل متعدٍّ حتى الإشباع. ثم:
 *   - closure \ inventory  = ملفات يعتمد عليها التنفيذ فعلياً ولم تُفحَص  (ثقب مُثبَت)
 *   - inventory \ closure  = ملفات صُنّفت تنفيذية لكنها غير قابلة للوصول من أي مدخل (ميتة محتملة)
 *
 * الناتج: .audit/import-closure-report.json
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const toPosix = (p) => p.split(sep).join('/');
const EXT = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'];

/** نقاط دخول قسم التنفيذ — كل ما يفتح القسم أو ينشئ إضبارة أو يخدمها عبر API */
const SEEDS = [
    'src/app/components/lawyer/ExecutionDashboard.tsx',
    'src/app/components/lawyer/ExecutionCreationView.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter.tsx',
    'src/app/components/lawyer/DecisionsHub.tsx',
    'src/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface.tsx',
    'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx',
    'src/app/components/lawyer/dashboard/ExecutionCreationPortal.tsx',
    'src/app/components/lawyer/dashboard/ExecutionArchiveShell.tsx',
    'src/app/components/lawyer/dashboard/ExecutionDossierInstantChrome.tsx',
    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry.tsx',
    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry.tsx',
    'src/app/slices/execution/public.ts',
];

/** أضف تلقائياً كل مسارات API ومواصفات e2e التي تخص التنفيذ */
function globSeeds() {
    const out = [];
    const push = (dir, pred) => {
        if (!existsSync(dir)) return;
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, e.name);
            if (e.isDirectory()) push(p, pred);
            else if (pred(toPosix(relative(ROOT, p)))) out.push(toPosix(relative(ROOT, p)));
        }
    };
    push(join(ROOT, 'src/app/api'), (rel) => /execution|lawsuit-files|global-notes/.test(rel) && /\.ts$/.test(rel));
    push(join(ROOT, 'e2e'), (rel) => /execution/i.test(rel) && /\.ts$/.test(rel));
    return out;
}

function resolveImport(spec, fromFile) {
    if (!spec || spec.startsWith('\0')) return null;
    // حزم خارجية
    if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('src/')) return null;

    let base;
    if (spec === '@/app/bootstrap/LawyerDashboardGate') base = join(ROOT, 'src/app/bootstrap/LawyerDashboardGate.tsx');
    else if (spec === '@/app/bootstrap/SecurityInitializerGate') base = join(ROOT, 'src/app/bootstrap/SecurityInitializerGate.dev.tsx');
    else if (spec.startsWith('@/')) base = join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('src/')) base = join(ROOT, spec);
    else base = resolve(dirname(join(ROOT, fromFile)), spec);

    const candidates = [];
    // امتداد صريح موجود؟
    if (/\.(ts|tsx|mts|js|jsx|mjs|json|css|svg|png)$/.test(base)) candidates.push(base);
    // allowImportingTsExtensions: قد يكتب .js ويقصد .ts
    if (/\.js$/.test(base)) {
        candidates.push(base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
    }
    for (const e of EXT) candidates.push(base + e);
    for (const e of EXT) candidates.push(join(base, 'index' + e));

    for (const c of candidates) {
        try {
            if (existsSync(c) && statSync(c).isFile()) return toPosix(relative(ROOT, c));
        } catch { /* تجاهل */ }
    }
    return null;
}

const IMPORT_RE = [
    /\bimport\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bexport\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bvi\.mock\s*\(\s*['"]([^'"]+)['"]/g,
];

const allSeeds = [...SEEDS, ...globSeeds()];
const missingSeeds = allSeeds.filter((s) => !existsSync(join(ROOT, s)));
const seeds = allSeeds.filter((s) => existsSync(join(ROOT, s)));

const depth = new Map();
const unresolved = [];
const queue = [];
for (const s of seeds) {
    depth.set(s, 0);
    queue.push(s);
}

let head = 0;
while (head < queue.length) {
    const cur = queue[head++];
    const d = depth.get(cur);
    if (!/\.(ts|tsx|mts|js|jsx|mjs)$/.test(cur)) continue;
    let src = '';
    try {
        src = readFileSync(join(ROOT, cur), 'utf8');
    } catch {
        continue;
    }
    const specs = new Set();
    for (const re of IMPORT_RE) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) specs.add(m[1]);
    }
    for (const spec of specs) {
        const target = resolveImport(spec, cur);
        if (!target) {
            if (spec.startsWith('.') || spec.startsWith('@/')) unresolved.push({ from: cur, spec });
            continue;
        }
        if (!depth.has(target)) {
            depth.set(target, d + 1);
            queue.push(target);
        }
    }
}

const closure = new Set(depth.keys());
const inventory = JSON.parse(readFileSync(join(ROOT, '.audit', 'execution-inventory.json'), 'utf8'));
const inv = new Set(inventory.records.map((r) => r.path));

const linesOf = (rel) => {
    try {
        return readFileSync(join(ROOT, rel), 'utf8').split('\n').length;
    } catch {
        return 0;
    }
};

const gaps = [...closure]
    .filter((p) => !inv.has(p) && /\.(ts|tsx|mts|js|jsx|mjs)$/.test(p))
    .map((p) => ({ path: p, depth: depth.get(p), lines: linesOf(p) }))
    .sort((a, b) => a.depth - b.depth || b.lines - a.lines);

const unreachable = [...inv]
    .filter((p) => !closure.has(p) && /\.(ts|tsx|mts|js|jsx|mjs)$/.test(p))
    .map((p) => ({ path: p, lines: linesOf(p) }))
    .sort((a, b) => b.lines - a.lines);

// تصنيف الثقوب حسب الخطورة على منطق التنفيذ
const HOT = /^src\/app\/(utils|services|domain|stores|application|infrastructure|hooks|types|slices)\//;
const hotGaps = gaps.filter((g) => HOT.test(g.path));
const coldGaps = gaps.filter((g) => !HOT.test(g.path));

writeFileSync(
    join(ROOT, '.audit', 'import-closure-report.json'),
    JSON.stringify(
        {
            generatedAt: new Date().toISOString(),
            seeds: seeds.length,
            missingSeeds,
            totals: {
                closureFiles: closure.size,
                inventoryFiles: inv.size,
                gapsNotAudited: gaps.length,
                gapLines: gaps.reduce((s, g) => s + g.lines, 0),
                hotGaps: hotGaps.length,
                hotGapLines: hotGaps.reduce((s, g) => s + g.lines, 0),
                unreachableInInventory: unreachable.length,
                unreachableLines: unreachable.reduce((s, g) => s + g.lines, 0),
                unresolvedSpecifiers: unresolved.length,
            },
            hotGaps,
            coldGaps,
            unreachable,
            unresolved: unresolved.slice(0, 60),
        },
        null,
        2,
    ),
    'utf8',
);

console.log('=== IMPORT-GRAPH CLOSURE PROOF ===');
console.log(`seeds resolved      : ${seeds.length}${missingSeeds.length ? `  (MISSING SEEDS: ${missingSeeds.join(', ')})` : ''}`);
console.log(`closure size        : ${closure.size} files`);
console.log(`inventory size      : ${inv.size} files`);
console.log('');
console.log(`>> DEPENDED ON BUT NEVER AUDITED : ${gaps.length} files / ${gaps.reduce((s, g) => s + g.lines, 0)} lines`);
console.log(`   of which LOGIC-LAYER (utils/services/domain/stores/hooks/types): ${hotGaps.length} files / ${hotGaps.reduce((s, g) => s + g.lines, 0)} lines`);
console.log('');
console.log('--- top 45 logic-layer gaps (depth = hops from an execution entry point) ---');
for (const g of hotGaps.slice(0, 45)) {
    console.log(`  d${g.depth}  ${String(g.lines).padStart(5)}  ${g.path}`);
}
console.log('');
console.log(`>> IN INVENTORY BUT UNREACHABLE FROM ANY ENTRY POINT: ${unreachable.length} files / ${unreachable.reduce((s, g) => s + g.lines, 0)} lines`);
for (const u of unreachable.slice(0, 25)) {
    console.log(`  ${String(u.lines).padStart(5)}  ${u.path}`);
}
console.log('');
console.log(`unresolved local specifiers (broken imports): ${unresolved.length}`);
for (const u of unresolved.slice(0, 15)) console.log(`  ${u.from}  ->  ${u.spec}`);

/**
 * وضع البوّابة: يُسقط عند ازدياد الاستيرادات المكسورة.
 * الأساس الحالي 4، كلها استيرادات نوعية تشير إلى وحدات غير موجودة ويكتمها
 * `@ts-nocheck`. لا يُسمح بخامس.
 */
if (process.argv.includes('--check')) {
    const gateFile = join(ROOT, '.audit', 'import-closure-gate.json');
    if (process.argv.includes('--save') || !existsSync(gateFile)) {
        writeFileSync(
            gateFile,
            JSON.stringify(
                { savedAt: new Date().toISOString(), unresolved: unresolved.length, specs: unresolved.map((u) => `${u.from} -> ${u.spec}`).sort() },
                null,
                2,
            ),
            'utf8',
        );
        console.log(`\n[closure gate] baseline saved: ${unresolved.length} broken imports`);
        process.exit(0);
    }
    const base = JSON.parse(readFileSync(gateFile, 'utf8'));
    const baseSet = new Set(base.specs ?? []);
    const added = unresolved.map((u) => `${u.from} -> ${u.spec}`).filter((s) => !baseSet.has(s));
    console.log('');
    console.log(`[closure gate] broken imports  baseline ${base.unresolved}  ->  current ${unresolved.length}`);
    if (added.length) {
        console.log('');
        console.log(`FAIL: ${added.length} new broken import(s):`);
        for (const s of added) console.log(`  + ${s}`);
        process.exit(1);
    }
    if (missingSeeds.length) {
        console.log('');
        console.log(`FAIL: ${missingSeeds.length} execution entry point(s) no longer exist:`);
        for (const s of missingSeeds) console.log(`  + ${s}`);
        process.exit(1);
    }
    console.log('');
    console.log('[closure gate] OK');
}
