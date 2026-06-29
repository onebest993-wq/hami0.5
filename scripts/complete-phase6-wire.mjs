import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
let content = fs.readFileSync(dashPath, 'utf8');

const importBlock = `import { useExecutionDashboardLazyChunkSetup } from './ExecutionDashboard/hooks/useExecutionDashboardLazyChunkSetup';
import { ExecutionDashboardChunkHost } from './ExecutionDashboard/components/ExecutionDashboardChunkHost';
`;

if (!content.includes('useExecutionDashboardLazyChunkSetup')) {
    content = content.replace(
        "import { FollowupModalContext } from './ExecutionDashboard/followupModalContext';",
        importBlock + "import { FollowupModalContext } from './ExecutionDashboard/followupModalContext';",
    );
}

if (!content.includes('LazyExecutionDashboardPhoneBody')) {
    content = content.replace(
        '    prefetchExecutionDashboardShell,',
        '    LazyExecutionDashboardPhoneBody,\n    prefetchExecutionDashboardShell,\n    prefetchExecutionDashboardPhoneBody,',
    );
}

const keys = JSON.parse(fs.readFileSync('scripts/_phone-body-keys.json', 'utf8'));
const sourceLines = keys.map((k) => `            ${k},`).join('\n');

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
        getScopeSources: () => ({
${sourceLines}
        }),
    });

`;

if (!content.includes('useExecutionDashboardLazyChunkSetup({')) {
    content = content.replace(
        '    return (\n        <ColleagueConsultationProvider',
        setupBlock + '    return (\n        <ColleagueConsultationProvider',
    );
}

const oldMain = /\s*\{\/\* MAIN DASHBOARD — lazy phone body \*\/\}\s*\n\s*\{phoneBodyReady \? \(\s*\n\s*<Suspense fallback=\{EXEC_SECTION_LAZY_FALLBACK\}>\s*\n\s*<ExecutionPhoneBodyScopeProvider scopeRef=\{phoneBodyScopeRef\}>\s*\n\s*<LazyExecutionDashboardPhoneBody[^]*?\)\}/s;

const newMain = `
            <ExecutionDashboardChunkHost
                phoneBodyReady={phoneBodyReady}
                shellOverlaysReady={shellOverlaysReady}
                chunkScopeRef={chunkScopeRef}
                phoneBodyFingerprint={phoneBodyFingerprint}
                showUnifiedExecutionModal={showUnifiedExecutionModal}
            />`;

if (oldMain.test(content)) {
    content = content.replace(oldMain, newMain);
} else {
    console.warn('main dashboard block pattern not found');
}

// ChunkHost uses direct PhoneBody import — remove unused lazy import if only used in replaced block
content = content.replace(/\n    LazyExecutionDashboardPhoneBody,\n/, '\n');

fs.writeFileSync(dashPath, content);
console.log('phase6 wire complete', { keys: keys.length });
