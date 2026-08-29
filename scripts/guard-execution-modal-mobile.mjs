#!/usr/bin/env node
/**
 * الموجة 7 — يرفض vh في أغلفة النوافذ الحية، ويتأكد من bodyScrollLock في *Modal*Container.
 *
 *   node scripts/guard-execution-modal-mobile.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOT = join(ROOT, 'src/app/components/lawyer/ExecutionDashboard');

/*
 * فارغة عن قصد: `vh` يقيس أطول حالة للنافذة، فيمتدّ المحتوى تحت شريط المتصفح
 * على الهاتف ويختفي آخر زر. `dvh` يتبع الارتفاع الفعلي لحظةً بلحظة. لا استثناء
 * هنا لأن كل حالة استُبدلت — وإضافة اسم إلى القائمة تعني إعادة العطل لا تأجيله.
 */
const VH_ALLOWLIST = new Set([]);

const SCROLL_LOCK_ALLOWLIST = new Set([
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionModalsContainer.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupModalHost.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupModalShell.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/PartyEditModal.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/DossierActionsModal.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/SeizureRequestSubjectModal.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionTransferFileNumberModal.tsx',
    'src/app/components/lawyer/ExecutionDashboard/followupModalContext.tsx',
    'src/app/components/lawyer/ExecutionDashboard/executionFollowupModalLazy.tsx',
]);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'node_modules' || name === '__tests__') continue;
            walk(full, out);
        } else if (/\.tsx$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

const vhHits = [];
const scrollLockHits = [];

for (const file of walk(SCAN_ROOT)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const source = readFileSync(file, 'utf8');
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    if (!VH_ALLOWLIST.has(rel) && /\b\d+vh\b/.test(withoutComments)) {
        vhHits.push(rel);
    }

    const isModalContainer =
        /Modal(Container)?\.tsx$/i.test(rel) &&
        withoutComments.includes('fixed inset-0') &&
        !SCROLL_LOCK_ALLOWLIST.has(rel);

    if (isModalContainer && !/useBodyScrollLock\s*\(/.test(withoutComments)) {
        scrollLockHits.push(rel);
    }
}

let failed = false;

if (vhHits.length) {
    failed = true;
    console.error('[execution modal mobile guard] FAIL — raw vh in execution UI (use dvh + safe-area shell):');
    for (const h of vhHits) console.error(`  - ${h}`);
}

if (scrollLockHits.length) {
    failed = true;
    console.error('[execution modal mobile guard] FAIL — overlay modal missing useBodyScrollLock:');
    for (const h of scrollLockHits) console.error(`  - ${h}`);
}

if (failed) process.exit(1);

console.log('[execution modal mobile guard] OK — modal shells use dvh policy + scroll lock');
