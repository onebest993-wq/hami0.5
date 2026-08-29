import { useMemo } from 'react';
import { buildExecutionDashboardCoreModalScopeInput } from './buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './buildExecutionDashboardCoreChunkFingerprint';

export function useExecutionDashboardCoreModalAndChunkInputs(p: {
    boot: Record<string, unknown> & {
        modals: unknown;
        setExecutionModal: unknown;
        showLinkedDossierTimeline: unknown;
        showTransferFileNumberChangeModal: unknown;
        setShowDecisionsModal: unknown;
        setShowDocumentsModal: unknown;
        setShowTimelineModal: unknown;
        setShowCoerciveModal: unknown;
        setShowNotificationModal: unknown;
        setShowPaymentModal: unknown;
        setShowSeizedAssetsModal: unknown;
        setShowNotesModal: unknown;
        setShowAppointmentModal: unknown;
        setShowPaymentCalculator: unknown;
        setShowSettlementCalculator: unknown;
        setShowPauseModal: unknown;
        setShowLinkedDossierTimeline: unknown;
        setShowTransferFileNumberChangeModal: unknown;
        activeTabId: unknown;
        executionStorageTick: unknown;
        isHeaderExpanded: unknown;
        executionData: unknown;
    };
    setShowUnifiedSummonsModal: unknown;
    setShowLedgerModal: unknown;
    setEditingNoteId: unknown;
    followupOrchestrator: unknown;
    seizureOrchestrator: unknown;
    dossierMetaWorkflow: {
        showEditDossierMetaModal: unknown;
        setShowEditDossierMetaModal: unknown;
    };
    executionId: unknown;
    activeFinancialTab: unknown;
    activeTimelineFilter: unknown;
    executionPaused: unknown;
    dossierLifecyclePanel: unknown;
    toastEpoch: unknown;
    claimFinancialLedger: {
        unifiedLedgerRevision: unknown;
        financialPrincipalAmount: unknown;
    };
    followupDebtor: { showUnifiedSeizureLogModal: unknown };
    timelineAccordionExpanded: unknown;
    isFinancialCenterExpanded: unknown;
    coercionOrchestrator: unknown;
    noticeVoluntaryPeriodEndOptimistic: unknown;
    voluntaryEndOptimistic: unknown;
    notificationCount: unknown;
    showExecutionFinancialHub: unknown;
    workspacePipeline: {
        showExecutionTrashModal: unknown;
        decisionsReloadEpoch: unknown;
    };
    handlerClusterEpoch: unknown;
    evictionGracePinned: unknown;
    evictionGraceHidden: unknown;
}) {
    const modalScopeInput = useMemo(
        () =>
            buildExecutionDashboardCoreModalScopeInput({
                modals: p.boot.modals,
                setExecutionModal: p.boot.setExecutionModal,
                showLinkedDossierTimeline: p.boot.showLinkedDossierTimeline,
                showTransferFileNumberChangeModal: p.boot.showTransferFileNumberChangeModal,
                setShowDecisionsModal: p.boot.setShowDecisionsModal,
                setShowDocumentsModal: p.boot.setShowDocumentsModal,
                setShowTimelineModal: p.boot.setShowTimelineModal,
                setShowCoerciveModal: p.boot.setShowCoerciveModal,
                setShowNotificationModal: p.boot.setShowNotificationModal,
                setShowUnifiedSummonsModal: p.setShowUnifiedSummonsModal,
                setShowPaymentModal: p.boot.setShowPaymentModal,
                setShowSeizedAssetsModal: p.boot.setShowSeizedAssetsModal,
                setShowNotesModal: p.boot.setShowNotesModal,
                setShowAppointmentModal: p.boot.setShowAppointmentModal,
                setShowPaymentCalculator: p.boot.setShowPaymentCalculator,
                setShowSettlementCalculator: p.boot.setShowSettlementCalculator,
                setShowPauseModal: p.boot.setShowPauseModal,
                setShowLedgerModal: p.setShowLedgerModal,
                showEditDossierMetaModal: p.dossierMetaWorkflow.showEditDossierMetaModal,
                setShowEditDossierMetaModal: p.dossierMetaWorkflow.setShowEditDossierMetaModal,
                setShowLinkedDossierTimeline: p.boot.setShowLinkedDossierTimeline,
                setShowTransferFileNumberChangeModal: p.boot.setShowTransferFileNumberChangeModal,
                setEditingNoteId: p.setEditingNoteId,
                followupOrchestrator: p.followupOrchestrator,
                seizureOrchestrator: p.seizureOrchestrator,
            } as Parameters<typeof buildExecutionDashboardCoreModalScopeInput>[0]),
        [
            p.boot.modals,
            p.boot.setExecutionModal,
            p.boot.showLinkedDossierTimeline,
            p.boot.showTransferFileNumberChangeModal,
            p.boot.setShowDecisionsModal,
            p.boot.setShowDocumentsModal,
            p.boot.setShowTimelineModal,
            p.boot.setShowCoerciveModal,
            p.boot.setShowNotificationModal,
            p.setShowUnifiedSummonsModal,
            p.boot.setShowPaymentModal,
            p.boot.setShowSeizedAssetsModal,
            p.boot.setShowNotesModal,
            p.boot.setShowAppointmentModal,
            p.boot.setShowPaymentCalculator,
            p.boot.setShowSettlementCalculator,
            p.boot.setShowPauseModal,
            p.setShowLedgerModal,
            p.dossierMetaWorkflow.showEditDossierMetaModal,
            p.dossierMetaWorkflow.setShowEditDossierMetaModal,
            p.setEditingNoteId,
            p.followupOrchestrator,
            p.seizureOrchestrator,
        ],
    );

    const chunkSetupInput = useMemo(
        () => ({
            fingerprintInput: buildExecutionDashboardCoreChunkFingerprint({
                executionId: p.executionId,
                activeTabId: p.boot.activeTabId,
                activeFinancialTab: p.activeFinancialTab,
                activeTimelineFilter: p.activeTimelineFilter,
                executionPaused: p.executionPaused,
                dossierLifecyclePanel: p.dossierLifecyclePanel,
                toastEpoch: p.toastEpoch,
                unifiedLedgerRevision: p.claimFinancialLedger.unifiedLedgerRevision,
                executionStorageTick: p.boot.executionStorageTick,
                financialPrincipalAmount: p.claimFinancialLedger.financialPrincipalAmount,
                followupOrchestrator: p.followupOrchestrator,
                showUnifiedSeizureLogModal: p.followupDebtor.showUnifiedSeizureLogModal,
                timelineAccordionExpanded: p.timelineAccordionExpanded,
                isFinancialCenterExpanded: p.isFinancialCenterExpanded,
                isHeaderExpanded: p.boot.isHeaderExpanded,
                coercionOrchestrator: p.coercionOrchestrator,
                noticeVoluntaryPeriodEndOptimistic: p.noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic: p.voluntaryEndOptimistic,
                notificationCount: p.notificationCount,
                showExecutionFinancialHub: p.showExecutionFinancialHub,
                showExecutionTrashModal: p.workspacePipeline.showExecutionTrashModal,
                handlerClusterEpoch: p.handlerClusterEpoch,
                decisionsReloadEpoch: p.workspacePipeline.decisionsReloadEpoch,
                evictionGracePinned: p.evictionGracePinned,
                evictionGraceHidden: p.evictionGraceHidden,
            } as Parameters<typeof buildExecutionDashboardCoreChunkFingerprint>[0]),
            chunkDataReady: Boolean(p.boot.executionData),
        }),
        [
            p.executionId,
            p.boot.activeTabId,
            p.activeFinancialTab,
            p.activeTimelineFilter,
            p.executionPaused,
            p.dossierLifecyclePanel,
            p.toastEpoch,
            p.claimFinancialLedger.unifiedLedgerRevision,
            p.boot.executionStorageTick,
            p.claimFinancialLedger.financialPrincipalAmount,
            p.followupOrchestrator,
            p.followupDebtor.showUnifiedSeizureLogModal,
            p.timelineAccordionExpanded,
            p.isFinancialCenterExpanded,
            p.boot.isHeaderExpanded,
            p.coercionOrchestrator,
            p.noticeVoluntaryPeriodEndOptimistic,
            p.voluntaryEndOptimistic,
            p.notificationCount,
            p.showExecutionFinancialHub,
            p.workspacePipeline.showExecutionTrashModal,
            p.handlerClusterEpoch,
            p.workspacePipeline.decisionsReloadEpoch,
            p.evictionGracePinned,
            p.evictionGraceHidden,
            p.boot.executionData,
        ],
    );

    return { modalScopeInput, chunkSetupInput };
}
