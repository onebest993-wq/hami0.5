import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const mergePath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/mergeExecutionDashboardCoreScopeBagInput.ts';
const groupPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/groupExecutionDashboardCoreScopeBagInput.generated.ts';
if (!fs.existsSync(mergePath) || !fs.existsSync(groupPath)) {
    console.log('[spent] merge/group scope-bag input — skip');
    process.exit(0);
}

const core = fs.readFileSync(corePath, 'utf8');
const mergeStart = core.indexOf('mergeExecutionDashboardCoreScopeBagInput({');
if (mergeStart < 0) throw new Error('mergeExecutionDashboardCoreScopeBagInput call not found');

const mergeEnd = core.indexOf('        }),\n    );', mergeStart);
if (mergeEnd < 0) throw new Error('merge call end not found');

const mergeBlock = core.slice(mergeStart, mergeEnd);

const groups = {};
const groupRe = /(\w+):\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
let m;
while ((m = groupRe.exec(mergeBlock)) !== null) {
    const name = m[1];
    const body = m[2];
    const keys = [...body.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((x) => x[1]);
    if (keys.length) groups[name] = keys;
}

if (Object.keys(groups).length === 0) {
    throw new Error('no scope bag groups parsed');
}

function classify(k) {
    if (
        k.startsWith('handle') ||
        k.startsWith('save') ||
        k.startsWith('open') ||
        k.startsWith('close') ||
        k.startsWith('complete') ||
        k.startsWith('register') ||
        k.startsWith('apply') ||
        k.startsWith('archive') ||
        k.startsWith('request') ||
        k.startsWith('submit') ||
        k.startsWith('terminate') ||
        k.startsWith('clear') ||
        k.startsWith('confirm') ||
        k.startsWith('cancel') ||
        k.startsWith('begin') ||
        k.startsWith('finalize') ||
        k.startsWith('persist') ||
        k.startsWith('push') ||
        k.startsWith('run') ||
        k.startsWith('dismiss') ||
        k.startsWith('go') ||
        k.startsWith('toggle') ||
        k.startsWith('restore') ||
        k.startsWith('permanently') ||
        k.startsWith('move') ||
        k.startsWith('try') ||
        k.startsWith('update') ||
        k.startsWith('patch') ||
        k.startsWith('sync') ||
        k.startsWith('insert') ||
        k.startsWith('append') ||
        k.startsWith('build') ||
        k.startsWith('compute') ||
        k.startsWith('get') ||
        k.startsWith('focus') ||
        k.startsWith('consume')
    )
        return 'handlers';
    if (k.startsWith('set')) return 'setters';
    if (k.startsWith('show')) return 'flags';
    if (
        k.startsWith('execution') ||
        k.startsWith('file') ||
        k.startsWith('debtor') ||
        k.startsWith('creditor') ||
        k.startsWith('claim') ||
        k.startsWith('current')
    )
        return 'execution';
    if (
        k.startsWith('followup') ||
        k.startsWith('modal') ||
        k.startsWith('assignment') ||
        k.startsWith('employee') ||
        k.startsWith('personal') ||
        k.startsWith('activeFollowup')
    )
        return 'followupUi';
    if (k.startsWith('eviction') || k.startsWith('grace') || k.startsWith('residential'))
        return 'eviction';
    if (
        k.startsWith('financial') ||
        k.startsWith('paid') ||
        k.startsWith('payment') ||
        k.startsWith('remaining') ||
        k.startsWith('total') ||
        k.startsWith('seized') ||
        k.startsWith('seizure') ||
        k.startsWith('guarantor') ||
        k.startsWith('encroachment') ||
        k.startsWith('specificDelivery') ||
        k.startsWith('earner') ||
        k.startsWith('lawyer')
    )
        return 'financial';
    if (
        k.startsWith('timeline') ||
        k.startsWith('dossier') ||
        k.startsWith('case') ||
        k.startsWith('note') ||
        k.startsWith('appointment') ||
        k.startsWith('dock') ||
        k.startsWith('trashed')
    )
        return 'timelineDossier';
    return 'misc';
}

const allKeys = Object.values(groups).flat();
const classified = {};
for (const k of allKeys) {
    const g = classify(k);
    if (!classified[g]) classified[g] = [];
    classified[g].push(k);
}

const groupEntries = Object.entries(classified).filter(([, v]) => v.length > 0);

const mergeTs = `// @ts-nocheck
/** Auto-generated — دمج مجموعات scope bag input (Slice 15+) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';

export type ExecutionDashboardCoreScopeBagGroups = {
${groupEntries.map(([name]) => `    ${name}: Record<string, unknown>;`).join('\n')}
};

export function mergeExecutionDashboardCoreScopeBagInput(
    groups: ExecutionDashboardCoreScopeBagGroups,
): ExecutionDashboardCoreScopeBagInput {
    return {
${groupEntries.map(([name]) => `        ...groups.${name},`).join('\n')}
    } as ExecutionDashboardCoreScopeBagInput;
}
`;
fs.writeFileSync(mergePath, mergeTs, 'utf8');

function pickBlock(name, keys) {
    const entries = keys.map((k) => `        ${k}: input.${k},`).join('\n');
    return `    ${name}: {\n${entries}\n    },`;
}

const groupTs = `// @ts-nocheck
/** Auto-generated — تجميع scope bag input من سجل مسطح (Slice 16) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { mergeExecutionDashboardCoreScopeBagInput } from './mergeExecutionDashboardCoreScopeBagInput';

export function groupExecutionDashboardCoreScopeBagInput(
    input: ExecutionDashboardCoreScopeBagInput,
): ExecutionDashboardCoreScopeBagInput {
    return mergeExecutionDashboardCoreScopeBagInput({
${groupEntries.map(([name, keys]) => pickBlock(name, keys)).join('\n')}
    });
}
`;
fs.writeFileSync(groupPath, groupTs, 'utf8');

// Flat key list for core scopeBagInput object
const flatKeys = groupEntries.flatMap(([, keys]) => keys);
const flatObjectLines = flatKeys.map((k) => `            ${k},`).join('\n');

const oldCallStart = core.indexOf('    } = buildExecutionDashboardCoreScopeBags(\n        mergeExecutionDashboardCoreScopeBagInput({');
if (oldCallStart < 0) throw new Error('scope bag destructure not found');

const oldCallEnd = core.indexOf('        }),\n    );', oldCallStart) + '        }),\n    );'.length;
const destructurePrefix = core.slice(0, oldCallStart);
const afterCall = core.slice(oldCallEnd);

const newCore =
    destructurePrefix +
    `    } = buildExecutionDashboardCoreScopeBags(
        groupExecutionDashboardCoreScopeBagInput({
${flatObjectLines}
        }),
    );` +
    afterCall;

if (!newCore.includes('groupExecutionDashboardCoreScopeBagInput')) {
    throw new Error('group import missing from core — add manually');
}

fs.writeFileSync(corePath, newCore, 'utf8');

let finalCore = fs.readFileSync(corePath, 'utf8');
if (finalCore.includes("mergeExecutionDashboardCoreScopeBagInput")) {
    finalCore = finalCore.replace(
        "import { mergeExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/mergeExecutionDashboardCoreScopeBagInput';",
        "import { groupExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/groupExecutionDashboardCoreScopeBagInput.generated';",
    );
    fs.writeFileSync(corePath, finalCore, 'utf8');
}

console.log('generate-scope-bag-merge: OK');
console.log('groups:', groupEntries.map(([n, v]) => `${n}:${v.length}`).join(', '));
console.log('total keys:', flatKeys.length);
console.log('core lines:', finalCore.split('\n').length);
