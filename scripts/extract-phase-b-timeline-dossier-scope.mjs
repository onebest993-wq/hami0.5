/**
 * Phase B slice 3 — استخراج timelineDossierScopeBag
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
const TIMELINE_BAG = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag.ts',
);
if (!fs.existsSync(TIMELINE_BAG)) {
    console.log('[spent] timeline/dossier scope bag — skip');
    process.exit(0);
}

const TIMELINE_DOSSIER_KEY_PATTERN =
    /timeline|Timeline|dossier|Dossier|note|Note|task|Task|event|Event|accordion|Accordion|lifecycle|Lifecycle|heir|Heir|deceased|Deceased|substitution|Substitution|linkedDossier|commitDossier|voiceUser|notificationCount|seizedAssetsModal|syncSeized|syncSeizure|breakInventory|fieldVisit|appointment|Appointment|graceTask|GraceTask|milestone|Milestone|trashed|Trash|pinned|Pinned|radar|Radar|summons|Summons|memo|Memo|childDossier|parentDossier|partyEdit|PartyEdit|caseNote|CaseNote|caseTask|CaseTask/i;

const BAG_NAMES = new Set([
    'executionModalFlags',
    'executionModalSetters',
    'followupScopeBag',
    'coerciveScopeBag',
    'financialScopeBag',
    'timelineDossierScopeBag',
]);

const SCOPE_BAGS_IN_CALL = [
    'executionModalFlags',
    'executionModalSetters',
    'followupScopeBag',
    'coerciveScopeBag',
    'financialScopeBag',
    'timelineDossierScopeBag',
];

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
    const bagLines = SCOPE_BAGS_IN_CALL.map((b) => `                    ${b},`).join('\n');
    const scopeInputLines = scopeKeys.map((k) => `                        ${k},`).join('\n');
    const scopeReplacement = `buildExecutionDashboardCoreDynamicScope({
${bagLines}
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

function ensureImport(core, symbol, fromLine) {
    if (core.includes(`${symbol}'`)) return core;
    return core.replace(fromLine, `${fromLine}\n${`import { ${symbol} } from './executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag';`}`);
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

const timelineKeys = scopeKeys
    .filter((k) => TIMELINE_DOSSIER_KEY_PATTERN.test(k) && !modalKeys.has(k))
    .sort();

console.log('timeline/dossier keys to extract:', timelineKeys.length);

const timelineBody = timelineKeys.map((k) => `        ${k},`).join('\n');
const timelineFn = `// @ts-nocheck
/** Phase B — حقول الجدول الزمني / الإضبارة / المهام / الورثة لـ chunk scope */
export type ExecutionDashboardTimelineDossierScopeBagInput = Record<string, unknown>;

export function buildExecutionDashboardTimelineDossierScopeBag(
    input: ExecutionDashboardTimelineDossierScopeBagInput,
): Record<string, unknown> {
    return {
${transformShorthandLines(timelineBody)}
    };
}
`;

fs.writeFileSync(TIMELINE_BAG, timelineFn, 'utf8');

const timelineKeySet = new Set(timelineKeys);
const remainingKeys = scopeKeys.filter((k) => !timelineKeySet.has(k));
core = rebuildScopeCall(core, remainingKeys);

const bagCall = `    const timelineDossierScopeBag = buildExecutionDashboardTimelineDossierScopeBag({
        ${timelineKeys.map((k) => `${k},`).join('\n        ')}
    });

    const financialScopeBag = buildExecutionDashboardFinancialScopeBag({`;

if (!core.includes('buildExecutionDashboardTimelineDossierScopeBag')) {
    core = core.replace(
        '    const financialScopeBag = buildExecutionDashboardFinancialScopeBag({',
        bagCall,
    );
    core = ensureImport(
        core,
        'buildExecutionDashboardTimelineDossierScopeBag',
        "import { buildExecutionDashboardFinancialScopeBag } from './executionDashboardCore/buildExecutionDashboardFinancialScopeBag';",
    );
}

fs.writeFileSync(CORE, core, 'utf8');

let newDynamic = dynamicSrc;
if (!newDynamic.includes('timelineDossierScopeBag')) {
    newDynamic = newDynamic.replace(
        '    const financialScopeBag = input.financialScopeBag as Record<string, unknown>;\n    return {',
        '    const financialScopeBag = input.financialScopeBag as Record<string, unknown>;\n    const timelineDossierScopeBag = input.timelineDossierScopeBag as Record<string, unknown>;\n    return {',
    );
    newDynamic = newDynamic.replace(
        '        ...financialScopeBag,\n',
        '        ...financialScopeBag,\n        ...timelineDossierScopeBag,\n',
    );
}

for (const key of timelineKeys) {
    newDynamic = newDynamic.replace(new RegExp(`\\n\\s+${key}: input\\.${key},`, 'g'), '');
}

fs.writeFileSync(DYNAMIC, newDynamic, 'utf8');

let resolver = fs.readFileSync(RESOLVER, 'utf8');
if (!resolver.includes('TIMELINE_DOSSIER_BAG_PATH')) {
    void fs.existsSync(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag.ts',
    );
    resolver = resolver.replace(
        'const FINANCIAL_BAG_PATH =',
        `const TIMELINE_DOSSIER_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag.ts';
const FINANCIAL_BAG_PATH =`,
    );
    resolver = resolver.replace(
        'function extractFinancialBagKeys(core) {',
        `function extractTimelineDossierBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardTimelineDossierScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(TIMELINE_DOSSIER_BAG_PATH)) {
        const src = fs.readFileSync(TIMELINE_DOSSIER_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractFinancialBagKeys(core) {`,
    );
    resolver = resolver.replace(
        "    if (spreads.includes('financialScopeBag') || block.includes('financialScopeBag')) {",
        `    if (spreads.includes('timelineDossierScopeBag') || block.includes('timelineDossierScopeBag')) {
        for (const k of extractTimelineDossierBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('financialScopeBag') || block.includes('financialScopeBag')) {`,
    );
    fs.writeFileSync(RESOLVER, resolver, 'utf8');
}

console.log('Phase B timeline/dossier scope extracted:', timelineKeys.length, 'keys; remaining:', remainingKeys.length);
