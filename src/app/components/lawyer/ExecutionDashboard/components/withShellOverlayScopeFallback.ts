/** Scope fallback wiring for shell overlays — extracted for line budget. */
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { History } from '@/app/components/ui/icons/History';
import { Pause } from '@/app/components/ui/icons/Pause';
import { Play } from '@/app/components/ui/icons/Play';
import { EXEC_MODAL_Z, EXEC_MODAL_BACKDROP_STRONG } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    LazyExecutorApprovedDateTimeModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    LazyPoliceAssistanceDetailsModal,
} from '../executionDashboardLazyRegistryOverlays';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { getLocalTodayYmd } from '../executionDashboardDate';
import { buildDebtorNoticePatchForKey } from '@/app/utils/noticeDebtorScope';
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
import { useExecutionDashboardStore as executionDashboardStoreApi } from '@/app/stores/executionDashboardStore';

export function withShellOverlayScopeFallback(scope: Record<string, unknown>): Record<string, unknown> {
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
        EXEC_OVERLAY_LAZY_FALLBACK: EXEC_OVERLAY_INNER_SILENT_FALLBACK,
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
