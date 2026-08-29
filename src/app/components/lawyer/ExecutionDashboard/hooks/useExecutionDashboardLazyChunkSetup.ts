import type { MutableRefObject } from 'react';
import { computeExecutionPhoneBodyFingerprint } from './buildExecutionPhoneBodyProps';
import { useExecutionDashboardLazyChunkGates } from './useExecutionDashboardLazyChunkGates';
import {
    useExecutionPhoneBodyChunkScopeRef,
    useExecutionShellOverlayChunkScopeRef,
} from './useExecutionDashboardChunkScopeRef';
import type { ExecutionShellOverlayModalFlags } from './executionShellOverlayModalFlags';

export type ExecutionDashboardLazyChunkSetupInput = {
    fingerprintInput: Parameters<typeof computeExecutionPhoneBodyFingerprint>[0];
    modalFlags: ExecutionShellOverlayModalFlags;
    getScopeSources: () => Record<string, unknown>;
    phoneBodyScopeSyncToken?: string;
    shellOverlayScopeSyncToken?: string;
    chunkDataReady?: boolean;
    shellOverlayStateToken?: string;
    overlayIntentUrgent?: boolean;
};

export type ExecutionDashboardLazyChunkSetupResult = {
    phoneBodyFingerprint: string;
    shellOverlayFingerprint: string;
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    phoneBodyScopeRef: MutableRefObject<Record<string, unknown>>;
    shellOverlayScopeRef: MutableRefObject<Record<string, unknown>>;
};

function computeExecutionShellOverlayFingerprint(
    modalFlags: ExecutionShellOverlayModalFlags,
    scopeSyncToken = '0',
    shellOverlayStateToken = '0',
): string {
    return [
        modalFlags.showUnifiedExecutionModal,
        modalFlags.showDecisionsModal,
        modalFlags.showDocumentsModal,
        modalFlags.showTimelineModal,
        modalFlags.showCoerciveModal,
        modalFlags.showNotificationModal,
        modalFlags.showUnifiedSummonsModal,
        modalFlags.showPaymentModal,
        modalFlags.showSeizedAssetsModal,
        modalFlags.showNotesModal,
        modalFlags.showAppointmentModal,
        modalFlags.showEditDossierMetaModal,
        modalFlags.showLedgerModal,
        modalFlags.showPauseModal,
        modalFlags.showPaymentCalculator,
        modalFlags.showSettlementCalculator,
        modalFlags.showExecutionTrashModal,
        modalFlags.showGuarantorDetailsModal,
        modalFlags.showHeirsNotificationModal,
        modalFlags.showTransferFileNumberChangeModal,
        modalFlags.showRealEstateSeizureModal,
        modalFlags.showEvictionExpenseModal,
        modalFlags.showEvictionLawyerFeeModal,
        modalFlags.showEvictionResidentialGraceModal,
        modalFlags.showSolidaryCoerciveTargetModal,
        modalFlags.showStayOfExecutionModal,
        modalFlags.showLinkedDossierTimeline,
    ]
        .map((value) => (value ? '1' : '0'))
        .join('')
        .concat('|', scopeSyncToken, '|', shellOverlayStateToken);
}

/** بصمة + بوابات + ref موحّد لـ lazy chunks */
export function useExecutionDashboardLazyChunkSetup({
    fingerprintInput,
    modalFlags,
    getScopeSources,
    phoneBodyScopeSyncToken = '0',
    shellOverlayScopeSyncToken = '0',
    chunkDataReady = true,
    shellOverlayStateToken = '0',
    overlayIntentUrgent = false,
}: ExecutionDashboardLazyChunkSetupInput): ExecutionDashboardLazyChunkSetupResult {
    const phoneBodyFingerprint = `${computeExecutionPhoneBodyFingerprint(fingerprintInput)}|${phoneBodyScopeSyncToken}`;
    const shellOverlayFingerprint = computeExecutionShellOverlayFingerprint(
        modalFlags,
        shellOverlayScopeSyncToken,
        shellOverlayStateToken,
    );

    const { phoneBodyReady, shellOverlaysReady } = useExecutionDashboardLazyChunkGates(
        modalFlags,
        chunkDataReady,
        overlayIntentUrgent,
    );

    const phoneBodyScopeRef = useExecutionPhoneBodyChunkScopeRef(
        phoneBodyReady,
        phoneBodyScopeSyncToken,
        getScopeSources,
    );
    const shellOverlayScopeRef = useExecutionShellOverlayChunkScopeRef(
        shellOverlaysReady,
        shellOverlayScopeSyncToken,
        getScopeSources,
    );

    return {
        phoneBodyFingerprint,
        shellOverlayFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
    };
}
