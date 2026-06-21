/**
 * Lazy boundaries + small presentational helpers extracted from ExecutionDashboard.tsx
 * (same markup/classes — no visual change; easier maintenance and future splits).
 */
import React, { lazy } from 'react';
import { ChevronDown } from 'lucide-react';

const personalCoerciveFollowupPanelImport = () =>
    import('../execution/PersonalCoerciveFollowupPanel').then((m) => ({
        default: m.PersonalCoerciveFollowupPanel,
    }));

export const LazyPersonalCoerciveFollowupPanel = lazy(personalCoerciveFollowupPanelImport);

const employeeAssignmentCoerciveImport = () =>
    import('../execution/EmployeeAssignmentCoerciveFollowupBlock').then((m) => ({
        default: m.EmployeeAssignmentCoerciveFollowupBlock,
    }));

export const LazyEmployeeAssignmentCoerciveFollowupBlock = lazy(employeeAssignmentCoerciveImport);

/** تحميل مسبق لمحضر المتابعة — يقلّل انتظار أول فتح */
export function prefetchFollowupMemoPanels(): void {
    void personalCoerciveFollowupPanelImport().catch(() => {});
    void employeeAssignmentCoerciveImport().catch(() => {});
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
export const LazyOtherPartyActionsLog = lazy(() =>
    import('../execution/OtherPartyActionsLog').then((m) => ({
        default: m.OtherPartyActionsLog,
    }))
);

export const LazyDocumentVault = lazy(() =>
    import('../DocumentVault').then((m) => ({ default: m.DocumentVault }))
);
const decisionsHubImport = () =>
    import('../DecisionsHub').then((m) => ({ default: m.DecisionsHub }));

export const LazyDecisionsAndAppealsEngine = lazy(decisionsHubImport);
export const LazyDecisionsHub = LazyDecisionsAndAppealsEngine;

/** تحميل مسبق عند ظهور شبكة الأدوات — يقلّل انتظار أول فتح للقرارات والطعون */
export function prefetchDecisionsAndAppealsEngine(): void {
    void decisionsHubImport().catch(() => {});
}
export const LazyModalSeizedAssetsManager = lazy(() =>
    import('../Modal_Seized_Assets_Manager').then((m) => ({ default: m.ModalSeizedAssetsManager }))
);
const financialOperationsCenterImport = () =>
    import('../FinancialOperationsCenter').then((m) => ({ default: m.FinancialOperationsCenter }));

export const LazyFinancialOperationsCenter = lazy(financialOperationsCenterImport);

/** تحميل مسبق عند ظهور شبكة الأدوات — يقلّل انتظار أول فتح للمركز المالي */
export function prefetchFinancialOperationsCenter(): void {
    void financialOperationsCenterImport().catch(() => {});
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

export const LazyActionGridSection = lazy(() =>
    import('./components/ActionGridSection').then((m) => ({ default: m.ActionGridSection }))
);

export const LazyTimelineSection = lazy(() =>
    import('./components/TimelineSection').then((m) => ({ default: m.TimelineSection }))
);

export const LazyVisitationScheduleModule = lazy(() =>
    import('./components/VisitationScheduleModule').then((m) => ({
        default: m.VisitationScheduleModule,
    }))
);

export const LazyMaritalFurnitureModule = lazy(() =>
    import('./components/MaritalFurnitureModule').then((m) => ({
        default: m.MaritalFurnitureModule,
    }))
);

export const LazyExecutionDecisionsModalContainer = lazy(() =>
    import('./components/ExecutionDecisionsModalContainer').then((m) => ({
        default: m.ExecutionDecisionsModalContainer,
    }))
);

export const LazyExecutionFullTimelineModalContainer = lazy(() =>
    import('./components/ExecutionFullTimelineModalContainer').then((m) => ({
        default: m.ExecutionFullTimelineModalContainer,
    }))
);

export const EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode = null;
export const EXEC_FOC_LAZY_FALLBACK: React.ReactNode = null;
export const EXEC_SECTION_LAZY_FALLBACK: React.ReactNode = (
    <div className="mx-1 my-3 h-28 animate-pulse rounded-2xl bg-white/[0.04]" aria-hidden />
);

const dashboardHeaderImport = () =>
    import('./components/DashboardHeaderSection').then((m) => ({ default: m.DashboardHeaderSection }));
const partiesSectionImport = () =>
    import('./components/PartiesSection').then((m) => ({ default: m.PartiesSection }));
const debtorsSectionImport = () =>
    import('./components/DebtorsSection').then((m) => ({ default: m.DebtorsSection }));

export const LazyDashboardHeaderSection = lazy(dashboardHeaderImport);
export const LazyPartiesSection = lazy(partiesSectionImport);
export const LazyDebtorsSection = lazy(debtorsSectionImport);

export const LazyPersonalTab = lazy(() =>
    import('./components/PersonalTab').then((m) => ({ default: m.PersonalTab }))
);
export const LazyCoerciveTab = lazy(() =>
    import('./components/CoerciveTab').then((m) => ({ default: m.CoerciveTab }))
);
export const LazyFinancialTab = lazy(() =>
    import('./components/FinancialTab').then((m) => ({ default: m.FinancialTab }))
);
export const LazyOtherPartyTab = lazy(() =>
    import('./components/OtherPartyTab').then((m) => ({ default: m.OtherPartyTab }))
);
export const LazySeizureRequestsTab = lazy(() =>
    import('./components/SeizureRequestsTab').then((m) => ({ default: m.SeizureRequestsTab }))
);
export const LazyCommunicationsTab = lazy(() =>
    import('./components/CommunicationsTab').then((m) => ({ default: m.CommunicationsTab }))
);
export const LazyRequestsTab = lazy(() =>
    import('./components/RequestsTab').then((m) => ({ default: m.RequestsTab }))
);
export const LazyDossierControlsTab = lazy(() =>
    import('./components/DossierControlsTab').then((m) => ({ default: m.DossierControlsTab }))
);

export const LazyPartyEditModal = lazy(() =>
    import('./components/PartyEditModal').then((m) => ({ default: m.PartyEditModal }))
);
export const LazyDossierMetaEditSection = lazy(() =>
    import('./components/DossierMetaEditSection').then((m) => ({ default: m.DossierMetaEditSection }))
);
export const LazyPermanentDeleteConfirmDialog = lazy(() =>
    import('./components/PermanentDeleteConfirmDialog').then((m) => ({
        default: m.PermanentDeleteConfirmDialog,
    }))
);
export const LazyLawReferencePanel = lazy(() =>
    import('./components/LawReferencePanel').then((m) => ({ default: m.LawReferencePanel }))
);
export const LazyDossierLifecyclePanel = lazy(() =>
    import('./components/DossierLifecyclePanel').then((m) => ({ default: m.DossierLifecyclePanel }))
);
export const LazyVisitationCalendarModal = lazy(() =>
    import('./components/VisitationCalendarModal').then((m) => ({ default: m.VisitationCalendarModal }))
);
export const LazyExecutionFinancialHubPortal = lazy(() =>
    import('./components/ExecutionFinancialHubPortal').then((m) => ({
        default: m.ExecutionFinancialHubPortal,
    }))
);

/** تحميل مسبق للهيكل المرئي فور فتح إضبارة التنفيذ */
export function prefetchExecutionDashboardShell(): void {
    void dashboardHeaderImport().catch(() => {});
    void partiesSectionImport().catch(() => {});
    void debtorsSectionImport().catch(() => {});
}

/** تحميل مسبق لتبويب طلبات الحجز (الافتراضي في محضر المتابعة) */
export function prefetchExecutionFollowupDefaultTab(): void {
    void import('./components/SeizureRequestsTab').catch(() => {});
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

const executionFollowupModalPortalImport = () =>
    import('./ExecutionFollowupModalPortal').then((m) => ({
        default: m.ExecutionFollowupModalPortal,
    }));

export const LazyExecutionFollowupModalPortal = lazy(executionFollowupModalPortalImport);

export function prefetchExecutionModalContainers(): void {
    void executionPaymentModalImport().catch(() => {});
    void executionCoerciveActionsModalImport().catch(() => {});
}

export function prefetchExecutionFollowupModalPortal(): void {
    void executionFollowupModalPortalImport().catch(() => {});
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

/** تحميل مسبق للنوافذ الأكثر استخداماً بعد فتح الإضبارة */
export function prefetchExecutionOverlayModals(): void {
    void executionTrashModalImport().catch(() => {});
    void dossierActionsModalImport().catch(() => {});
    void timelineEditModalImport().catch(() => {});
}

export function formatUnifiedLedgerDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('ar-IQ');
}

/** عناوين التبليغ اللاحق: تبليغ رقم واحد، اثنين، … */
export const AR_TABLIGH_RAQM: Record<number, string> = {
    1: 'واحد',
    2: 'اثنين',
    3: 'ثلاثة',
    4: 'أربعة',
    5: 'خمسة',
    6: 'ستة',
    7: 'سبعة',
    8: 'ثمانية',
    9: 'تسعة',
    10: 'عشرة',
};

type PartyOverflowToggleProps = {
    hiddenCount: number;
    expanded: boolean;
    onToggle: () => void;
    variant: 'creditor' | 'debtor';
};

export const PartyOverflowToggle = React.memo(function PartyOverflowToggle({
    hiddenCount,
    expanded,
    onToggle,
    variant,
}: PartyOverflowToggleProps) {
    const isCreditor = variant === 'creditor';
    const collapseLabel = isCreditor ? 'إخفاء الدائنين' : 'إخفاء المدينين';
    const expandLabel = isCreditor ? `عرض ${hiddenCount} دائن` : `عرض ${hiddenCount} مدين`;
    const buttonClass = isCreditor
        ? 'w-full backdrop-blur-xl bg-slate-800/40 border border-emerald-500/20 rounded-2xl py-2.5 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/60 transition-all text-emerald-400 text-sm font-medium shadow-lg shadow-emerald-500/5'
        : 'w-full backdrop-blur-xl bg-slate-800/40 border border-rose-500/20 rounded-2xl py-2.5 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/60 transition-all text-rose-400 text-sm font-medium shadow-lg shadow-rose-500/5';

    return (
        <button type="button" onClick={onToggle} className={buttonClass}>
            <ChevronDown size={18} className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? collapseLabel : expandLabel}</span>
        </button>
    );
});
