/**
 * Wave 14 — استخراج chunk scope + followup bag من useExecutionDashboardCore
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const CORE_DIR = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
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

// --- followupScopeBag ---
const followupStart = core.indexOf('const followupScopeBag = {');
if (followupStart < 0) throw new Error('followupScopeBag not found');
const followupOpen = followupStart + 'const followupScopeBag = '.length;
const followupExtract = extractBalancedBlock(core, followupOpen);
const followupBody = followupExtract.body.trim();

const followupFn = `// @ts-nocheck
/** موجة 14 — حقول محضر المتابعة لـ chunk scope */
export type ExecutionDashboardFollowupScopeBagInput = Record<string, unknown>;

export function buildExecutionDashboardFollowupScopeBag(
    input: ExecutionDashboardFollowupScopeBagInput,
): Record<string, unknown> {
    return {
${transformShorthandLines(followupBody)}
    };
}
`;

// --- dynamic scope ---
const scopeMarker = 'getScopeSources: () => buildExecutionDashboardChunkScopeSources({';
const scopeStart = core.indexOf(scopeMarker);
if (scopeStart < 0) throw new Error('getScopeSources not found');
const objOpen = scopeStart + scopeMarker.length - 1;
const scopeExtract = extractBalancedBlock(core, objOpen);
let scopeBody = scopeExtract.body.trim();

scopeBody = scopeBody
    .split('\n')
    .filter((line) => {
        const t = line.trim();
        return (
            !t.startsWith('...executionModalFlags') &&
            !t.startsWith('...executionModalSetters') &&
            !t.includes('pickExecutionFollowupScopeSlice(followupScopeBag)')
        );
    })
    .join('\n');

const scopeFn = `// @ts-nocheck
/** موجة 14 — مصادر chunk scope الديناميكية */
import { pickExecutionFollowupScopeSlice } from '../pickExecutionFollowupScopeSlice';

export type ExecutionDashboardCoreDynamicScopeInput = Record<string, unknown>;

export function buildExecutionDashboardCoreDynamicScope(
    input: ExecutionDashboardCoreDynamicScopeInput,
): Record<string, unknown> {
    const followupScopeBag = input.followupScopeBag as Record<string, unknown>;
    const executionModalFlags = input.executionModalFlags as Record<string, unknown>;
    const executionModalSetters = input.executionModalSetters as Record<string, unknown>;
    return {
        ...executionModalFlags,
        ...executionModalSetters,
${transformShorthandLines(scopeBody)}
        ...pickExecutionFollowupScopeSlice(followupScopeBag),
    };
}
`;

// Collect shorthand keys for core input object (scope, excluding followup-only keys in bag)
const scopeKeys = [...scopeBody.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]);
const followupKeys = [...followupBody.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]);

const scopeInputLines = [
    'executionModalFlags,',
    'executionModalSetters,',
    'followupScopeBag,',
    ...scopeKeys.map((k) => `${k},`),
].join('\n            ');

const followupInputLines = followupKeys.map((k) => `${k},`).join('\n        ');

const scopeReplacement = `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
            ${scopeInputLines
                .split('\n')
                .filter((l) => {
                    const k = l.replace(',', '').trim();
                    return !['executionModalFlags', 'executionModalSetters', 'followupScopeBag'].includes(k);
                })
                .join('\n            ')}
                }),
            )`;

const followupReplacement = `const followupScopeBag = buildExecutionDashboardFollowupScopeBag({
        ${followupInputLines}
    });`;

let newCore =
    core.slice(0, followupStart) +
    followupReplacement +
    core.slice(followupExtract.end);

const scopeStart2 = newCore.indexOf(scopeMarker);
const objOpen2 = scopeStart2 + scopeMarker.length - 1;
const scopeExtract2 = extractBalancedBlock(newCore, objOpen2);
newCore =
    newCore.slice(0, scopeStart2) +
    scopeReplacement +
    newCore.slice(scopeExtract2.end);

// Add imports if missing
const importBlock = `import { buildExecutionDashboardCoreDynamicScope } from './executionDashboardCore/buildExecutionDashboardCoreDynamicScope';
import { buildExecutionDashboardFollowupScopeBag } from './executionDashboardCore/buildExecutionDashboardFollowupScopeBag';
`;
if (!newCore.includes('buildExecutionDashboardCoreDynamicScope')) {
    newCore = newCore.replace(
        "import { buildExecutionDashboardChunkScopeSources } from './buildExecutionDashboardChunkScopeSources';",
        `import { buildExecutionDashboardChunkScopeSources } from './buildExecutionDashboardChunkScopeSources';\n${importBlock}`,
    );
}

fs.mkdirSync(CORE_DIR, { recursive: true });
fs.writeFileSync(path.join(CORE_DIR, 'buildExecutionDashboardFollowupScopeBag.ts'), followupFn, 'utf8');
fs.writeFileSync(path.join(CORE_DIR, 'buildExecutionDashboardCoreDynamicScope.ts'), scopeFn, 'utf8');
fs.writeFileSync(CORE, newCore, 'utf8');

console.log('followup keys:', followupKeys.length);
console.log('scope keys:', scopeKeys.length);
console.log('core patched');
