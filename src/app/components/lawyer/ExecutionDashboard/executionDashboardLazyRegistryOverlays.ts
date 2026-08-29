/**
 * Lazy registry — overlay / modal containers (not first-paint shell).
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

import type { ExecutionNotesAndAppointmentModalsProps } from './components/ExecutionNotesAndAppointmentModals.types';
import type { ExecutionFullTimelineModalContainerProps } from './components/ExecutionFullTimelineModalContainer';
import type { ExecutionSeizedAssetsModalContainerProps } from './components/ExecutionSeizedAssetsModalContainer';

export {
    LazyFinancialOperationsCenter,
    prefetchFinancialOperationsCenter,
} from './executionFinancialOperationsCenterLazy';
export {
    LazyExecutionFinancialHubPortal,
    prefetchExecutionFinancialHubPortal,
} from './executionFinancialHubPortalLazy';
export { LazyLawReferencePanel, prefetchLawReferencePanel } from './executionLawReferenceLazy';
export { LazyJudicialCustodianCardMenu } from './executionJudicialCustodianMenuLazy';
export const LazyEvictionFieldProceduresPanel = createPreloadableLazyComponent(() =>
    import('../execution/EvictionFieldProceduresPanel').then((m) => ({
        default: m.EvictionFieldProceduresPanel,
    }))
);

export function prefetchEvictionFieldProceduresPanel(): void {
    void LazyEvictionFieldProceduresPanel.preload();
}
export const LazyOtherPartyActionsLog = createPreloadableLazyComponent(() =>
    import('../execution/OtherPartyActionsLog').then((m) => ({
        default: m.OtherPartyActionsLog,
    }))
);

export const LazyDocumentVault = createPreloadableLazyComponent(() =>
    import('../DocumentVault').then((m) => ({ default: m.DocumentVault })),
);

export function prefetchExecutionDocumentVault(): void {
    void LazyDocumentVault.preload();
}
const decisionsHubImport = () =>
    import('../DecisionsHub').then((m) => ({ default: m.DecisionsHub }));

export const LazyDecisionsAndAppealsEngine = createPreloadableLazyComponent(decisionsHubImport);

export function prefetchDecisionsAndAppealsEngine(): void {
    void LazyDecisionsAndAppealsEngine.preload();
}
export const LazyModalSeizedAssetsManager = createPreloadableLazyComponent(() =>
    import('../Modal_Seized_Assets_Manager').then((m) => ({ default: m.ModalSeizedAssetsManager }))
);

export const LazyUnifiedSummonsHub = createPreloadableLazyComponent(() =>
    import('../Modal_Unified_Summons_Hub').then((m) => ({ default: m.UnifiedSummonsHub }))
);
export const LazyPaymentCalculator = createPreloadableLazyComponent(() =>
    import('../Modal_Payment_Calculator').then((m) => ({ default: m.PaymentCalculator }))
);
export const LazySettlementCalculator = createPreloadableLazyComponent(() =>
    import('../Modal_Settlement_Calculator').then((m) => ({ default: m.SettlementCalculator }))
);

export const LazyExecutorApprovedDateTimeModal = createPreloadableLazyComponent(() =>
    import('../execution/ExecutorApprovedDateTimeModal').then((m) => ({
        default: m.ExecutorApprovedDateTimeModal,
    }))
);
export const LazyExecutorWorkflowConfirmModal = createPreloadableLazyComponent(() =>
    import('../execution/ExecutorWorkflowConfirmModal').then((m) => ({
        default: m.ExecutorWorkflowConfirmModal,
    }))
);
export const LazyExecutorBreakInventoryFurnitureModal = createPreloadableLazyComponent(() =>
    import('../execution/ExecutorBreakInventoryFurnitureModal').then((m) => ({
        default: m.ExecutorBreakInventoryFurnitureModal,
    }))
);
export const LazyExecutorJudicialCustodianModal = createPreloadableLazyComponent(() =>
    import('../execution/ExecutorJudicialCustodianModal').then((m) => ({
        default: m.ExecutorJudicialCustodianModal,
    }))
);

export {
    LazyPremiumTimelineAuditLog,
    LazySmartTimelineRadar,
    prefetchExecutionTimelineSurface,
} from './executionTimelineSurfaceLazy';

export const LazyPoliceAssistanceDetailsModal = createPreloadableLazyComponent(() =>
    import('../execution/PoliceAssistanceDetailsModal').then((m) => ({
        default: m.PoliceAssistanceDetailsModal,
    }))
);

export const LazyStayOfExecutionModal = createPreloadableLazyComponent(() =>
    import('../execution/StayOfExecutionModal').then((m) => ({
        default: m.StayOfExecutionModal,
    }))
);

export const LazyPartyDeathReportModal = createPreloadableLazyComponent(() =>
    import('../execution/PartyDeathReportModal').then((m) => ({
        default: m.PartyDeathReportModal,
    }))
);

export const LazyRealEstateSeizurePostApprovalModal = createPreloadableLazyComponent(() =>
    import('../execution/RealEstateSeizurePostApprovalModal').then((m) => ({
        default: m.RealEstateSeizurePostApprovalModal,
    }))
);

export const LazyGuarantorDetailsPostApprovalModal = createPreloadableLazyComponent(() =>
    import('../execution/GuarantorDetailsPostApprovalModal').then((m) => ({
        default: m.GuarantorDetailsPostApprovalModal,
    }))
);

export const LazyExecutionFullTimelineModalContainer =
    createPreloadableLazyComponent<ExecutionFullTimelineModalContainerProps>(() =>
        import('./components/ExecutionFullTimelineModalContainer').then((m) => ({
            default: m.ExecutionFullTimelineModalContainer,
        })),
    );

export function prefetchExecutionFullTimelineModalContainer(): void {
    void LazyExecutionFullTimelineModalContainer.preload();
}

export const LazyPartyEditModal = createPreloadableLazyComponent(() =>
    import('./components/PartyEditModal').then((m) => ({ default: m.PartyEditModal })),
);
export const LazyDossierMetaEditSection = createPreloadableLazyComponent(() =>
    import('./components/DossierMetaEditSection').then((m) => ({
        default: m.DossierMetaEditSection,
    })),
);
export const LazyPermanentDeleteConfirmDialog = createPreloadableLazyComponent(() =>
    import('./components/PermanentDeleteConfirmDialog').then((m) => ({
        default: m.PermanentDeleteConfirmDialog,
    }))
);
export const LazyExecutionDecisionsModalContainer = createPreloadableLazyComponent(() =>
    import('./components/ExecutionDecisionsModalContainer').then((m) => ({
        default: m.ExecutionDecisionsModalContainer,
    }))
);

export function prefetchExecutionDecisionsModalContainer(): void {
    void LazyExecutionDecisionsModalContainer.preload();
}

const executionModalsContainerImport = () =>
    import('./components/ExecutionModalsContainer').then((m) => ({ default: m.ExecutionModalsContainer }));
const unifiedSummonsModalImport = () =>
    import('./components/UnifiedSummonsModalContainer').then((m) => ({
        default: m.UnifiedSummonsModalContainer,
    }));
const executionPaymentModalImport = () =>
    import('./components/ExecutionPaymentModalContainer').then((m) => ({
        default: m.ExecutionPaymentModalContainer,
    }));
const executionSeizedAssetsModalImport = () =>
    import('./components/ExecutionSeizedAssetsModalContainer').then((m) => ({
        default: m.ExecutionSeizedAssetsModalContainer,
    }));
const executionDebtorNotificationMemoImport = () =>
    import('./components/ExecutionDebtorNotificationMemoModalContainer').then((m) => ({
        default: m.ExecutionDebtorNotificationMemoModalContainer,
    }));
const executionCoerciveActionsModalImport = () =>
    import('./components/ExecutionCoerciveActionsModalContainer').then((m) => ({
        default: m.ExecutionCoerciveActionsModalContainer,
    }));
const executionSolidaryEvictionModalsImport = () =>
    import('./components/ExecutionSolidaryAndEvictionFollowupModalsContainer').then((m) => ({
        default: m.ExecutionSolidaryAndEvictionFollowupModalsContainer,
    }));
const executionHeirsNotificationModalImport = () =>
    import('./components/ExecutionHeirsNotificationModalContainer').then((m) => ({
        default: m.ExecutionHeirsNotificationModalContainer,
    }));
const executionNotesAppointmentModalsImport = () =>
    import('./components/ExecutionNotesAndAppointmentModals').then((m) => ({
        default: m.ExecutionNotesAndAppointmentModals,
    }));
const executorWorkflowPortalModalsImport = () =>
    import('./components/ExecutorWorkflowPortalModals').then((m) => ({
        default: m.ExecutorWorkflowPortalModals,
    }));
const executionFinancialLedgerPortalImport = () =>
    import('./components/ExecutionFinancialLedgerPortalContainer').then((m) => ({
        default: m.ExecutionFinancialLedgerPortalContainer,
    }));

export const LazyExecutionModalsContainer = createPreloadableLazyComponent(executionModalsContainerImport);
export const LazyUnifiedSummonsModalContainer = createPreloadableLazyComponent(unifiedSummonsModalImport);
export const LazyExecutionPaymentModalContainer = createPreloadableLazyComponent(executionPaymentModalImport);
export const LazyExecutionSeizedAssetsModalContainer =
    createPreloadableLazyComponent<ExecutionSeizedAssetsModalContainerProps>(
        executionSeizedAssetsModalImport,
    );
export function prefetchExecutionSeizedAssetsModalContainer(): void {
    void LazyExecutionSeizedAssetsModalContainer.preload();
}
export const LazyExecutionDebtorNotificationMemoModalContainer = createPreloadableLazyComponent(executionDebtorNotificationMemoImport);
export const LazyExecutionCoerciveActionsModalContainer = createPreloadableLazyComponent(executionCoerciveActionsModalImport);
export const LazyExecutionSolidaryAndEvictionFollowupModalsContainer = createPreloadableLazyComponent(
    executionSolidaryEvictionModalsImport,
);
export const LazyExecutionHeirsNotificationModalContainer = createPreloadableLazyComponent(executionHeirsNotificationModalImport);
export const LazyExecutionNotesAndAppointmentModals =
    createPreloadableLazyComponent<ExecutionNotesAndAppointmentModalsProps>(
        executionNotesAppointmentModalsImport,
    );
export function prefetchExecutionNotesAndAppointmentModals(): void {
    void LazyExecutionNotesAndAppointmentModals.preload();
    void import('./executionNotesInnerLazy')
        .then((m) => m.prefetchExecutionNotesInnerSurfaces())
        .catch(() => undefined);
}
export const LazyExecutorWorkflowPortalModals = createPreloadableLazyComponent(executorWorkflowPortalModalsImport);
export const LazyExecutionFinancialLedgerPortalContainer = createPreloadableLazyComponent(executionFinancialLedgerPortalImport);

export function prefetchExecutionModalContainers(): void {
    void LazyExecutionPaymentModalContainer.preload();
    void LazyExecutionCoerciveActionsModalContainer.preload();
    void LazyExecutionDecisionsModalContainer.preload();
    prefetchDecisionsAndAppealsEngine();
}

const executionTrashModalImport = () =>
    import('./components/ExecutionTrashModal').then((m) => ({ default: m.ExecutionTrashModal }));
const timelineEditModalImport = () =>
    import('./components/TimelineEditModal').then((m) => ({ default: m.TimelineEditModal }));
const executionHeirsQuickViewModalImport = () =>
    import('./components/ExecutionHeirsQuickViewModal').then((m) => ({
        default: m.ExecutionHeirsQuickViewModal,
    }));
const executionTransferFileNumberModalImport = () =>
    import('./components/ExecutionTransferFileNumberModal').then((m) => ({
        default: m.ExecutionTransferFileNumberModal,
    }));
const linkedDossierTimelineModalImport = () =>
    import('./components/LinkedDossierTimelineModal').then((m) => ({
        default: m.LinkedDossierTimelineModal,
    }));
const alimonyBeneficiaryDeathModalImport = () =>
    import('../execution/AlimonyBeneficiaryDeathModal').then((m) => ({
        default: m.AlimonyBeneficiaryDeathModal,
    }));

export const LazyExecutionTrashModal = createPreloadableLazyComponent(executionTrashModalImport);
export const LazyTimelineEditModal = createPreloadableLazyComponent(timelineEditModalImport);
export const LazyExecutionHeirsQuickViewModal = createPreloadableLazyComponent(executionHeirsQuickViewModalImport);
export const LazyExecutionTransferFileNumberModal = createPreloadableLazyComponent(executionTransferFileNumberModalImport);
export { LazyDossierActionsModal } from './executionDashboardDossierActionsModalLazy';
export const LazyLinkedDossierTimelineModal = createPreloadableLazyComponent(linkedDossierTimelineModalImport);
export {
    LazySeizureRequestSubjectModal,
    importSeizureRequestSubjectModal,
} from './executionDashboardSeizureRequestSubjectModalLazy';
export const LazyAlimonyBeneficiaryDeathModal = createPreloadableLazyComponent(alimonyBeneficiaryDeathModalImport);

export function prefetchExecutionOverlayModals(): void {
    void LazyExecutionTrashModal.preload();
    void import('./executionDashboardDossierActionsModalLazy')
        .then((m) => m.LazyDossierActionsModal.preload())
        .catch(() => undefined);
    void LazyTimelineEditModal.preload();
}
