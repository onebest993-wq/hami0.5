/**
 * Lazy registry — بلا استيراد phone body / shell overlays / followup portal (يكسر circular chunks).
 * PartyEdit / DossierMetaEdit: dynamic import حقيقي (لا static) حتى لا يثقل chunk الفتح البارد.
 */
import { lazy } from 'react';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import { prefetchExecutionLawArticlesRemote } from '@/app/utils/executionLawRemoteCache';
import { loadExecutionLawSeedData } from '@/data/executionLawsLoader';

const actionGridSectionImport = () =>
    import('./components/ActionGridSection').then((m) => ({ default: m.ActionGridSection }));
const dashboardHeaderImport = () =>
    import('./components/DashboardHeaderSection').then((m) => ({ default: m.DashboardHeaderSection }));
const partiesSectionImport = () =>
    import('./components/PartiesSection').then((m) => ({ default: m.PartiesSection }));
const debtorsSectionImport = () =>
    import('./components/DebtorsSection').then((m) => ({ default: m.DebtorsSection }));
const timelineSectionImport = () =>
    import('./components/TimelineSection').then((m) => ({ default: m.TimelineSection }));
const dossierLifecyclePanelImport = () =>
    import('./components/DossierLifecyclePanel').then((m) => ({ default: m.DossierLifecyclePanel }));
const dossierSwitcherImport = () =>
    import('./components/DossierSwitcher').then((m) => ({ default: m.DossierSwitcher }));
const unifiedSeizureLogHostImport = () =>
    import('./components/UnifiedSeizureLogHost').then((m) => ({ default: m.UnifiedSeizureLogHost }));
const colleagueConsultationHeaderButtonImport = () =>
    import('@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton').then((m) => ({
        default: m.ColleagueConsultationHeaderButton,
    }));

/**
 * جسم الإضبارة — preload-aware lazy: بعد التسخين تُرسم الأقسام مباشرة في نفس
 * الـ commit بدون دورة تعليق Suspense (كانت تسبب وميض هياكل عند أول فتح بارد).
 */
export const LazyDashboardHeaderSection = createPreloadableLazyComponent(dashboardHeaderImport);
export const LazyPartiesSection = createPreloadableLazyComponent(partiesSectionImport);
export const LazyDebtorsSection = createPreloadableLazyComponent(debtorsSectionImport);
export const LazyActionGridSection = createPreloadableLazyComponent(actionGridSectionImport);
export const LazyTimelineSection = createPreloadableLazyComponent(timelineSectionImport);
export const LazyDossierLifecyclePanel = createPreloadableLazyComponent(dossierLifecyclePanelImport);
export const LazyDossierSwitcher = lazy(dossierSwitcherImport);
export const LazyUnifiedSeizureLogHost = lazy(unifiedSeizureLogHostImport);
export const LazyColleagueConsultationHeaderButton = lazy(colleagueConsultationHeaderButtonImport);

export function prefetchUnifiedSeizureLogHost(): void {
    void unifiedSeizureLogHostImport().catch(() => {});
}

/** سطح الإضبارة العميق (سويتشر/استشارة/موضوع الحجز) — يسخَّن idle حتى يصبح الفتح البارد بلا شبكة */
export function prefetchExecutionDossierDeepSurface(): void {
    void dossierSwitcherImport().catch(() => {});
    void colleagueConsultationHeaderButtonImport().catch(() => {});
    void seizureRequestSubjectModalImport().catch(() => {});
}

export function prefetchExecutionDashboardShell(): void {
    // preload (لا import خام) — يثبّت المكوّن للرسم المباشر بلا تعليق Suspense
    void LazyDashboardHeaderSection.preload();
    void LazyPartiesSection.preload();
    void LazyDebtorsSection.preload();
    // أول paint للإضبارة يشمل أيضاً شبكة الإجراءات والسجل الزمني ولوحة دورة الحياة —
    // تركها خارج التسخين كان يسبب pop-in محسوس عند أول فتح بارد فقط.
    void LazyActionGridSection.preload();
    void LazyTimelineSection.preload();
    void LazyDossierLifecyclePanel.preload();
}

const personalCoerciveFollowupPanelImport = () =>
    import('../execution/PersonalCoerciveFollowupPanel').then((m) => ({
        default: m.PersonalCoerciveFollowupPanel,
    }));

export const LazyPersonalCoerciveFollowupPanel = createPreloadableLazyComponent(
    personalCoerciveFollowupPanelImport,
);

const employeeAssignmentCoerciveImport = () =>
    import('@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock').then((m) => ({
        default: m.EmployeeAssignmentCoerciveFollowupBlock,
    }));

