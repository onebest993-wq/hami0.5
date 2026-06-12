/**
 * Lazy boundaries + small presentational helpers extracted from ExecutionDashboard.tsx
 * (same markup/classes — no visual change; easier maintenance and future splits).
 */
import React, { lazy } from 'react';
import { ChevronDown } from 'lucide-react';

export const LazyExecutionDashboardModularHost = lazy(() =>
    import('./ExecutionDashboardModularHost').then((m) => ({
        default: m.ExecutionDashboardModularHost,
    }))
);

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

export const EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode = null;
export const EXEC_FOC_LAZY_FALLBACK: React.ReactNode = null;

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
