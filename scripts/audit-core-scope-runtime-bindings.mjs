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
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const SCOPE_FRAGMENTS_DIR = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/scopeBagFragments',
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
const fragmentsSrc = fs.existsSync(SCOPE_FRAGMENTS_DIR)
    ? fs
          .readdirSync(SCOPE_FRAGMENTS_DIR)
          .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
          .map((name) => fs.readFileSync(path.join(SCOPE_FRAGMENTS_DIR, name), 'utf8'))
          .join('\n')
    : fs.existsSync(`${SCOPE_FRAGMENTS_DIR}.ts`)
      ? fs.readFileSync(`${SCOPE_FRAGMENTS_DIR}.ts`, 'utf8')
      : '';

if (!fragmentsSrc) {
    console.warn(
        '[audit-core-scope-runtime-bindings] scopeBagFragments missing — checking bindings return only',
    );
}

if (!assemblySrc.includes('useExecutionDashboardCoreScopeAndChunk(')) {
    console.error('useExecutionDashboardCoreScopeAndChunk call not found in useExecutionDashboardCore');
    process.exit(1);
}

if (!assemblySrc.includes('scopeRuntimeInput')) {
    console.error('scopeRuntimeInput not found in useExecutionDashboardCore');
    process.exit(1);
}

const missingFromBindings = REQUIRED_RUNTIME_BINDINGS.filter((name) => {
    const inReturn = new RegExp(`\\b${name}\\b`).test(
        bindingsSrc.slice(bindingsSrc.indexOf('return {')),
    );
    return !inReturn;
});

const missingFromFragments = fragmentsSrc
    ? REQUIRED_RUNTIME_BINDINGS.filter(
          (name) => !fragmentsSrc.includes(`"${name}"`) && !fragmentsSrc.includes(`'${name}'`),
      )
    : [];

const missing = [...new Set([...missingFromBindings, ...missingFromFragments])];
if (missing.length) {
    console.error('MISSING critical scope runtime bindings:');
    for (const name of missing) console.error('  -', name);
    process.exit(1);
}

console.log(`OK — ${REQUIRED_RUNTIME_BINDINGS.length} critical scope runtime bindings present`);
