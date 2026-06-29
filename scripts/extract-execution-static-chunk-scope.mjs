/**
 * يستخرج المكوّنات/الثوابت الثابتة من getScopeSources إلى executionDashboardStaticChunkScope.ts
 * node scripts/extract-execution-static-chunk-scope.mjs
 *
 * ⚠️ يبحث داخل getScopeSources فقط — لا يستخدم أول AR_TABLIGH_RAQM في imports
 */
import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const outPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardStaticChunkScope.ts';

const STATIC_START = 'AR_TABLIGH_RAQM,';
const STATIC_END = 'XCircle,';

let core = fs.readFileSync(corePath, 'utf8');
const lines = core.split(/\r?\n/);

const scopeLine = lines.findIndex((l) => l.includes('getScopeSources: () => ({'));
if (scopeLine < 0) throw new Error('getScopeSources not found');

if (core.includes('spreadExecutionDashboardStaticChunkScope()')) {
    console.log('[extract-static-chunk-scope] already extracted — skip');
    process.exit(0);
}

const scopeLines = lines.slice(scopeLine);
const relStart = scopeLines.findIndex((l) => l.includes(STATIC_START));
const relEnd = scopeLines.findIndex((l) => l.trim() === STATIC_END);
if (relStart < 0 || relEnd < 0) throw new Error('static scope markers missing inside getScopeSources');

const absStart = scopeLine + relStart;
const absEnd = scopeLine + relEnd;

const staticBody = lines.slice(absStart, absEnd + 1).join('\n');
const staticKeys = [];
for (const line of staticBody.split('\n')) {
    const m = line.match(/^\s+([A-Za-z_][A-Za-z0-9_]*),/);
    if (m) staticKeys.push(m[1]);
}

const hookIdx = lines.findIndex((l) => l.startsWith('export function useExecutionDashboardCore'));
if (hookIdx < 0) throw new Error('useExecutionDashboardCore not found');
const importSection = lines.slice(0, hookIdx).join('\n');

function importedNamesFromBlock(block) {
    const names = [];
    const brace = block.match(/\{([\s\S]*?)\}/);
    if (brace) {
        for (const part of brace[1].split(',')) {
            const token = part.trim();
            if (!token || token.startsWith('type ')) continue;
            const asMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/);
            if (asMatch) {
                names.push(asMatch[2]);
                continue;
            }
            const name = token.split(/\s+/)[0]?.trim();
            if (name && /^[A-Za-z_]/.test(name)) names.push(name);
        }
    }
    const defaultMatch = block.match(/^import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from/m);
    if (defaultMatch) names.push(defaultMatch[1]);
    return names;
}

const keySet = new Set(staticKeys);
const importBlocks = [];
const importRe = /^import\s+(?!type\b)[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
let im;
while ((im = importRe.exec(importSection))) {
    const block = im[0].trim();
    const names = importedNamesFromBlock(block);
    if (names.some((n) => keySet.has(n))) {
        importBlocks.push(block);
    }
}

const uniqueImports = [...new Set(importBlocks)].join('\n');

const outFile = `// @ts-nocheck
/** مكوّنات/أيقونات ثابتة لـ chunk scope — chunk execution-hooks */
${uniqueImports}

export const EXECUTION_DASHBOARD_STATIC_CHUNK_SCOPE = {
${staticBody}
} as const;

export function spreadExecutionDashboardStaticChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_STATIC_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
`;

fs.writeFileSync(outPath, outFile);

const newLines = [
    ...lines.slice(0, absStart),
    '            ...spreadExecutionDashboardStaticChunkScope(),',
    ...lines.slice(absEnd + 1),
];

let updated = newLines.join('\n');
if (!updated.includes("from './executionDashboardStaticChunkScope'")) {
    updated = updated.replace(
        "import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';",
        "import { spreadExecutionDashboardStaticChunkScope } from './executionDashboardStaticChunkScope';\nimport { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';",
    );
}

// إزالة imports التي لم تعد تُستخدم في core (اختياري آمن — فقط إن لم تُذكر خارج static scope)
function coreStillUses(name) {
    const withoutScope = updated.replace(
        /getScopeSources:\s*\(\)\s*=>\s*\(\{[\s\S]*?\}\),\s*\n\s*\}\);/,
        '',
    );
    return new RegExp(`\\b${name}\\b`).test(withoutScope);
}

for (const name of staticKeys) {
    if (!coreStillUses(name)) {
        // لا نحذف imports تلقائياً — خطر كسر مراجع JSX؛ التقليص يأتي من نقل المراجع للملف المنفصل
    }
}

fs.writeFileSync(corePath, updated);

console.log('[extract-static-chunk-scope]', {
    staticKeys: staticKeys.length,
    staticLines: absEnd - absStart + 1,
    coreLines: updated.split('\n').length,
    outLines: outFile.split('\n').length,
});
