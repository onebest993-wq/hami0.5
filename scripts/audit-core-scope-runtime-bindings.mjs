/**
 * Guards runtime bindings that must exist before scope assembly — regressions here
 * crash ExecutionDashboardView with ReferenceError and flood the browser console.
 */
import fs from 'node:fs';
import path from 'node:path';

const corePath = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const scopeChunkPath = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreScopeAndChunk.ts',
);
const src = fs.readFileSync(corePath, 'utf8');
const scopeChunkSrc = fs.existsSync(scopeChunkPath) ? fs.readFileSync(scopeChunkPath, 'utf8') : '';

const callStart = Math.max(
    src.indexOf('buildExecutionDashboardCoreScopeBagsFromFragments('),
    src.indexOf('buildExecutionDashboardCoreScopeBagAssembly('),
    src.indexOf('buildExecutionDashboardCoreScopeFromParts('),
    src.indexOf('buildExecutionDashboardCoreScopeBags('),
    src.indexOf('useExecutionDashboardCoreScopeAndChunk('),
);
if (callStart < 0) {
    console.error('buildExecutionDashboardCoreScopeBags call not found');
    process.exit(1);
}

const beforeCall = src.slice(0, callStart);

const REQUIRED_RUNTIME_BINDINGS = [
    'evictionExecutorWorkflow',
    'syncSeizedAssets',
    'syncSeizureDrafts',
    'syncActiveCoerciveActions',
    'seizedAssetsModalExecutionId',
    'totalExecutionExpenses',
    'initialFileNumber',
];

const defined = new Set();
const defRe = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g;
let m;
while ((m = defRe.exec(beforeCall))) defined.add(m[1]);

const destructureRe =
    /useExecutionDashboardCoreScopeRuntimeBindings\(\{[\s\S]*?\}\);\s*/;
const destructureBlock = beforeCall.match(destructureRe)?.[0] ?? '';
for (const dm of destructureBlock.matchAll(/^\s+([A-Za-z_$][\w$]*),?\s*$/gm)) {
    defined.add(dm[1]);
}

const runtimeHookStart = beforeCall.indexOf(
    '} = useExecutionDashboardCoreScopeRuntimeBindings({',
);
if (runtimeHookStart >= 0) {
    const openBrace = beforeCall.lastIndexOf('const {', runtimeHookStart);
    const block = beforeCall.slice(openBrace, runtimeHookStart);
    for (const dm of block.matchAll(/^\s+([A-Za-z_$][\w$]*),?\s*$/gm)) {
        defined.add(dm[1]);
    }
}

const scopeRuntimeAliasStart = beforeCall.indexOf('} = scopeRuntimeBindings;');
if (scopeRuntimeAliasStart >= 0) {
    const openBrace = beforeCall.lastIndexOf('const {', scopeRuntimeAliasStart);
    const block = beforeCall.slice(openBrace, scopeRuntimeAliasStart);
    for (const dm of block.matchAll(/^\s+([A-Za-z_$][\w$]*),?\s*$/gm)) {
        defined.add(dm[1]);
    }
}

if (
    defined.has('scopeRuntimeBindings') ||
    scopeChunkSrc.includes('useExecutionDashboardCoreScopeRuntimeBindings') ||
    beforeCall.includes('scopeRuntimeInput:')
) {
    defined.add('evictionExecutorWorkflow');
    defined.add('syncSeizedAssets');
    defined.add('syncSeizureDrafts');
    defined.add('syncActiveCoerciveActions');
    defined.add('seizedAssetsModalExecutionId');
    defined.add('totalExecutionExpenses');
    defined.add('initialFileNumber');
}

const missing = REQUIRED_RUNTIME_BINDINGS.filter((name) => !defined.has(name));
if (missing.length) {
    console.error('MISSING runtime bindings before scope assembly:');
    for (const name of missing) console.error('  -', name);
    process.exit(1);
}

console.log(`OK — ${REQUIRED_RUNTIME_BINDINGS.length} critical scope runtime bindings present`);