export const LazyEmployeeAssignmentCoerciveFollowupBlock = createPreloadableLazyComponent(
    employeeAssignmentCoerciveImport,
);

/** تحميل مسبق لمحضر المتابعة — preload يثبّت المكوّنين للرسم المباشر بلا تعليق */
export function prefetchFollowupMemoPanels(): void {
    void LazyPersonalCoerciveFollowupPanel.preload();
    void LazyEmployeeAssignmentCoerciveFollowupBlock.preload();
}

export const LazyJudicialCustodianCardMenu = lazy(() =>
    import('../execution/JudicialCustodianCardMenu').then((m) => ({
        default: m.JudicialCustodianCardMenu,
    }))
);
export const LazyEvictionFieldProceduresPanel = lazy(() =>
    import('../execution/EvictionFieldProceduresPanel').then((m) => ({
        default: m.EvictionFieldProceduresPanel,
    }))
);
export const LazyOtherPartyActionsLog = createPreloadableLazyComponent(() =>
    import('../execution/OtherPartyActionsLog').then((m) => ({
        default: m.OtherPartyActionsLog,
    }))
);

export function prefetchOtherPartyActionsLog(): void {
    void LazyOtherPartyActionsLog.preload();
}

export const LazyDocumentVault = lazy(() =>
    import('../DocumentVault').then((m) => ({ default: m.DocumentVault }))
);
const decisionsHubImport = () =>
    import('../DecisionsHub').then((m) => ({ default: m.DecisionsHub }));

/** preload-aware — بعد التسخين يُرسم المحرك مباشرة بلا «جاري التحميل…» */
export const LazyDecisionsAndAppealsEngine = createPreloadableLazyComponent(decisionsHubImport);

export function prefetchDecisionsAndAppealsEngine(): void {
    void LazyDecisionsAndAppealsEngine.preload();
}
export const LazyModalSeizedAssetsManager = lazy(() =>
    import('../Modal_Seized_Assets_Manager').then((m) => ({ default: m.ModalSeizedAssetsManager }))
);
const financialOperationsCenterImport = () =>
    import('../FinancialOperationsCenter').then((m) => ({ default: m.FinancialOperationsCenter }));

export const LazyFinancialOperationsCenter = createPreloadableLazyComponent(financialOperationsCenterImport);

/** تحميل مسبق عند ظهور شبكة الأدوات — يقلّل انتظار أول فتح للمركز المالي */
export function prefetchFinancialOperationsCenter(): void {
    void LazyFinancialOperationsCenter.preload();
}
export const LazyUnifiedSummonsHub = lazy(() =>
    import('../Modal_Unified_Summons_Hub').then((m) => ({ default: m.UnifiedSummonsHub }))
);
export const LazyPaymentCalculator = lazy(() =>
    import('../Modal_Payment_Calculator').then((m) => ({ default: m.PaymentCalculator }))
);
export const LazySettlementCalculator = lazy(() =>
    import('../Modal_Settlement_Calculator').then((m) => ({ default: m.SettlementCalculator }))
);

export const LazyExecutorApprovedDateTimeModal = lazy(() =>
    import('../execution/ExecutorApprovedDateTimeModal').then((m) => ({
        default: m.ExecutorApprovedDateTimeModal,
    }))
);
export const LazyExecutorWorkflowConfirmModal = lazy(() =>
    import('../execution/ExecutorWorkflowConfirmModal').then((m) => ({
        default: m.ExecutorWorkflowConfirmModal,
    }))
);
export const LazyExecutorBreakInventoryFurnitureModal = lazy(() =>
    import('../execution/ExecutorBreakInventoryFurnitureModal').then((m) => ({
        default: m.ExecutorBreakInventoryFurnitureModal,
    }))
);
export const LazyExecutorJudicialCustodianModal = lazy(() =>
    import('../execution/ExecutorJudicialCustodianModal').then((m) => ({
        default: m.ExecutorJudicialCustodianModal,
    }))
);

export const LazyPremiumTimelineAuditLog = lazy(() =>
    import('../PremiumTimelineAuditLog').then((m) => ({
        default: m.PremiumTimelineAuditLog,
    }))
);

export const LazySmartTimelineRadar = lazy(() =>
    import('../SmartTimelineRadar').then((m) => ({
        default: m.SmartTimelineRadar,
    }))
);

export const LazyPoliceAssistanceDetailsModal = lazy(() =>
    import('../execution/PoliceAssistanceDetailsModal').then((m) => ({
        default: m.PoliceAssistanceDetailsModal,
    }))
);

