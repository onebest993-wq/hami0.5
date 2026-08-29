/**
 * Phase B slice 2 — استخراج financialScopeBag
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts');
const DYNAMIC = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);
if (!fs.existsSync(DYNAMIC)) {
    console.log('[spent] buildExecutionDashboardCoreDynamicScope.ts — skip');
    process.exit(0);
}
const RESOLVER = path.join(ROOT, 'scripts/lib/resolveExecutionChunkScopeKeys.mjs');
const FINANCIAL_BAG = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFinancialScopeBag.ts',
);
if (!fs.existsSync(FINANCIAL_BAG)) {
    console.log('[spent] financial scope bag — skip');
    process.exit(0);
}

const FINANCIAL_KEY_PATTERN =
    /financial|Financial|payment|Payment|ledger|Ledger|expense|Expense|claim|Claim|fee|Fee|salary|Salary|principal|Principal|balance|Balance|totals|Totals|receipt|Receipt|invoice|Invoice|eviction.*Fee|eviction.*Expense|unifiedLedger|maritalFurniture|total_execution_expenses|totalExecutionExpenses|totalWithExecutionFee|calculatedExecutionFee|shouldCalculateExecutionFee|parsedClientFees|parsedCourtFees|parsedDirectorateFees|parsedLawyerFees|paidClientFees|paidCourtFees|paidDirectorateFees|judicialCustodianSalaries/i;

const BAG_NAMES = new Set([
    'executionModalFlags',
    'executionModalSetters',
    'followupScopeBag',
    'coerciveScopeBag',
    'financialScopeBag',
]);

function extractBalancedBlock(src, openBraceIdx) {
    let depth = 0;
    for (let i = openBraceIdx; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return { body: src.slice(openBraceIdx + 1, i), end: i + 1 };
        }
    }
    throw new Error('unbalanced');
}

function extractShorthandKeys(body) {
    return [...body.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]);
}

function extractObjectKeys(src, varName) {
    const marker = `const ${varName} = {`;
    const start = src.indexOf(marker);
    if (start < 0) return [];
    const open = start + marker.length - 1;
    const { body } = extractBalancedBlock(src, open);
    return extractShorthandKeys(body);
}

function transformShorthandLines(body, inputName = 'input') {
    return body
        .split('\n')
        .map((line) => {
            const m = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*),(\s*)$/);
            if (m) return `${m[1]}${m[2]}: ${inputName}.${m[2]},${m[3]}`;
            return line;
        })
        .join('\n');
}

function rebuildScopeCall(core, scopeKeys) {
    const scopeInputLines = scopeKeys.map((k) => `                        ${k},`).join('\n');
    const scopeReplacement = `buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
                    financialScopeBag,
${scopeInputLines}
                })`;
    const lazyMarker = 'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
    const lazyStart = core.indexOf(lazyMarker);
    const lazyOpen = lazyStart + lazyMarker.length - 1;
    const lazyExtract = extractBalancedBlock(core, lazyOpen);
    return (
        core.slice(0, lazyStart) +
        `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                ${scopeReplacement}` +
        core.slice(lazyExtract.end)
    );
}

let core = fs.readFileSync(CORE, 'utf8');
const dynamicSrc = fs.readFileSync(DYNAMIC, 'utf8');

const lazyMarker = 'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
const lazyStart = core.indexOf(lazyMarker);
const lazyOpen = lazyStart + lazyMarker.length - 1;
const lazyExtract = extractBalancedBlock(core, lazyOpen);
const scopeKeys = extractShorthandKeys(lazyExtract.body).filter((k) => !BAG_NAMES.has(k));

const modalKeys = new Set([
    ...extractObjectKeys(core, 'executionModalFlags'),
    ...extractObjectKeys(core, 'executionModalSetters'),
]);

const financialKeys = scopeKeys
    .filter((k) => FINANCIAL_KEY_PATTERN.test(k) && !modalKeys.has(k))
    .sort();

console.log('financial keys to extract:', financialKeys.length);

const financialBody = financialKeys.map((k) => `        ${k},`).join('\n');
const financialFn = `// @ts-nocheck
/** Phase B — حقول المركز المالي / الدفع / الرسوم / النفقة لـ chunk scope */
export type ExecutionDashboardFinancialScopeBagInput = Record<string, unknown>;

