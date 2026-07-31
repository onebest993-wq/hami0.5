/** Shell overlays — chunk منفصل */
import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, History, Pause, Play } from 'lucide-react';
import { EXEC_MODAL_Z, EXEC_MODAL_BACKDROP_STRONG } from '@/app/components/lawyer/execution/executionModalStack';
import {
    ExecutionDashboardEditOverlays,
    type ExecutionDashboardEditOverlaysProps,
} from './ExecutionDashboardEditOverlays';
import {
    ExecutionDashboardNotesOverlays,
    type ExecutionDashboardNotesOverlaysProps,
} from './ExecutionDashboardNotesOverlays';
import {
    ExecutionDashboardExecutorWorkflowOverlays,
    type ExecutionDashboardExecutorWorkflowOverlaysProps,
} from './ExecutionDashboardExecutorWorkflowOverlays';
import { ExecutionDashboardHeavyModals } from './ExecutionDashboardHeavyModals';
import {
    ExecutionDashboardSolidaryEvictionOverlays,
    type ExecutionDashboardSolidaryEvictionOverlaysProps,
} from './ExecutionDashboardSolidaryEvictionOverlays';
import { ExecutionFollowupModalHost } from './ExecutionFollowupModalHost';
import {
    ExecutionDashboardSeizedPropertyPortals,
    type ExecutionDashboardSeizedPropertyPortalsProps,
} from './ExecutionDashboardSeizedPropertyPortals';
import {
    LazyExecutorApprovedDateTimeModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    LazyPoliceAssistanceDetailsModal,
} from '../executionDashboardLazyRegistry';
import { EXEC_OVERLAY_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { getLocalTodayYmd } from '../executionDashboardDate';
import { pickSeizedPropertyPortalProps } from '../hooks/pickSeizedPropertyPortalProps';
import { pickExecutionShellOverlayProps } from '../hooks/pickExecutionShellOverlayProps';
import { buildFollowupModalSnapshotInput } from '../hooks/buildFollowupModalSnapshotInput';
import { useExecutionFollowupModalSnapshot } from '../hooks/useExecutionFollowupModalSnapshot';
import { buildDebtorNoticePatchForKey } from '@/app/utils/noticeDebtorScope';
import { prefetchExecutionFollowupOverlay } from '../executionDashboardOverlayPrefetch';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    readUnifiedFundsLedger,
    filterUnifiedLawyerFeesHideFileDuplicate,
    filterUnifiedExpensesHideFileDuplicate,
} from '@/app/utils/unifiedFundsLedgerStorage';
import { buildInitialExecutorSeizureDetails } from '../helpers/buildInitialExecutorSeizureDetails';
import { formatUnifiedLedgerDate } from '../helpers/formatUnifiedLedgerDate';
import { mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import { getPublicationNoticeForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import {
    readExecutionShellOverlayScope,
    useExecutionShellOverlayScopeRef,
} from '../hooks/executionShellOverlayScope';
import { useExecutionDashboardStore as executionDashboardStoreApi } from '@/app/stores/executionDashboardStore';

export type ExecutionDashboardShellOverlaysProps = {
    showUnifiedExecutionModal?: boolean;
    unifiedModalTab?: string | null;
    scope?: Record<string, unknown>;
    followupSnapshot?: Record<string, unknown>;
};

function withShellOverlayScopeFallback(scope: Record<string, unknown>): Record<string, unknown> {
    const store = executionDashboardStoreApi.getState();
    const modalState = store.modals;
    const resolveModalOpen = (scopeValue: unknown, storeValue: boolean) =>
        storeValue || (typeof scopeValue === 'boolean' ? scopeValue : false);
    const modalSetter = (modalName: string) => (show: boolean) => {
        if (show) {
            store.openModal(modalName as never);
            return;
        }
        store.closeModal(modalName as never);
    };
    return {
        ...scope,
        AlertCircle,
        CheckCircle,
        EXEC_MODAL_BACKDROP_STRONG,
        EXEC_MODAL_Z,
        EXEC_OVERLAY_LAZY_FALLBACK,
        History,
        LazyExecutorApprovedDateTimeModal,
        LazyExecutorBreakInventoryFurnitureModal,
        LazyExecutorJudicialCustodianModal,
        LazyExecutorWorkflowConfirmModal,
        LazyPoliceAssistanceDetailsModal,
        Pause,
        Play,
        buildDebtorNoticePatchForKey,
        buildInitialExecutorSeizureDetails,
        executionStorageKey,
        filterUnifiedExpensesHideFileDuplicate,
        filterUnifiedLawyerFeesHideFileDuplicate,
        formatUnifiedLedgerDate,
        getLocalTodayYmd,
        getPublicationNoticeForDebtorKey,
        heirsNotificationModalZIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification,
        mergeSimilarRecentTimelineEvent,
        nestedOverUnifiedZIndex: EXEC_MODAL_Z.nestedOverUnified,
        notificationModalZIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification,
        readUnifiedFundsLedger,
        storageCache,
        showDocumentsModal:
            typeof scope.showDocumentsModal === 'boolean'
                ? scope.showDocumentsModal
                : modalState.showDocumentsModal,
        setShowDocumentsModal:
            typeof scope.setShowDocumentsModal === 'function'
                ? scope.setShowDocumentsModal
                : modalSetter('showDocumentsModal'),
        showTimelineModal:
            typeof scope.showTimelineModal === 'boolean'
                ? scope.showTimelineModal
                : modalState.showTimelineModal,
        setShowTimelineModal:
            typeof scope.setShowTimelineModal === 'function'
                ? scope.setShowTimelineModal
                : modalSetter('showTimelineModal'),
        showNotesModal:
            resolveModalOpen(scope.showNotesModal, modalState.showNotesModal),
        setShowNotesModal:
            typeof scope.setShowNotesModal === 'function'
                ? scope.setShowNotesModal
                : modalSetter('showNotesModal'),
        showAppointmentModal:
            resolveModalOpen(scope.showAppointmentModal, modalState.showAppointmentModal),
        setShowAppointmentModal:
            typeof scope.setShowAppointmentModal === 'function'
                ? scope.setShowAppointmentModal
                : modalSetter('showAppointmentModal'),
        showDecisionsModal:
            typeof scope.showDecisionsModal === 'boolean'
                ? scope.showDecisionsModal
                : modalState.showDecisionsModal,
        setShowDecisionsModal:
            typeof scope.setShowDecisionsModal === 'function'
                ? scope.setShowDecisionsModal
                : modalSetter('showDecisionsModal'),
        showSeizedAssetsModal:
            typeof scope.showSeizedAssetsModal === 'boolean'
                ? scope.showSeizedAssetsModal
                : modalState.showSeizedAssetsModal,
        setShowSeizedAssetsModal:
            typeof scope.setShowSeizedAssetsModal === 'function'
                ? scope.setShowSeizedAssetsModal
                : modalSetter('showSeizedAssetsModal'),
        showPaymentModal:
            typeof scope.showPaymentModal === 'boolean'
                ? scope.showPaymentModal
                : modalState.showPaymentModal,
        setShowPaymentModal:
            typeof scope.setShowPaymentModal === 'function'
                ? scope.setShowPaymentModal
                : modalSetter('showPaymentModal'),
        showNotificationModal:
            typeof scope.showNotificationModal === 'boolean'
                ? scope.showNotificationModal
                : modalState.showNotificationModal,
        setShowNotificationModal:
            typeof scope.setShowNotificationModal === 'function'
                ? scope.setShowNotificationModal
                : modalSetter('showNotificationModal'),
        showCoerciveModal:
            typeof scope.showCoerciveModal === 'boolean'
                ? scope.showCoerciveModal
                : modalState.showCoerciveModal,
        setShowCoerciveModal:
            typeof scope.setShowCoerciveModal === 'function'
                ? scope.setShowCoerciveModal
                : modalSetter('showCoerciveModal'),
        showPaymentCalculator:
            typeof scope.showPaymentCalculator === 'boolean'
                ? scope.showPaymentCalculator
                : modalState.showPaymentCalculator,
        setShowPaymentCalculator:
            typeof scope.setShowPaymentCalculator === 'function'
                ? scope.setShowPaymentCalculator
                : modalSetter('showPaymentCalculator'),
        showSettlementCalculator:
            typeof scope.showSettlementCalculator === 'boolean'
                ? scope.showSettlementCalculator
                : modalState.showSettlementCalculator,
        setShowSettlementCalculator:
            typeof scope.setShowSettlementCalculator === 'function'
                ? scope.setShowSettlementCalculator
                : modalSetter('showSettlementCalculator'),
        showPauseModal:
            typeof scope.showPauseModal === 'boolean'
                ? scope.showPauseModal
                : modalState.showPauseModal,
        setShowPauseModal:
            typeof scope.setShowPauseModal === 'function'
                ? scope.setShowPauseModal
                : modalSetter('showPauseModal'),
        showUnifiedSummonsModal:
            typeof scope.showUnifiedSummonsModal === 'boolean'
                ? scope.showUnifiedSummonsModal
                : modalState.showUnifiedSummonsModal,
        setShowUnifiedSummonsModal:
            typeof scope.setShowUnifiedSummonsModal === 'function'
                ? scope.setShowUnifiedSummonsModal
                : modalSetter('showUnifiedSummonsModal'),
        showLedgerModal:
            typeof scope.showLedgerModal === 'boolean'
                ? scope.showLedgerModal
                : modalState.showLedgerModal,
        setShowLedgerModal:
            typeof scope.setShowLedgerModal === 'function'
                ? scope.setShowLedgerModal
                : modalSetter('showLedgerModal'),
    };
}

export function ExecutionDashboardShellOverlays({
    showUnifiedExecutionModal = false,
    unifiedModalTab: _unifiedModalTab = null,
    scope: scopeProp,
    followupSnapshot: followupSnapshotProp,
}: ExecutionDashboardShellOverlaysProps) {
    const scopeRef = useExecutionShellOverlayScopeRef();
    const scope = withShellOverlayScopeFallback(
        scopeProp ?? readExecutionShellOverlayScope(scopeRef),
    );
    const props = pickExecutionShellOverlayProps(scope);
    const extraScope = scope as Record<string, unknown>;
    const evictionExpenseModalOpen = Boolean(extraScope.showEvictionExpenseModal);
    const setShowEvictionExpenseModal =
        typeof extraScope.setShowEvictionExpenseModal === 'function'
            ? (extraScope.setShowEvictionExpenseModal as (open: boolean) => void)
            : null;

    const followupSnapshot = useExecutionFollowupModalSnapshot(showUnifiedExecutionModal, () =>
        followupSnapshotProp ? { ...followupSnapshotProp } : buildFollowupModalSnapshotInput(scope),
    );

    useEffect(() => {
        prefetchExecutionFollowupOverlay();
    }, []);

    const merged = {
        ...props,
        executionFollowupModalSnapshot: followupSnapshot,
    };
    const closeDocumentsModal = React.useCallback(() => {
        if (typeof props.setShowDocumentsModal === 'function') {
            props.setShowDocumentsModal(false);
        }
    }, [props]);
    const closeNotesModal = React.useCallback(() => {
        if (typeof props.setShowNotesModal === 'function') {
            props.setShowNotesModal(false);
        }
    }, [props]);
    const closeAppointmentModal = React.useCallback(() => {
        if (typeof props.setShowAppointmentModal === 'function') {
            props.setShowAppointmentModal(false);
        }
    }, [props]);
    const closeDecisionsModal = React.useCallback(() => {
        if (typeof props.setShowDecisionsModal === 'function') {
            props.setShowDecisionsModal(false);
        }
    }, [props]);
    const closeTimelineModal = React.useCallback(() => {
        if (typeof props.setShowTimelineModal === 'function') {
            props.setShowTimelineModal(false);
        }
    }, [props]);
    const closeRealEstateSeizureModal = React.useCallback(() => {
        if (typeof props.setShowRealEstateSeizureModal === 'function') {
            props.setShowRealEstateSeizureModal(false);
        }
        if (typeof props.setRealEstateSeizureModalDecisionId === 'function') {
            props.setRealEstateSeizureModalDecisionId(null);
        }
    }, [props]);
    const closeSeizedAssetsModal = React.useCallback(() => {
        if (typeof props.setShowSeizedAssetsModal === 'function') {
            props.setShowSeizedAssetsModal(false);
        }
    }, [props]);
    const closePaymentModal = React.useCallback(() => {
        if (typeof props.setShowPaymentModal === 'function') {
            props.setShowPaymentModal(false);
        }
    }, [props]);
    const closeNotificationModal = React.useCallback(() => {
        if (typeof props.setShowNotificationModal === 'function') {
            props.setShowNotificationModal(false);
        }
    }, [props]);
    const closeCoerciveModal = React.useCallback(() => {
        if (typeof props.setShowCoerciveModal === 'function') {
            props.setShowCoerciveModal(false);
        }
    }, [props]);
    const closeHeirsNotificationModal = React.useCallback(() => {
        if (typeof props.setShowHeirsNotificationModal === 'function') {
            props.setShowHeirsNotificationModal(false);
        }
    }, [props]);
    const closeGuarantorDetailsModal = React.useCallback(() => {
        if (typeof props.setShowGuarantorDetailsModal === 'function') {
            props.setShowGuarantorDetailsModal(false);
        }
        if (typeof props.setGuarantorDetailsDecisionId === 'function') {
            props.setGuarantorDetailsDecisionId(null);
        }
    }, [props]);
    const closeStayOfExecutionModal = React.useCallback(() => {
        if (typeof props.setShowStayOfExecutionModal === 'function') {
            props.setShowStayOfExecutionModal(false);
        }
    }, [props]);
    const closePartyDeathModal = React.useCallback(() => {
        if (typeof props.setPartyDeathModalParty === 'function') {
            props.setPartyDeathModalParty(null);
        }
        if (typeof props.setPartyDeathModalDecisionId === 'function') {
            props.setPartyDeathModalDecisionId(null);
        }
    }, [props]);
    const closePauseModal = React.useCallback(() => {
        if (typeof props.setShowPauseModal === 'function') {
            props.setShowPauseModal(false);
        }
    }, [props]);
    const closePaymentCalculator = React.useCallback(() => {
        if (typeof props.setShowPaymentCalculator === 'function') {
            props.setShowPaymentCalculator(false);
        }
    }, [props]);
    const closeSettlementCalculator = React.useCallback(() => {
        if (typeof props.setShowSettlementCalculator === 'function') {
            props.setShowSettlementCalculator(false);
        }
    }, [props]);
    const closeLedgerModal = React.useCallback(() => {
        if (typeof props.setShowLedgerModal === 'function') {
            props.setShowLedgerModal(false);
        }
    }, [props]);
    const closeUnifiedSummonsModal = React.useCallback(() => {
        if (typeof props.setSummonsHubInitialMainTab === 'function') {
            props.setSummonsHubInitialMainTab(null);
        }
        if (typeof props.setSummonsContextDebtorKey === 'function') {
            props.setSummonsContextDebtorKey(null);
        }
        if (typeof props.setShowUnifiedSummonsModal === 'function') {
            props.setShowUnifiedSummonsModal(false);
        }
    }, [props]);
    const closeSolidaryCoerciveTargetModal = React.useCallback(() => {
        if (typeof props.setShowSolidaryCoerciveTargetModal === 'function') {
            props.setShowSolidaryCoerciveTargetModal(false);
        }
        if (typeof props.setSolidaryCoerciveActionPending === 'function') {
            props.setSolidaryCoerciveActionPending(null);
        }
    }, [props]);
    const closeEvictionExpenseModal = React.useCallback(() => {
        if (typeof setShowEvictionExpenseModal === 'function') {
            setShowEvictionExpenseModal(false);
        }
    }, [setShowEvictionExpenseModal]);
    const closeEvictionLawyerFeeModal = React.useCallback(() => {
        if (typeof props.setShowEvictionLawyerFeeModal === 'function') {
            props.setShowEvictionLawyerFeeModal(false);
        }
    }, [props]);
    const closeEvictionResidentialGraceModal = React.useCallback(() => {
        if (typeof props.setShowEvictionResidentialGraceModal === 'function') {
            props.setShowEvictionResidentialGraceModal(false);
        }
    }, [props]);
    const closeAlimonyBeneficiaryDeathModal = React.useCallback(() => {
        if (typeof props.setAlimonyBeneficiaryDeathModalOpen === 'function') {
            props.setAlimonyBeneficiaryDeathModalOpen(false);
        }
        if (typeof props.setAlimonyBeneficiaryDeathModalProfile === 'function') {
            props.setAlimonyBeneficiaryDeathModalProfile(null);
        }
    }, [props]);
    const closeTransferFileNumberChangeModal = React.useCallback(() => {
        if (typeof props.setShowTransferFileNumberChangeModal === 'function') {
            props.setShowTransferFileNumberChangeModal(false);
        }
    }, [props]);
    const closeLinkedDossierTimeline = React.useCallback(() => {
        if (typeof props.setShowLinkedDossierTimeline === 'function') {
            props.setShowLinkedDossierTimeline(false);
        }
        if (typeof props.setLinkedDossierToView === 'function') {
            props.setLinkedDossierToView(null);
        }
    }, [props]);
    const closeExecutionTrashModal = React.useCallback(() => {
        if (typeof props.setShowExecutionTrashModal === 'function') {
            props.setShowExecutionTrashModal(false);
        }
    }, [props]);
    const closeTimelineEditModal = React.useCallback(() => {
        if (typeof props.setTimelineEditDraft === 'function') {
            props.setTimelineEditDraft(null);
        }
    }, [props]);
    const closeEditDossierMetaModal = React.useCallback(() => {
        if (typeof props.setShowEditDossierMetaModal === 'function') {
            props.setShowEditDossierMetaModal(false);
        }
    }, [props]);
    const closeEditPartyModal = React.useCallback(() => {
        if (typeof props.setEditPartyTarget === 'function') {
            props.setEditPartyTarget(null);
        }
        if (typeof props.setPartyEditDraft === 'function') {
            props.setPartyEditDraft(null);
        }
    }, [props]);
    const closeHeirsQuickViewModal = React.useCallback(() => {
        if (typeof props.setHeirsQuickView === 'function') {
            props.setHeirsQuickView(null);
        }
    }, [props]);
    const closePermanentDeleteTimelineConfirm = React.useCallback(() => {
        if (typeof props.setPermanentDeleteTimelineId === 'function') {
            props.setPermanentDeleteTimelineId(null);
        }
    }, [props]);

    const showAnySeizedPropertyPortal = Boolean(
        scope.seizedPropertyStepModalOpen ||
            scope.seizedPropertyAuctionResultModalOpen ||
            scope.seizureMarkModalOpen ||
            scope.publicationModalOpen,
    );

    const showAnyOverlay = Boolean(
        showUnifiedExecutionModal ||
            props.showExecutionTrashModal ||
            props.timelineEditDraft ||
            props.showEditDossierMetaModal ||
            props.editPartyTarget ||
            props.heirsQuickView ||
            props.permanentDeleteTimelineId ||
            props.showNotesModal ||
            props.showAppointmentModal ||
            props.executorScheduleModalOpen ||
            props.policeAssistanceModalOpen ||
            props.breakInventoryFurnitureModalOpen ||
            props.judicialCustodianModalOpen ||
            props.executionReportPrompt ||
            props.showDocumentsModal ||
            props.showRealEstateSeizureModal ||
            props.showDecisionsModal ||
            props.showSeizedAssetsModal ||
            props.showPaymentModal ||
            props.showTimelineModal ||
            props.showNotificationModal ||
            props.showCoerciveModal ||
            props.showHeirsNotificationModal ||
            props.showGuarantorDetailsModal ||
            props.showStayOfExecutionModal ||
            props.partyDeathModalParty ||
            props.showPauseModal ||
            props.alimonyBeneficiaryDeathModalOpen ||
            props.showUnifiedSummonsModal ||
            props.showPaymentCalculator ||
            props.showSettlementCalculator ||
            props.showLedgerModal ||
            props.showTransferFileNumberChangeModal ||
            (props.showLinkedDossierTimeline && props.linkedDossierToView) ||
            props.showSolidaryCoerciveTargetModal ||
            evictionExpenseModalOpen ||
            props.showEvictionLawyerFeeModal ||
            props.showEvictionResidentialGraceModal ||
            showAnySeizedPropertyPortal,
    );

    if (!showAnyOverlay) {
        return null;
    }

    return (
        <>
            <ExecutionDashboardEditOverlays
                {...(merged as ExecutionDashboardEditOverlaysProps)}
                onCloseExecutionTrashModal={closeExecutionTrashModal}
                onCloseTimelineEditModal={closeTimelineEditModal}
                onCloseEditDossierMetaModal={closeEditDossierMetaModal}
                onCloseEditPartyModal={closeEditPartyModal}
                onCloseHeirsQuickViewModal={closeHeirsQuickViewModal}
                onClosePermanentDeleteTimelineConfirm={closePermanentDeleteTimelineConfirm}
            />
            <ExecutionDashboardNotesOverlays
                {...(merged as unknown as ExecutionDashboardNotesOverlaysProps)}
                onCloseNotesModal={closeNotesModal}
                onCloseAppointmentModal={closeAppointmentModal}
            />
            <ExecutionDashboardExecutorWorkflowOverlays
                {...(merged as unknown as ExecutionDashboardExecutorWorkflowOverlaysProps)}
                onCloseDecisionsModal={closeDecisionsModal}
            />
            <ExecutionDashboardHeavyModals
                {...merged}
                onCloseDocumentsModal={closeDocumentsModal}
                onCloseRealEstateSeizureModal={closeRealEstateSeizureModal}
                onCloseDecisionsModal={closeDecisionsModal}
                onCloseTimelineModal={closeTimelineModal}
                onCloseSeizedAssetsModal={closeSeizedAssetsModal}
                onClosePaymentModal={closePaymentModal}
                onCloseNotificationModal={closeNotificationModal}
                onCloseCoerciveModal={closeCoerciveModal}
                onCloseHeirsNotificationModal={closeHeirsNotificationModal}
                onCloseGuarantorDetailsModal={closeGuarantorDetailsModal}
                onCloseStayOfExecutionModal={closeStayOfExecutionModal}
                onClosePartyDeathModal={closePartyDeathModal}
                onClosePauseModal={closePauseModal}
                onClosePaymentCalculator={closePaymentCalculator}
                onCloseSettlementCalculator={closeSettlementCalculator}
                onCloseLedgerModal={closeLedgerModal}
                onCloseUnifiedSummonsModal={closeUnifiedSummonsModal}
                onCloseAlimonyBeneficiaryDeathModal={closeAlimonyBeneficiaryDeathModal}
                onCloseTransferFileNumberChangeModal={closeTransferFileNumberChangeModal}
                onCloseLinkedDossierTimeline={closeLinkedDossierTimeline}
            />
            <ExecutionFollowupModalHost
                open={showUnifiedExecutionModal}
                snapshot={followupSnapshot}
            />
            <ExecutionDashboardSolidaryEvictionOverlays
                {...(merged as unknown as ExecutionDashboardSolidaryEvictionOverlaysProps)}
                onCloseSolidaryCoerciveTargetModal={closeSolidaryCoerciveTargetModal}
                onCloseEvictionExpenseModal={closeEvictionExpenseModal}
                onCloseEvictionLawyerFeeModal={closeEvictionLawyerFeeModal}
                onCloseEvictionResidentialGraceModal={closeEvictionResidentialGraceModal}
            />
            {showAnySeizedPropertyPortal ? (
                <ExecutionDashboardSeizedPropertyPortals
                    {...(pickSeizedPropertyPortalProps(
                        scope,
                    ) as unknown as ExecutionDashboardSeizedPropertyPortalsProps)}
                />
            ) : null}
        </>
    );
}
