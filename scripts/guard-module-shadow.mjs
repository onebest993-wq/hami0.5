/**
 * يمنع module shadowing: Foo.tsx بجانب Foo/index.tsx يحجب المجلد عند import('@/.../Foo').
 *
 * Usage: node scripts/guard-module-shadow.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * orchestrators رفيعة متعمدة — .tsx رفيع يشير للمجلد رغم وجود index.
 * لا تُضف هنا إلا بعد مراجعة: الافتراضي هو حذف الـ stub أو استيراد /index صراحة.
 */
const ALLOWLIST_STEMS = new Set([
    'ExecutionDashboard',
    'LawyerDashboard',
    'CommunityScreen',
    'ArchivePortal',
    'Dashboard_Active_Order_File',
    'DecisionsAndAppealsEngine',
    'ExecutionCreationView',
    'FinancialOperationsCenter',
    'Form_Urgent_Actions',
    'LawyerHomeHubCard',
    'LawyerNewCase',
    'Modal_Unified_Summons_Hub',
    'SmartLegalRadar',
    'View_Urgent_And_Orders_Dashboard',
    'ActionModals',
]);

const SCAN_ROOTS = ['src/app/components/lawyer', 'src/app/components'];

function hasFolderIndex(dir) {
    return (
        fs.existsSync(path.join(dir, 'index.tsx')) ||
        fs.existsSync(path.join(dir, 'index.ts')) ||
        fs.existsSync(path.join(dir, 'index.mts'))
    );
}

function isGitTracked(relPosix) {
    const r = spawnSync('git', ['ls-files', '--error-unmatch', relPosix], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    return r.status === 0;
}

function scanShadows(scanRoot) {
    const absRoot = path.join(ROOT, scanRoot);
    if (!fs.existsSync(absRoot)) return [];

    const hits = [];
    for (const ent of fs.readdirSync(absRoot, { withFileTypes: true })) {
        if (!ent.isFile()) continue;
        const m = ent.name.match(/^(.+)\.(tsx|ts)$/);
        if (!m) continue;

        const stem = m[1];
        const dir = path.join(absRoot, stem);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
        if (!hasFolderIndex(dir)) continue;

        const relFile = path.join(scanRoot, ent.name).split(path.sep).join('/');
        if (ALLOWLIST_STEMS.has(stem)) continue;

        hits.push({
            relFile,
            relDir: path.join(scanRoot, stem).split(path.sep).join('/'),
            tracked: isGitTracked(relFile),
        });
    }
    return hits;
}

const allHits = SCAN_ROOTS.flatMap(scanShadows);

if (allHits.length) {
    console.error(`[guard-module-shadow] BLOCKED — ${allHits.length} shadow stub(s) (file + folder/index):`);
    for (const h of allHits) {
        console.error(
            `  ${h.relFile}  shadows ${h.relDir}/index  [${h.tracked ? 'tracked' : 'UNTRACKED'}]`,
        );
    }
    console.error('  Fix: delete stub, or import /index explicitly, or add to ALLOWLIST after review.');
    process.exit(1);
}

console.log('[guard-module-shadow] OK — no unallowlisted index shadows in component trees');
