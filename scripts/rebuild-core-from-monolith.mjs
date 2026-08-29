/**
 * Rebuild useExecutionDashboardCore from monolith → post Slice 28 (~1800 lines)
 */
import fs from 'fs';
import { execSync } from 'child_process';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function rb(start, end, rep, label) {
    const norm = (s) => s.replace(/\r\n/g, '\n');
    const ncore = norm(core);
    const s = ncore.indexOf(norm(start));
    const e = end ? ncore.indexOf(norm(end), s) : -1;
    if (s < 0 || (end && e <= s)) {
        console.error(`FAIL [${label}]`, { start: s, end: e, startSnippet: start.slice(0, 50) });
        process.exit(1);
    }
    // map back to original core indices — use normalized slice write
    const nrep = norm(rep);
    const nEnd = end ? e : ncore.length;
    core = norm(core).slice(0, s) + nrep + norm(core).slice(nEnd);
    console.log(`OK [${label}]`, (nEnd - s), '→', nrep.length, 'chars');
}

const EXTRA_IMPORTS = `
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCoreWorkspacePipeline } from './executionDashboardCore/useExecutionDashboardCoreWorkspacePipeline';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './executionDashboardCore/useExecutionDashboardCoreGraceMasterEvictionPipeline';
import { useExecutionDashboardCorePersistHandlerPipeline } from './executionDashboardCore/useExecutionDashboardCorePersistHandlerPipeline';
import { useExecutionDashboardCoreFileMetadataBinding } from './executionDashboardCore/useExecutionDashboardCoreFileMetadataBinding';
import { useExecutionDashboardCoreFollowupDebtorPipeline } from './executionDashboardCore/useExecutionDashboardCoreFollowupDebtorPipeline';
import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './executionDashboardCore/useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreHandlerCluster } from './executionDashboardCore/useExecutionDashboardCoreHandlerCluster';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import { collectHandlerClusterContext } from './executionDashboardCore/collectHandlerClusterContext';
import { pickHandlerClusterAssemblyHandlers } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';
`;

if (!core.includes('useExecutionDashboardCoreWorkspacePipeline')) {
    core = core.replace('export function useExecutionDashboardCore({', `${EXTRA_IMPORTS}\nexport function useExecutionDashboardCore({`);
}

// --- 1 workspace ---
const WS = fs.readFileSync('scripts/patch-slice27-ws-snippet.txt', 'utf8');
rb('\tconst todayYmd = useTodayYmd();', '    // ===========================\n    // OMNIBUS 1:1 DATA BINDING - ZERO DATA LOSS\n    // ===========================', WS, 'workspace');

// --- 2 file metadata ---
const META = fs.readFileSync('scripts/patch-slice28-metadata-snippet.txt', 'utf8');
rb(
    '    // ===========================\n    // OMNIBUS 1:1 DATA BINDING - ZERO DATA LOSS\n    // ===========================',
    '    // ===========================\n    // Financial debug logging removed from render path for performance',
    META,
    'metadata',
);

// --- 3 followup ---
const FOLLOWUP = fs.readFileSync('scripts/patch-slice26-followup-snippet.txt', 'utf8');
rb('    const effectiveCreditors = creditors || [];', '    const executionExtras = (executionData', FOLLOWUP, 'followup');

// --- 4 claim ---
const CLAIM = fs.readFileSync('scripts/patch-slice25b-claim-snippet.txt', 'utf8');
rb('    const dynamicExpenses = useDynamicExpenses();', '    const {\n        generalMemoGraceAnchor,', CLAIM, 'claim');

// --- 5 grace ---
const GRACE = fs.readFileSync('scripts/patch-slice27-grace-snippet.txt', 'utf8');
rb('    const {\n        generalMemoGraceAnchor,', '    // ===========================\n    // FINANCIAL CENTER ACCORDION & TABS STATE', GRACE, 'grace');

// --- 6 persist ---
const PERSIST = fs.readFileSync('scripts/patch-slice27-persist-snippet.txt', 'utf8');
rb('    // ===========================\n    // SMART DEMOGRAPHIC ROUTING', '    const {\n        executorDecisions,', PERSIST, 'persist');

// --- 7 tail (handler cluster + scope) ---
const TAIL = fs.readFileSync('scripts/patch-slice28-tail-snippet.txt', 'utf8');
rb('    const {\n        executorDecisions,', '    return {\n        isLoading,', TAIL, 'tail');

fs.writeFileSync(corePath, core, 'utf8');
console.log('rebuild complete, lines:', core.split('\n').length);

try {
    execSync('node scripts/generate-slice27-extraction.mjs', { stdio: 'inherit' });
} catch {
    /* manifest may already exist */
}