export function buildExecutionDashboardFinancialScopeBag(
    input: ExecutionDashboardFinancialScopeBagInput,
): Record<string, unknown> {
    return {
${transformShorthandLines(financialBody)}
    };
}
`;

fs.writeFileSync(FINANCIAL_BAG, financialFn, 'utf8');

const financialKeySet = new Set(financialKeys);
const remainingKeys = scopeKeys.filter((k) => !financialKeySet.has(k));
core = rebuildScopeCall(core, remainingKeys);

const bagCall = `    const financialScopeBag = buildExecutionDashboardFinancialScopeBag({
        ${financialKeys.map((k) => `${k},`).join('\n        ')}
    });

    const executionModalFlags = {`;

if (!core.includes('buildExecutionDashboardFinancialScopeBag')) {
    core = core.replace('    const executionModalFlags = {', bagCall);
    const importLine = `import { buildExecutionDashboardFinancialScopeBag } from './executionDashboardCore/buildExecutionDashboardFinancialScopeBag';\n`;
    if (!core.includes("buildExecutionDashboardFinancialScopeBag'")) {
        core = core.replace(
            "import { buildExecutionDashboardCoerciveScopeBag } from './executionDashboardCore/buildExecutionDashboardCoerciveScopeBag';",
            `import { buildExecutionDashboardCoerciveScopeBag } from './executionDashboardCore/buildExecutionDashboardCoerciveScopeBag';\n${importLine}`,
        );
    }
}

fs.writeFileSync(CORE, core, 'utf8');

let newDynamic = dynamicSrc;
if (!newDynamic.includes('financialScopeBag')) {
    newDynamic = newDynamic.replace(
        '    const coerciveScopeBag = input.coerciveScopeBag as Record<string, unknown>;\n    return {',
        '    const coerciveScopeBag = input.coerciveScopeBag as Record<string, unknown>;\n    const financialScopeBag = input.financialScopeBag as Record<string, unknown>;\n    return {',
    );
    newDynamic = newDynamic.replace(
        '        ...coerciveScopeBag,\n',
        '        ...coerciveScopeBag,\n        ...financialScopeBag,\n',
    );
}

for (const key of financialKeys) {
    newDynamic = newDynamic.replace(new RegExp(`\\n\\s+${key}: input\\.${key},`, 'g'), '');
}

fs.writeFileSync(DYNAMIC, newDynamic, 'utf8');

let resolver = fs.readFileSync(RESOLVER, 'utf8');
if (!resolver.includes('FINANCIAL_BAG_PATH')) {
    void fs.existsSync(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFinancialScopeBag.ts',
    );
    resolver = resolver.replace(
        'const COERCIVE_BAG_PATH =',
        `const FINANCIAL_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardFinancialScopeBag.ts';
const COERCIVE_BAG_PATH =`,
    );
    resolver = resolver.replace(
        'function extractCoerciveBagKeys(core) {',
        `function extractFinancialBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardFinancialScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(FINANCIAL_BAG_PATH)) {
        const src = fs.readFileSync(FINANCIAL_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractCoerciveBagKeys(core) {`,
    );
    resolver = resolver.replace(
        "    if (spreads.includes('coerciveScopeBag') || block.includes('coerciveScopeBag')) {",
        `    if (spreads.includes('financialScopeBag') || block.includes('financialScopeBag')) {
        for (const k of extractFinancialBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('coerciveScopeBag') || block.includes('coerciveScopeBag')) {`,
    );
    fs.writeFileSync(RESOLVER, resolver, 'utf8');
}

console.log('Phase B financial scope extracted:', financialKeys.length, 'keys; remaining:', remainingKeys.length);
