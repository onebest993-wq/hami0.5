import fs from 'fs';
import { SCOPE_BAG_FRAGMENT_CONFIG } from './scope-bag-fragment-config.mjs';

const outPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreScopeBagAssembly.generated.ts';
if (!fs.existsSync(outPath)) {
    console.log('[spent] buildExecutionDashboardCoreScopeBagAssembly.generated.ts — skip');
    process.exit(0);
}

const fragmentCalls = SCOPE_BAG_FRAGMENT_CONFIG.map((f) => {
    return `        ${f.fn}(sources.${f.var}),`;
}).join('\n');

const sourceTypeFields = SCOPE_BAG_FRAGMENT_CONFIG.map(
    (f) => `    ${f.var}: Record<string, unknown>;`,
).join('\n');

const ts = `// @ts-nocheck
/** Auto-generated — Phase C Slice 21 — تجميع حقائب chunk scope */
import { buildExecutionDashboardCoreScopeBagsFromFragments } from './buildExecutionDashboardCoreScopeBagsFromInput';
import {
${SCOPE_BAG_FRAGMENT_CONFIG.map((f) => `    ${f.fn},`).join('\n')}
} from './executionDashboardCoreScopeBagFragments';

export type ExecutionDashboardCoreScopeBagAssemblySources = {
${sourceTypeFields}
};

export function buildExecutionDashboardCoreScopeBagAssembly(
    sources: ExecutionDashboardCoreScopeBagAssemblySources,
) {
    return buildExecutionDashboardCoreScopeBagsFromFragments(
${fragmentCalls}
    );
}
`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log('generate-scope-bag-assembly: OK');
console.log('fragments:', SCOPE_BAG_FRAGMENT_CONFIG.length);
console.log('lines:', ts.split('\n').length);
