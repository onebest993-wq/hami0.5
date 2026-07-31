/**
 * Phase B — استخراج coerciveScopeBag من core + dynamic scope builder
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const DYNAMIC = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);
const RESOLVER = path.join(ROOT, 'scripts/lib/resolveExecutionChunkScopeKeys.mjs');
const COERCIVE_BAG = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoerciveScopeBag.ts',
);

const COERCIVE_KEY_PATTERN =
    /coercive|Coercive|forced|Forced|employee|Employee|summoning|Summoning|earner|Earner|notifyDebtor|DebtorEvasion|registerDebtorVoluntary|syncActiveCoercive|saveCoerciveAction|policeAssistance|PoliceAssistance|publicationModal|Publication|solidaryCoercive|SolidaryCoercive|stayOfExecution|StayOfExecution|warrant|Warrant|arrest|Arrest|investigation|Investigation/i;

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

const core = fs.readFileSync(CORE, 'utf8');
const dynamicSrc = fs.readFileSync(DYNAMIC, 'utf8');

const scopeMarker = 'buildExecutionDashboardCoreDynamicScope({';
const scopeStart = core.indexOf(scopeMarker);
if (scopeStart < 0) throw new Error('dynamic scope call not found');
const scopeOpen = scopeStart + scopeMarker.length - 1;
const scopeExtract = extractBalancedBlock(core, scopeOpen);
const scopeKeys = extractShorthandKeys(scopeExtract.body);

const coerciveKeys = scopeKeys.filter((k) => COERCIVE_KEY_PATTERN.test(k)).sort();
console.log('coercive keys to extract:', coerciveKeys.length);

const coerciveBody = coerciveKeys.map((k) => `        ${k},`).join('\n');
const coerciveFn = `// @ts-nocheck
/** Phase B — حقول الإجراءات الجبرية / الموظف / جبري شخصي لـ chunk scope */
export type ExecutionDashboardCoerciveScopeBagInput = Record<string, unknown>;

export function buildExecutionDashboardCoerciveScopeBag(
    input: ExecutionDashboardCoerciveScopeBagInput,
): Record<string, unknown> {
    return {
${transformShorthandLines(coerciveBody)}
    };
}
`;

// Patch dynamic scope: add coerciveScopeBag spread, remove individual coercive lines
let newDynamic = dynamicSrc;
if (!newDynamic.includes('coerciveScopeBag')) {
    newDynamic = newDynamic.replace(
        '    const executionModalSetters = input.executionModalSetters as Record<string, unknown>;\n    return {',
        '    const executionModalSetters = input.executionModalSetters as Record<string, unknown>;\n    const coerciveScopeBag = input.coerciveScopeBag as Record<string, unknown>;\n    return {',
    );
    newDynamic = newDynamic.replace(
        '        ...executionModalSetters,\n',
        '        ...executionModalSetters,\n        ...coerciveScopeBag,\n',
    );
}

for (const key of coerciveKeys) {
    newDynamic = newDynamic.replace(new RegExp(`\n\\s+${key}: input\\.${key},`, 'g'), '');
}

// Patch core: insert coercive bag build before executionModalFlags
const coerciveReplacement = `const coerciveScopeBag = buildExecutionDashboardCoerciveScopeBag({
        ${coerciveKeys.map((k) => `${k},`).join('\n        ')}
    });

    const executionModalFlags = {`;

if (!core.includes('buildExecutionDashboardCoerciveScopeBag')) {
    let newCore = core.replace(
        '    const executionModalFlags = {',
        coerciveReplacement,
    );

    // Remove coercive keys from dynamic scope call
    let scopeBody = scopeExtract.body;
    for (const key of coerciveKeys) {
        scopeBody = scopeBody.replace(new RegExp(`\\s+${key},\n`, 'g'), '\n');
    }

    const _newScopeCall = `${scopeMarker}
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,${scopeBody.trimStart().replace(/^executionModalFlags,\s*\n\s*executionModalSetters,\s*\n\s*followupScopeBag,\s*\n/, '')}`;

    // Safer: rebuild scope call from remaining keys
    const remainingKeys = extractShorthandKeys(scopeBody).filter((k) => !coerciveKeys.includes(k));
    const remainingLines = remainingKeys.map((k) => `                        ${k},`).join('\n');
    const scopeReplacement = `buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
${remainingLines}
                })`;

    const lazyMarker = 'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
    const lazyStart = newCore.indexOf(lazyMarker);
    const lazyOpen = lazyStart + lazyMarker.length - 1;
    const lazyExtract = extractBalancedBlock(newCore, lazyOpen);
    newCore =
        newCore.slice(0, lazyStart) +
        `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                ${scopeReplacement}` +
        newCore.slice(lazyExtract.end);

    const importLine = `import { buildExecutionDashboardCoerciveScopeBag } from './executionDashboardCore/buildExecutionDashboardCoerciveScopeBag';\n`;
    if (!newCore.includes('buildExecutionDashboardCoerciveScopeBag')) {
        newCore = newCore.replace(
            "import { buildExecutionDashboardFollowupScopeBag } from './executionDashboardCore/buildExecutionDashboardFollowupScopeBag';",
            `import { buildExecutionDashboardFollowupScopeBag } from './executionDashboardCore/buildExecutionDashboardFollowupScopeBag';\n${importLine}`,
        );
    }

    fs.writeFileSync(CORE, newCore, 'utf8');
}

fs.writeFileSync(COERCIVE_BAG, coerciveFn, 'utf8');
fs.writeFileSync(DYNAMIC, newDynamic, 'utf8');

// Patch resolver
let resolver = fs.readFileSync(RESOLVER, 'utf8');
if (!resolver.includes('COERCIVE_BAG_PATH')) {
    resolver = resolver.replace(
        'const FOLLOWUP_BAG_PATH =',
        `const COERCIVE_BAG_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoerciveScopeBag.ts';
const FOLLOWUP_BAG_PATH =`,
    );
    resolver = resolver.replace(
        'function extractFollowupBagKeys(core) {',
        `function extractCoerciveBagKeys(core) {
    const keys = new Set();
    const marker = 'buildExecutionDashboardCoerciveScopeBag({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(COERCIVE_BAG_PATH)) {
        const src = fs.readFileSync(COERCIVE_BAG_PATH, 'utf8');
        for (const m of src.matchAll(/^\\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractFollowupBagKeys(core) {`,
    );
    resolver = resolver.replace(
        '    if (spreads.includes(\'pickExecutionFollowupScopeSlice\') || block.includes(\'followupScopeBag\')) {',
        `    if (spreads.includes('coerciveScopeBag') || block.includes('coerciveScopeBag')) {
        for (const k of extractCoerciveBagKeys(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('pickExecutionFollowupScopeSlice') || block.includes('followupScopeBag')) {`,
    );
    fs.writeFileSync(RESOLVER, resolver, 'utf8');
}

console.log('Phase B coercive scope extracted:', coerciveKeys.length, 'keys');
