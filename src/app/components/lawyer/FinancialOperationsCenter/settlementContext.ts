import type { PendingSettlement } from './types';
import type { SettlementUxTier } from './settlementUxMatrix';
import { resolveSettlementUxTier } from './settlementUxMatrix';
import { resolveAmountGuarantorRequestVisible } from './settlementGuarantorGate';
import {
    resolveSettlementDuePhase,
    shouldShowSettlementDueActions,
    type SettlementDuePhase,
} from './utils';

export interface SettlementContextInput {
    settlementUxTier: SettlementUxTier;
    remainingUnified: number;
    completed: boolean;
    panelOpen: boolean;
    showSettlementForm: boolean;
    pendingSettlement: PendingSettlement | null;
    pendingSettlementDueYmd: string;
    currentYmd: string;
    isFinancialDebtCollectionClaim: boolean;
    financialCenterTotalIqd: number;
    settlementBreachTriggeredAt: string | null;
    /** مسار حجز راتب نشط — يُخفى زر التسوية بالكامل */
    salarySeizureActive?: boolean;
}

export interface SettlementContext {
    /** أزرار الدخول (kebab / secondary / primary) */
    showSettlementEntry: boolean;
    /** زر «تسوية» / «عرض تسوية مالية» — لا يظهر أثناء تسوية نشطة */
    showSettlementEntryButton: boolean;
    /** الحاوية الموحّدة للتسوية */
    showSettlementPanel: boolean;
    showNewSettlementForm: boolean;
    showPendingSummary: boolean;
    showSettlementDueActions: boolean;
    pendingSettlementDuePhase: SettlementDuePhase | null;
    showAmountGuarantorRequest: boolean;
    canRegisterSettlementAmount: (amount: number) => boolean;
}

export function resolveSettlementContext(input: SettlementContextInput): SettlementContext {
    const remaining = Math.max(0, Math.round(Number(input.remainingUnified) || 0));
    const pending = input.pendingSettlement;
    const hasPending = Boolean(pending);
    const tier =
        input.settlementUxTier === 'hidden' && remaining > 0
            ? resolveSettlementUxTier(remaining)
            : input.settlementUxTier;

    const showSettlementEntry =
        !input.salarySeizureActive && !input.completed && remaining > 0 && tier !== 'hidden';
    const showSettlementPanel = showSettlementEntry && (input.panelOpen || hasPending);
    /** زر الدخول للتسوية — يختفي أثناء التسوية النشطة */
    const showSettlementEntryButton = showSettlementEntry && !hasPending && !input.panelOpen;
    const showNewSettlementForm =
        showSettlementPanel && input.panelOpen && !hasPending && input.showSettlementForm;
    const showPendingSummary = showSettlementPanel && hasPending;

    const dueYmd = input.pendingSettlementDueYmd.trim();
    const showSettlementDueActions =
        showPendingSummary &&
        Boolean(dueYmd) &&
        shouldShowSettlementDueActions(dueYmd, input.currentYmd);

    const pendingSettlementDuePhase =
        hasPending && dueYmd ? resolveSettlementDuePhase(dueYmd, input.currentYmd) : null;

    const showAmountGuarantorRequest = resolveAmountGuarantorRequestVisible({
        isFinancialDebtCollectionClaim: input.isFinancialDebtCollectionClaim,
        financialCenterTotalIqd: input.financialCenterTotalIqd,
        settlementBreachTriggeredAt: input.settlementBreachTriggeredAt,
        pendingSettlement: pending,
    });

    return {
        showSettlementEntry,
        showSettlementEntryButton,
        showSettlementPanel,
        showNewSettlementForm,
        showPendingSummary,
        showSettlementDueActions,
        pendingSettlementDuePhase,
        showAmountGuarantorRequest,
        canRegisterSettlementAmount: (amount: number) => {
            const amt = Math.round(Number(amount) || 0);
            return amt > 0 && amt <= remaining;
        },
    };
}
