/**
 * Phase C slice 1 — نقل تجميع scope bags (~860 سطر) خارج core
 */
import fs from 'node:fs';
import path from 'node:path';
import { CORE_PATH, extractBalancedBlock, extractShorthandKeys, ROOT } from './lib/phaseBScopeBagUtils.mjs';

const ASSEMBLY = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreScopeBags.ts',
);

const BAGS = [
    { fn: 'buildExecutionDashboardFollowupScopeBag', var: 'followupScopeBag' },
    { fn: 'buildExecutionDashboardCoerciveScopeBag', var: 'coerciveScopeBag' },
    { fn: 'buildExecutionDashboardDecisionsSeizureEvictionScopeBag', var: 'decisionsSeizureEvictionScopeBag' },
    { fn: 'buildExecutionDashboardWorkspaceScopeBag', var: 'workspaceScopeBag' },
    { fn: 'buildExecutionDashboardTimelineDossierScopeBag', var: 'timelineDossierScopeBag' },
    { fn: 'buildExecutionDashboardFinancialScopeBag', var: 'financialScopeBag' },
];

function extractBagKeys(core, fnName) {
    const marker = `${fnName}({`;
    const start = core.indexOf(marker);
    if (start < 0) throw new Error(`bag call not found: ${fnName}`);
    const open = start + marker.length - 1;
    const { body } = extractBalancedBlock(core, open);
    return extractShorthandKeys(body);
}

const core = fs.readFileSync(CORE_PATH, 'utf8');
const allKeys = new Set();
for (const bag of BAGS) {
    for (const k of extractBagKeys(core, bag.fn)) allKeys.add(k);
}
const sortedKeys = [...allKeys].sort();

const assemblySrc = `// @ts-nocheck
/** Phase C — تجميع حقائب chunk scope في مكان واحد */
import { buildExecutionDashboardFollowupScopeBag } from './buildExecutionDashboardFollowupScopeBag';
import { buildExecutionDashboardCoerciveScopeBag } from './buildExecutionDashboardCoerciveScopeBag';
import { buildExecutionDashboardDecisionsSeizureEvictionScopeBag } from './buildExecutionDashboardDecisionsSeizureEvictionScopeBag';
import { buildExecutionDashboardWorkspaceScopeBag } from './buildExecutionDashboardWorkspaceScopeBag';
import { buildExecutionDashboardTimelineDossierScopeBag } from './buildExecutionDashboardTimelineDossierScopeBag';
import { buildExecutionDashboardFinancialScopeBag } from './buildExecutionDashboardFinancialScopeBag';

export type ExecutionDashboardCoreScopeBagInput = Record<string, unknown>;

export type ExecutionDashboardCoreScopeBags = {
    followupScopeBag: Record<string, unknown>;
    coerciveScopeBag: Record<string, unknown>;
    decisionsSeizureEvictionScopeBag: Record<string, unknown>;
    workspaceScopeBag: Record<string, unknown>;
    timelineDossierScopeBag: Record<string, unknown>;
    financialScopeBag: Record<string, unknown>;
};

export function buildExecutionDashboardCoreScopeBags(
    input: ExecutionDashboardCoreScopeBagInput,
): ExecutionDashboardCoreScopeBags {
    return {
        followupScopeBag: buildExecutionDashboardFollowupScopeBag(input),
        coerciveScopeBag: buildExecutionDashboardCoerciveScopeBag(input),
        decisionsSeizureEvictionScopeBag: buildExecutionDashboardDecisionsSeizureEvictionScopeBag(input),
        workspaceScopeBag: buildExecutionDashboardWorkspaceScopeBag(input),
        timelineDossierScopeBag: buildExecutionDashboardTimelineDossierScopeBag(input),
        financialScopeBag: buildExecutionDashboardFinancialScopeBag(input),
    };
}
`;

fs.writeFileSync(ASSEMBLY, assemblySrc, 'utf8');

const inputLines = sortedKeys.map((k) => `        ${k},`).join('\n');
const replacement = `    const {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
    } = buildExecutionDashboardCoreScopeBags({
${inputLines}
    });`;

const bagRegionStart = core.indexOf('    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({');
const lastBagEnd = core.indexOf('    const executionModalFlags = {');
if (bagRegionStart < 0 || lastBagEnd < 0) throw new Error('bag region markers not found');

let newCore = core.slice(0, bagRegionStart) + replacement + '\n\n' + core.slice(lastBagEnd);

newCore = newCore.replace(
    "import { buildExecutionDashboardFollowupScopeBag } from './executionDashboardCore/buildExecutionDashboardFollowupScopeBag';\nimport { buildExecutionDashboardCoerciveScopeBag } from './executionDashboardCore/buildExecutionDashboardCoerciveScopeBag';\nimport { buildExecutionDashboardFinancialScopeBag } from './executionDashboardCore/buildExecutionDashboardFinancialScopeBag';\nimport { buildExecutionDashboardTimelineDossierScopeBag } from './executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag';\nimport { buildExecutionDashboardDecisionsSeizureEvictionScopeBag } from './executionDashboardCore/buildExecutionDashboardDecisionsSeizureEvictionScopeBag';\nimport { buildExecutionDashboardWorkspaceScopeBag } from './executionDashboardCore/buildExecutionDashboardWorkspaceScopeBag';",
    "import { buildExecutionDashboardCoreScopeBags } from './executionDashboardCore/buildExecutionDashboardCoreScopeBags';",
);

fs.writeFileSync(CORE_PATH, newCore, 'utf8');
console.log('Phase C scope assembly extracted:', sortedKeys.length, 'input keys');
console.log('core lines:', newCore.split('\n').length);
