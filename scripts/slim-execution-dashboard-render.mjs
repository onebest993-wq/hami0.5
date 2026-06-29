import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
let content = fs.readFileSync(dashPath, 'utf8');

// Replace prefetch effect
content = content.replace(
    /    useEffect\(\(\) => \{\s*prefetchExecutionDashboardShell\(\);[\s\S]*?\}, \[\]\);/,
    '    useExecutionDashboardBootPrefetch();',
);

// Replace loading/error blocks
content = content.replace(
    /    if \(isLoading\) \{\s*return <ExecutionDashboardSkeleton \/>;\s*\}\s*if \(loadError \|\| !executionData\) \{\s*return \([\s\S]*?\);\s*\}/,
    `    if (isLoading) {
        return <ExecutionDashboardLoadingView />;
    }

    if (loadError || !executionData) {
        return (
            <ExecutionDashboardErrorView
                message={loadError || 'لم يتم العثور على بيانات التنفيذ'}
                onClose={onClose}
            />
        );
    }`,
);

// Replace fingerprint through chunkScopeRef block with lazy chunk setup hook
const start = content.indexOf('    const phoneBodyFingerprint = computeExecutionPhoneBodyFingerprint({');
const end = content.indexOf('    return (', start);
if (start < 0 || end < 0) {
    console.error('chunk block not found', { start, end });
    process.exit(1);
}

const keys = JSON.parse(fs.readFileSync('scripts/_chunk-scope-keys.json', 'utf8'));
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
            activeTab,
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

content = content.slice(0, start) + setupBlock + content.slice(end);

// Replace chunk JSX with ExecutionDashboardChunkHost
const chunkJsxOld =
    /\{phoneBodyReady \|\| shellOverlaysReady \? \([\s\S]*?<\/ExecutionDashboardChunkScopeProvider>\s*\) : \([\s\S]*?aria-hidden\s*\n\s*\/>\s*\n\s*\)\}/;

content = content.replace(
    chunkJsxOld,
    `<ExecutionDashboardChunkHost
                phoneBodyReady={phoneBodyReady}
                shellOverlaysReady={shellOverlaysReady}
                chunkScopeRef={chunkScopeRef}
                phoneBodyFingerprint={phoneBodyFingerprint}
                showUnifiedExecutionModal={showUnifiedExecutionModal}
            />`,
);

// Update imports
if (!content.includes('useExecutionDashboardLazyChunkSetup')) {
    content = content.replace(
        "import { useExecutionDashboardLazyChunkGates } from './ExecutionDashboard/hooks/useExecutionDashboardLazyChunkGates';\nimport { useExecutionDashboardChunkScopeRef } from './ExecutionDashboard/hooks/useExecutionDashboardChunkScopeRef';\nimport { ExecutionDashboardChunkScopeProvider } from './ExecutionDashboard/hooks/executionDashboardChunkScope';\nimport { computeExecutionPhoneBodyFingerprint } from './ExecutionDashboard/hooks/buildExecutionPhoneBodyProps';",
        "import { useExecutionDashboardLazyChunkSetup } from './ExecutionDashboard/hooks/useExecutionDashboardLazyChunkSetup';\nimport { useExecutionDashboardBootPrefetch } from './ExecutionDashboard/hooks/useExecutionDashboardBootPrefetch';\nimport { ExecutionDashboardChunkHost } from './ExecutionDashboard/components/ExecutionDashboardChunkHost';\nimport {\n    ExecutionDashboardErrorView,\n    ExecutionDashboardLoadingView,\n} from './ExecutionDashboard/components/ExecutionDashboardStatusViews';",
    );
}

// Remove unused lazy imports from main dashboard if only used in chunk host
content = content.replace(
    /    LazyExecutionDashboardPhoneBody,\n    LazyExecutionDashboardShellOverlays,\n/g,
    '',
);

fs.writeFileSync(dashPath, content);
console.log('slimmed ExecutionDashboard render shell');
