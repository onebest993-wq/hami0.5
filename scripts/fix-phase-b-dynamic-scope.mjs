/**
 * إصلاح dynamic scope + core call بعد استخراج coercive bag
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts');
const DYNAMIC = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);
const COERCIVE_BAG = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoerciveScopeBag.ts',
);

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

const coerciveSrc = fs.readFileSync(COERCIVE_BAG, 'utf8');
const coerciveKeys = new Set(
    [...coerciveSrc.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1]),
);

let core = fs.readFileSync(CORE, 'utf8');

// Fix coercive bag indentation
core = core.replace(
    'const coerciveScopeBag = buildExecutionDashboardCoerciveScopeBag({',
    '    const coerciveScopeBag = buildExecutionDashboardCoerciveScopeBag({',
);

const scopeMarker = 'buildExecutionDashboardCoreDynamicScope({';
const scopeStart = core.indexOf(scopeMarker);
const scopeOpen = scopeStart + scopeMarker.length - 1;
const scopeExtract = extractBalancedBlock(core, scopeOpen);
let scopeKeys = extractShorthandKeys(scopeExtract.body);

// Remove duplicates and bag refs from input keys
scopeKeys = scopeKeys.filter(
    (k, i, arr) =>
        !['executionModalFlags', 'executionModalSetters', 'followupScopeBag', 'coerciveScopeBag'].includes(k) &&
        arr.indexOf(k) === i &&
        !coerciveKeys.has(k),
);

const scopeInputLines = scopeKeys.map((k) => `                        ${k},`).join('\n');
const scopeReplacement = `buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
${scopeInputLines}
                })`;

const lazyMarker = 'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
const lazyStart = core.indexOf(lazyMarker);
const lazyOpen = lazyStart + lazyMarker.length - 1;
const lazyExtract = extractBalancedBlock(core, lazyOpen);
core = core.slice(0, lazyStart) + `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                ${scopeReplacement}` + core.slice(lazyExtract.end);

fs.writeFileSync(CORE, core, 'utf8');

// Restore clean dynamic scope from git and patch
const cleanDynamic = execSync(
    'git show 84d02180:src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
    { cwd: ROOT, encoding: 'utf8' },
);

let newDynamic = cleanDynamic.replace(
    '    const executionModalSetters = input.executionModalSetters as Record<string, unknown>;\n    return {',
    '    const executionModalSetters = input.executionModalSetters as Record<string, unknown>;\n    const coerciveScopeBag = input.coerciveScopeBag as Record<string, unknown>;\n    return {',
);
newDynamic = newDynamic.replace(
    '        ...executionModalSetters,\n',
    '        ...executionModalSetters,\n        ...coerciveScopeBag,\n',
);

for (const key of coerciveKeys) {
    newDynamic = newDynamic.replace(new RegExp(`\\n\\s+${key}: input\\.${key},`, 'g'), '');
}

fs.writeFileSync(DYNAMIC, newDynamic, 'utf8');
console.log('fixed core scope keys:', scopeKeys.length);
console.log('removed coercive keys from dynamic:', coerciveKeys.size);
