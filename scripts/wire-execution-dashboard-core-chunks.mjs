/**
 * يربط useExecutionDashboardLazyChunkSetup داخل useExecutionDashboardCore
 * node scripts/wire-execution-dashboard-core-chunks.mjs
 */
import fs from 'fs';
import {
    buildPhoneBodyScopeKeys,
    collectExecutionViewScopeBindings,
    validateScopeKeys,
} from './phone-body-scope-utils.mjs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const phoneBodyPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
const keysJsonPath = 'scripts/_chunk-scope-keys.json';

let core = fs.readFileSync(corePath, 'utf8');
const phoneBody = fs.readFileSync(phoneBodyPath, 'utf8');

let scopeKeys;
if (core.includes('getScopeSources:')) {
    scopeKeys = buildPhoneBodyScopeKeys(phoneBody, core);
} else if (fs.existsSync(keysJsonPath)) {
    scopeKeys = JSON.parse(fs.readFileSync(keysJsonPath, 'utf8'));
    console.log('[wire-core-chunks] using existing keys json', scopeKeys.length);
} else {
    throw new Error('no getScopeSources and no _chunk-scope-keys.json');
}
const problems = core.includes('getScopeSources:') ? validateScopeKeys(core, scopeKeys) : [];
if (problems.length) {
    console.warn('[wire-core-chunks] scope validation warnings:', problems.length);
    console.warn(problems.slice(0, 20).join('\n'));
}

if (!core.includes('useExecutionDashboardLazyChunkSetup')) {
    core = core.replace(
        "import type { ExecutionDashboardProps } from '../types';",
        "import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';\nimport type { ExecutionDashboardProps } from '../types';",
    );
}

fs.writeFileSync(keysJsonPath, JSON.stringify(scopeKeys, null, 2) + '\n');

const sourceLines = scopeKeys.map((k) => `            ${k},`).join('\n');

const setupBlock = `    const executionModalFlags = {
        showUnifiedExecutionModal,
        showDecisionsModal,
        showDocumentsModal,
        showTimelineModal,
        showCoerciveModal,
        showNotificationModal,
        showUnifiedSummonsModal,
        showPaymentModal,
        showSeizedAssetsModal,
        showNotesModal,
        showAppointmentModal,
    };

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardLazyChunkSetup({
        fingerprintInput: {
            executionId,
            activeTabId,
            activeFinancialTab,
            activeTimelineFilter,
            executionPaused,
            dossierLifecyclePanelOpen,
            toastEpoch,
            dataRevision: unifiedLedgerRevision,
            executionDebtorTabIndex,
            showUnifiedSeizureLogModal,
            timelineAccordionExpanded,
            isFinancialCenterExpanded,
        },
        modalFlags: executionModalFlags,
        chunkDataReady: Boolean(executionData),
        getScopeSources: () => ({
${sourceLines}
        }),
    });

`;

const returnMarker = '\n    return {\n        isLoading,';
if (!core.includes('useExecutionDashboardLazyChunkSetup({')) {
    if (!core.includes(returnMarker)) {
        throw new Error('core return marker not found');
    }
    core = core.replace(returnMarker, `\n${setupBlock}${returnMarker.trimStart()}`);
}

fs.writeFileSync(corePath, core);

let bindings = 0;
try {
    bindings = collectExecutionViewScopeBindings(core).size;
} catch {
    bindings = -1;
}
console.log('[wire-execution-dashboard-core-chunks]', {
    scopeKeys: scopeKeys.length,
    bindings,
    coreLines: core.split('\n').length,
});
