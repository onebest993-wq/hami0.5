import fs from 'fs';
import {
    SCOPE_BAG_FRAGMENT_CONFIG,
    ALL_SCOPE_BAG_FRAGMENT_KEYS,
} from './scope-bag-fragment-config.mjs';

const fragmentsOutPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeBagFragments.ts';
const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';

const fragmentKeys = new Set(ALL_SCOPE_BAG_FRAGMENT_KEYS);

let fragmentsTs = `// @ts-nocheck
/** Phase C Slice 18+20 — fragments لحقائب chunk scope (generated + pick) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from './scopeBagPick';

`;

for (const frag of SCOPE_BAG_FRAGMENT_CONFIG) {
    const keysConst = `${frag.fn.replace('ScopeFragment', '').toUpperCase()}_KEYS`;
    const keysJson = JSON.stringify(frag.keys, null, 4)
        .split('\n')
        .map((line, i) => (i === 0 ? line : `    ${line}`))
        .join('\n');

    fragmentsTs += `const ${keysConst} = ${keysJson} as const;\n\n`;

    if (frag.binding) {
        fragmentsTs += `export function ${frag.fn}(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, '${frag.keys[0]}') as Partial<ExecutionDashboardCoreScopeBagInput>;
}\n\n`;
    } else {
        fragmentsTs += `export function ${frag.fn}(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, ${keysConst}) as Partial<ExecutionDashboardCoreScopeBagInput>;
}\n\n`;
    }
}

fragmentsTs += `export function mergeExecutionDashboardCoreScopeBagFragments(
    ...fragments: Array<Partial<ExecutionDashboardCoreScopeBagInput>>
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return Object.assign({}, ...fragments) as Partial<ExecutionDashboardCoreScopeBagInput>;
}
`;

fs.writeFileSync(fragmentsOutPath, fragmentsTs, 'utf8');

const core = fs.readFileSync(corePath, 'utf8');
if (core.includes('buildExecutionDashboardCoreScopeBagAssembly(')) {
    console.log('generate-scope-bag-fragments: OK (fragments only — assembly mode)');
    console.log('fragments:', SCOPE_BAG_FRAGMENT_CONFIG.length);
    console.log('fragment keys:', fragmentKeys.size);
    process.exit(0);
}

const restStart = core.indexOf('buildExecutionDashboardCoreScopeBagsFromFragments(');
if (restStart < 0) throw new Error('scope bag FromFragments call not found');

const restObjStart = core.indexOf('\n        {', restStart);
let restObjEnd = core.indexOf('\n        },\n    );', restObjStart);
if (restObjEnd < 0) restObjEnd = core.indexOf('\n        },\n    )', restObjStart);
if (restObjStart < 0 || restObjEnd < 0) throw new Error('rest object not found');

const restEndLen = core.slice(restObjEnd).startsWith('\n        },\n    );')
    ? '\n        },\n    );'.length
    : '\n        },\n    )'.length;

const restBlock = core.slice(restObjStart, restObjEnd);
const restKeys = [...restBlock.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((m) => m[1]);
const remainingKeys = restKeys.filter((k) => !fragmentKeys.has(k));

const missingFragmentKeys = [...fragmentKeys].filter((k) => !restKeys.includes(k) && !core.includes(`${k},`));
if (missingFragmentKeys.length) {
    console.warn(
        'fragment keys not in current rest (may come from bundles/hooks):',
        missingFragmentKeys.slice(0, 20).join(', '),
        missingFragmentKeys.length > 20 ? `...+${missingFragmentKeys.length - 20}` : '',
    );
}

const fragmentCalls = SCOPE_BAG_FRAGMENT_CONFIG.map(
    (f) => `        ${f.fn}(${f.var}),`,
).join('\n');

const restLines = remainingKeys.map((k) => `            ${k},`).join('\n');

const destructureStart = core.lastIndexOf('    } = buildExecutionDashboardCoreScopeBagsFromFragments(', restStart);
if (destructureStart < 0) throw new Error('scope bag destructure not found');
const oldCallEnd = restObjEnd + restEndLen;

const scopeCall = `buildExecutionDashboardCoreScopeBagsFromFragments(
${fragmentCalls}
        {
${restLines}
        },
    );`;

let newCore =
    core.slice(0, destructureStart) + `    } = ${scopeCall}` + core.slice(oldCallEnd);

fs.writeFileSync(corePath, newCore, 'utf8');

console.log('generate-scope-bag-fragments: OK');
console.log('fragments:', SCOPE_BAG_FRAGMENT_CONFIG.length);
console.log('fragment keys:', fragmentKeys.size);
console.log('rest keys:', remainingKeys.length, '(was', restKeys.length, ')');
console.log('core lines:', newCore.split('\n').length);

let finalCore = fs.readFileSync(corePath, 'utf8');
const importBlock =
    `import {\n` +
    SCOPE_BAG_FRAGMENT_CONFIG.map((f) => `    ${f.fn},`).join('\n') +
    `\n} from './executionDashboardCore/executionDashboardCoreScopeBagFragments';`;

finalCore = finalCore.replace(
    /import \{[\s\S]*?\} from '\.\/executionDashboardCore\/executionDashboardCoreScopeBagFragments';/,
    importBlock,
);
fs.writeFileSync(corePath, finalCore, 'utf8');
console.log('core imports refreshed');