export const LazyStayOfExecutionModal = lazy(() =>
    import('../execution/StayOfExecutionModal').then((m) => ({
        default: m.StayOfExecutionModal,
    }))
);

export const LazyPartyDeathReportModal = lazy(() =>
    import('../execution/PartyDeathReportModal').then((m) => ({
        default: m.PartyDeathReportModal,
    }))
);

export const LazyRealEstateSeizurePostApprovalModal = lazy(() =>
    import('../execution/RealEstateSeizurePostApprovalModal').then((m) => ({
        default: m.RealEstateSeizurePostApprovalModal,
    }))
);

export const LazyGuarantorDetailsPostApprovalModal = lazy(() =>
    import('../execution/GuarantorDetailsPostApprovalModal').then((m) => ({
        default: m.GuarantorDetailsPostApprovalModal,
    }))
);

export const LazyVisitationScheduleModule = lazy(() =>
    import('./components/VisitationScheduleModule').then((m) => ({
        default: m.VisitationScheduleModule,
    }))
);

export const LazyCustodyRemovalWardsModule = lazy(() =>
    import('./components/CustodyRemovalWardsModule').then((m) => ({
        default: m.CustodyRemovalWardsModule,
    }))
);

export const LazyMaritalFurnitureModule = lazy(() =>
    import('./components/MaritalFurnitureModule').then((m) => ({
        default: m.MaritalFurnitureModule,
    }))
);

export const LazyExecutionFullTimelineModalContainer = lazy(() =>
    import('./components/ExecutionFullTimelineModalContainer').then((m) => ({
        default: m.ExecutionFullTimelineModalContainer,
    }))
);

/**
 * تبويبات محضر المتابعة — preload-aware: بعد التسخين يُرسم التبويب مباشرة
 * في نفس commit التبديل بلا تعليق Suspense (كان أول دخول لكل تبويب يومض هيكلاً).
 */
export const LazyPersonalTab = createPreloadableLazyComponent(() =>
    import('./components/PersonalTab').then((m) => ({ default: m.PersonalTab }))
);
export const LazyCoerciveTab = createPreloadableLazyComponent(() =>
    import('./components/CoerciveTab').then((m) => ({ default: m.CoerciveTab }))
);
export const LazyFinancialTab = createPreloadableLazyComponent(() =>
    import('./components/FinancialTab').then((m) => ({ default: m.FinancialTab }))
);
export const LazyOtherPartyTab = createPreloadableLazyComponent(() =>
    import('./components/OtherPartyTab').then((m) => ({ default: m.OtherPartyTab }))
);
export const LazySeizureRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/SeizureRequestsTab').then((m) => ({ default: m.SeizureRequestsTab }))
);
export const LazyCommunicationsTab = createPreloadableLazyComponent(() =>
    import('./components/CommunicationsTab').then((m) => ({ default: m.CommunicationsTab }))
);
export const LazyRequestsTab = createPreloadableLazyComponent(() =>
    import('./components/RequestsTab').then((m) => ({ default: m.RequestsTab }))
);
export const LazyDossierControlsTab = createPreloadableLazyComponent(() =>
    import('./components/DossierControlsTab').then((m) => ({ default: m.DossierControlsTab }))
);
export const LazyPartyEditModal = lazy(() =>
    import('./components/PartyEditModal').then((m) => ({ default: m.PartyEditModal })),
);
export const LazyDossierMetaEditSection = lazy(() =>
    import('./components/DossierMetaEditSection').then((m) => ({
        default: m.DossierMetaEditSection,
    })),
);
export const LazyPermanentDeleteConfirmDialog = lazy(() =>
    import('./components/PermanentDeleteConfirmDialog').then((m) => ({
        default: m.PermanentDeleteConfirmDialog,
    }))
);
/** preload-aware — الحاوية كانت باردة كلياً (خارج كل موجات التسخين) */
export const LazyExecutionDecisionsModalContainer = createPreloadableLazyComponent(() =>
    import('./components/ExecutionDecisionsModalContainer').then((m) => ({
        default: m.ExecutionDecisionsModalContainer,
    }))
);

export function prefetchExecutionDecisionsModalContainer(): void {
    void LazyExecutionDecisionsModalContainer.preload();
}
const lawReferencePanelImport = () =>
    import('./components/LawReferencePanel').then((m) => ({ default: m.LawReferencePanel }));

export const LazyLawReferencePanel = lazy(lawReferencePanelImport);

