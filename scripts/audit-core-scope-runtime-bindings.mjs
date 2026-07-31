/**
 * Guards runtime bindings that must exist before scope assembly — regressions here
 * crash ExecutionDashboardView with ReferenceError and flood the browser console.
 */
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_BINDINGS_PATH = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreScopeRuntimeBindings.ts',
);
const RUNTIME_ASSEMBLY_PATH = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardRuntimeAssembly.ts',
);
const SCOPE_FRAGMENTS_PATH = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeBagFragments.ts',
);

const REQUIRED_RUNTIME_BINDINGS = [
    'evictionExecutorWorkflow',
    'syncSeizedAssets',
    'syncSeizureDrafts',
    'syncActiveCoerciveActions',
    'seizedAssetsModalExecutionId',
    'totalExecutionExpenses',
    'initialFileNumber',
];

const bindingsSrc = fs.readFileSync(RUNTIME_BINDINGS_PATH, 'utf8');
const assemblySrc = fs.readFileSync(RUNTIME_ASSEMBLY_PATH, 'utf8');
const fragmentsSrc = fs.readFileSync(SCOPE_FRAGMENTS_PATH, 'utf8');

if (!assemblySrc.includes('useExecutionDashboardCoreScopeAndChunk(')) {
    console.error('useExecutionDashboardCoreScopeAndChunk call not found in runtime assembly');
    process.exit(1);
}

if (!assemblySrc.includes('scopeRuntimeInput')) {
    console.error('scopeRuntimeInput not found in runtime assembly');
    process.exit(1);
}

const missingFromBindings = REQUIRED_RUNTIME_BINDINGS.filter((name) => {
    const inReturn = new RegExp(`\\b${name}\\b`).test(
        bindingsSrc.slice(bindingsSrc.indexOf('return {')),
    );
    return !inReturn;
});

const missingFromFragments = REQUIRED_RUNTIME_BINDINGS.filter(
    (name) => !fragmentsSrc.includes(`"${name}"`) && !fragmentsSrc.includes(`'${name}'`),
);

const missing = [...new Set([...missingFromBindings, ...missingFromFragments])];
if (missing.length) {
    console.error('MISSING critical scope runtime bindings:');
    for (const name of missing) console.error('  -', name);
    process.exit(1);
}

console.log(`OK — ${REQUIRED_RUNTIME_BINDINGS.length} critical scope runtime bindings present`);
