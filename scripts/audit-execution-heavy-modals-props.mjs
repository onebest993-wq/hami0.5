/**
 * يستخرج كل s.* من shell overlay chunks ويقارنها بـ registry + scope.
 */
import fs from 'node:fs';
import { resolveExecutionChunkScopeKeys } from './lib/resolveExecutionChunkScopeKeys.mjs';
import { isExecutionShellExplicitCloseProp } from './lib/executionShellExplicitCloseProps.mjs';

const SHELL_KEYS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';

const OVERLAY_FILES = [
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardEditOverlays.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardExecutorWorkflowOverlays.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardSolidaryEvictionOverlays.tsx',
];

function extractConstKeys(content) {
    const m = content.match(/export const EXECUTION_SHELL_OVERLAY_PROP_KEYS = \[([\s\S]*?)\] as const/);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function collectOverlayPropUsage() {
    const used = new Set();
    for (const file of OVERLAY_FILES) {
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/\bs\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) used.add(m[1]);
    }
    return used;
}

const shellKeys = new Set(extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8')));
const scopeKeys = resolveExecutionChunkScopeKeys();
const used = collectOverlayPropUsage();

const missingRegistry = [...used]
    .filter((k) => !shellKeys.has(k) && !isExecutionShellExplicitCloseProp(k))
    .sort();
const missingScope = missingRegistry.filter((k) => !scopeKeys.has(k));

console.log(`overlay s.* props: ${used.size}`);
console.log(`shell registry: ${shellKeys.size}`);
console.log(`missing registry (${missingRegistry.length}):`, missingRegistry.join(', ') || '(none)');
console.log(`missing scope among registry gaps (${missingScope.length}):`, missingScope.join(', ') || '(none)');

if (missingRegistry.length || missingScope.length) process.exit(1);
console.log('OK — heavy overlay props wired');