export function prefetchLawReferencePanel(): void {
    prefetchExecutionLawArticlesRemote();
    void loadExecutionLawSeedData().catch(() => undefined);
    void lawReferencePanelImport().catch(() => undefined);
}
export const LazyVisitationCalendarModal = lazy(() =>
    import('./components/VisitationCalendarModal').then((m) => ({ default: m.VisitationCalendarModal }))
);
const executionFinancialHubPortalImport = () =>
    import('./components/ExecutionFinancialHubPortal').then((m) => ({
        default: m.ExecutionFinancialHubPortal,
    }));

export const LazyExecutionFinancialHubPortal = createPreloadableLazyComponent(executionFinancialHubPortalImport);

export function prefetchExecutionFinancialHubPortal(): void {
    void LazyExecutionFinancialHubPortal.preload();
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

export const LazyExecutionModalsContainer = lazy(executionModalsContainerImport);
export const LazyUnifiedSummonsModalContainer = lazy(unifiedSummonsModalImport);
export const LazyExecutionPaymentModalContainer = lazy(executionPaymentModalImport);
export const LazyExecutionSeizedAssetsModalContainer = lazy(executionSeizedAssetsModalImport);
export const LazyExecutionDebtorNotificationMemoModalContainer = lazy(executionDebtorNotificationMemoImport);
export const LazyExecutionCoerciveActionsModalContainer = lazy(executionCoerciveActionsModalImport);
export const LazyExecutionSolidaryAndEvictionFollowupModalsContainer = lazy(
    executionSolidaryEvictionModalsImport,
);
export const LazyExecutionHeirsNotificationModalContainer = lazy(executionHeirsNotificationModalImport);
export const LazyExecutionNotesAndAppointmentModals = lazy(executionNotesAppointmentModalsImport);
export const LazyExecutorWorkflowPortalModals = lazy(executorWorkflowPortalModalsImport);
export const LazyExecutionFinancialLedgerPortalContainer = lazy(executionFinancialLedgerPortalImport);

export function prefetchExecutionModalContainers(): void {
    void executionPaymentModalImport().catch(() => undefined);
    void executionCoerciveActionsModalImport().catch(() => undefined);
    // القرارات والطعون — حاوية + محرك: كانا خارج كل موجات التسخين رغم أنه
    // من أكثر الأقسام استخداماً؛ أول فتح كان يُظهر «جاري التحميل…».
    void LazyExecutionDecisionsModalContainer.preload();
    prefetchDecisionsAndAppealsEngine();
}

/** تحميل مسبق لتبويبات محضر المتابعة — يُصدَّر من executionFollowupTabPrefetch (تبويب واحد) */
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
const dossierActionsModalImport = () =>
    import('./components/DossierActionsModal').then((m) => ({ default: m.DossierActionsModal }));
const linkedDossierTimelineModalImport = () =>
    import('./components/LinkedDossierTimelineModal').then((m) => ({
        default: m.LinkedDossierTimelineModal,
    }));
const seizureRequestSubjectModalImport = () =>
    import('./components/SeizureRequestSubjectModal').then((m) => ({
        default: m.SeizureRequestSubjectModal,
    }));
const alimonyBeneficiaryDeathModalImport = () =>
    import('../execution/AlimonyBeneficiaryDeathModal').then((m) => ({
        default: m.AlimonyBeneficiaryDeathModal,
    }));

export const LazyExecutionTrashModal = lazy(executionTrashModalImport);
export const LazyTimelineEditModal = lazy(timelineEditModalImport);
export const LazyExecutionHeirsQuickViewModal = lazy(executionHeirsQuickViewModalImport);
export const LazyExecutionTransferFileNumberModal = lazy(executionTransferFileNumberModalImport);
export const LazyDossierActionsModal = lazy(dossierActionsModalImport);
export const LazyLinkedDossierTimelineModal = lazy(linkedDossierTimelineModalImport);
export const LazySeizureRequestSubjectModal = lazy(seizureRequestSubjectModalImport);
export const LazyAlimonyBeneficiaryDeathModal = lazy(alimonyBeneficiaryDeathModalImport);

export function prefetchExecutionTrashOverlay(): void {
    void executionTrashModalImport().catch(() => undefined);
}

export function prefetchStayOfExecutionModal(): void {
    void import('../execution/StayOfExecutionModal').catch(() => undefined);
}

/** تحميل مسبق للنوافذ الأكثر استخداماً بعد فتح الإضبارة */
export function prefetchExecutionOverlayModals(): void {
    void executionTrashModalImport().catch(() => undefined);
    void dossierActionsModalImport().catch(() => undefined);
    void timelineEditModalImport().catch(() => undefined);
}
