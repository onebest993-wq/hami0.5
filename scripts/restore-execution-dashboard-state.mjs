import fs from 'fs';

const monolithPath = '.tmp-exec-dash-monolith.tsx';
const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardState.ts';
const content = fs.readFileSync(monolithPath, 'utf8');
const lines = content.split(/\r?\n/);

const importEnd = lines.findIndex((l) => l.startsWith('export const ExecutionDashboard'));
const bodyStart = lines.findIndex((l) => l.includes('// EXECUTION DATA - MUST BE FIRST'));
const bodyEnd = lines.findIndex((l, i) => i > bodyStart && l.includes('CONDITIONAL RENDERING'));

if ([importEnd, bodyStart, bodyEnd].some((i) => i < 0)) {
    console.error('markers fail', { importEnd, bodyStart, bodyEnd });
    process.exit(1);
}

let importBlock = lines.slice(0, importEnd).join('\n');
importBlock = importBlock
    .replaceAll("from './ExecutionDashboard/hooks/", "from './")
    .replaceAll("from './ExecutionDashboard/components/", "from '../components/")
    .replaceAll("from './ExecutionDashboard/", "from '../")
    .replaceAll("from './ExecutionDashboard/types'", "from '../types'");

const hookImports = `import { useExecutionDashboardBootPrefetch } from './useExecutionDashboardBootPrefetch';
import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';
import type { ExecutionDashboardProps } from '../types';
import type { MutableRefObject } from 'react';

export type ExecutionDashboardStateViewModel = {
    isLoading: boolean;
    loadError: string | null;
    executionData: unknown;
    viewExecutionData: unknown;
    onClose: () => void;
    toastVisible: boolean;
    toastMessage: string;
    toastType: string;
    toastEpoch: number;
    hideToast: () => void;
    phoneBodyFingerprint: string;
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    chunkScopeRef: MutableRefObject<Record<string, unknown>>;
    showUnifiedExecutionModal: boolean;
};

`;

// Skip comment block lines after EXECUTION DATA marker
const body = lines.slice(bodyStart + 3, bodyEnd).join('\n');

const hookFile = `// @ts-nocheck
/** منطق ExecutionDashboard — مستخرج من المكوّن الرئيسي */
${importBlock}

${hookImports}
export function useExecutionDashboardState({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps): ExecutionDashboardStateViewModel {
${body}

    const executionModalFlags = {
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
        chunkDataReady: Boolean(executionData || file),
        getScopeSources: () => ({}),
    });

    return {
        isLoading,
        loadError,
        executionData,
        viewExecutionData,
        onClose,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        hideToast,
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
        showUnifiedExecutionModal,
    };
}
`;

fs.writeFileSync(hookPath, hookFile);
console.log('wrote hook', hookFile.split('\n').length, 'lines');
