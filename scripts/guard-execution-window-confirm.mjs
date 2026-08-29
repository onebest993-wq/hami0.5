#!/usr/bin/env node
/**
 * الموجة 7 — يرفض window.confirm في مسارات التنفيذ الحية (Capacitor-safe).
 *
 *   node scripts/guard-execution-window-confirm.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
/*
 * المجلد وحده لا يكفي.
 *
 * `ExecutionCreationView/` كان مفحوصاً بينما `ExecutionCreationView.tsx` — وهو
 * المكوّن الحيّ ذو الـ٢٩٠٠ سطر — خارج الفحص لأنه ملف شقيق للمجلد لا داخله. فكان
 * الحارس يُعلن «لا window.confirm في مسارات التنفيذ الحية» ونداء النظام قائم في
 * أهمّها. كل جذر مجلد يُرفق بملفه الشقيق صراحةً.
 */
const SCAN_ROOTS = [
    'src/app/components/lawyer/execution',
    'src/app/components/lawyer/ExecutionDashboard',
    'src/app/components/lawyer/ExecutionDashboard.tsx',
    'src/app/components/lawyer/ExecutionCreationView',
    'src/app/components/lawyer/ExecutionCreationView.tsx',
    'src/app/components/lawyer/FinancialOperationsCenter',
    'src/app/components/lawyer/FinancialOperationsCenter.tsx',
    'src/app/components/lawyer/Modal_Unified_Summons_Hub.tsx',
    'src/app/components/lawyer/DecisionsAndAppealsEngine',
    'src/app/components/lawyer/DecisionsAndAppealsEngine.tsx',
];

const ALLOWLIST = new Set([
    'src/app/components/lawyer/execution/__tests__/executionSectionConfirm.test.tsx',
    'src/app/components/lawyer/execution/ExecutionSectionConfirmDialog.tsx',
    'src/app/components/lawyer/execution/useExecutionSectionConfirm.tsx',
    /*
     * وحدة غير قابلة للوصول: صفر مستوردين، ويعدّها guard:dead-modules ميتة.
     * نسخة قديمة من منطق الحفظ خرجت من ExecutionCreationView.tsx ولم تُوصَل قط،
     * وقد تباعد الاثنان منذ ذلك الحين. الحذف يخص موجة تنظيف الميت (367 وحدة) لأن
     * اختبار البنية يقرأ الملف عند التجميع فيسقط الملف كله لا اختباراً واحداً.
     */
    'src/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationSubmit.ts',
]);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'node_modules' || name === '__tests__') continue;
            walk(full, out);
        } else if (/\.(tsx?|jsx?)$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

function collectFiles() {
    const files = [];
    for (const rel of SCAN_ROOTS) {
        const full = join(ROOT, rel);
        try {
            if (statSync(full).isDirectory()) walk(full, files);
            else if (/\.(tsx?|jsx?)$/.test(full)) files.push(full);
        } catch {
            // skip missing
        }
    }
    return files;
}

const hits = [];
for (const file of collectFiles()) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (ALLOWLIST.has(rel)) continue;
    const source = readFileSync(file, 'utf8');
    const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
    if (/\bwindow\.confirm\s*\(/.test(withoutComments)) {
        hits.push(rel);
    }
}

if (hits.length) {
    console.error('[execution window.confirm guard] FAIL — use useExecutionSectionConfirm instead:');
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
}

console.log('[execution window.confirm guard] OK — no window.confirm in live execution paths');
