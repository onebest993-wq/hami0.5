import { resolveAmountGuarantorRequestVisible } from '@/app/slices/financial/specialtyPublic';
import type { PendingSettlement } from '@/app/slices/financial/specialtyPublic';
import { hasActiveFinancialGuarantorFollowup } from '@/app/utils/execution/guarantorFollowup';
import type { ExecutionFile } from '@/app/types/execution';

export type FollowupSeizureSpecialization = {
    hideAllGuarantorPresence: boolean;
    isFinancialDebtCollection: boolean;
    showFinancialGuarantorRequestOnly: boolean;
    hideFollowupSeizureRequestsTab: boolean;
};

export type SettlementGuarantorGateSlice = {
    settlementBreachTriggeredAt: string | null | undefined;
    pendingSettlement: unknown;
};

export type SeizureMatrixSeizureTabSlice = {
    hideSeizureTab: boolean;
    ruleId?: string;
};

export function computeShowGuarantorInSeizureFollowupTab(input: {
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee: boolean;
    viewExecutionData: ExecutionFile | null | undefined;
    followupSpecialization: Pick<
        FollowupSeizureSpecialization,
        'hideAllGuarantorPresence' | 'isFinancialDebtCollection' | 'showFinancialGuarantorRequestOnly'
    >;
    remainingBalanceForSeizure: number;
    settlementGuarantorGate: SettlementGuarantorGateSlice;
}): boolean {
    const {
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        followupSpecialization,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
    } = input;

    if (activeDebtorIsDeceased) return false;
    if (hasActiveFinancialGuarantorFollowup(viewExecutionData)) return true;
    if (followupSpecialization.hideAllGuarantorPresence) return false;
    if (activeDebtorIsEmployee) return false;
    if (
        followupSpecialization.isFinancialDebtCollection &&
        resolveAmountGuarantorRequestVisible({
            isFinancialDebtCollectionClaim: true,
            financialCenterTotalIqd: remainingBalanceForSeizure,
            settlementBreachTriggeredAt: settlementGuarantorGate.settlementBreachTriggeredAt,
            pendingSettlement: settlementGuarantorGate.pendingSettlement as PendingSettlement | null | undefined,
            hideAllGuarantorPresence: false,
        })
    ) {
        return followupSpecialization.showFinancialGuarantorRequestOnly;
    }
    return false;
}

export function filterSeizureFromFollowupSectionTabOrder(
    followupSectionTabOrder: readonly string[],
    hideSeizureTab: boolean,
    hideFollowupSeizureRequestsTab: boolean,
): readonly string[] {
    return followupSectionTabOrder.filter(
        (tabId) =>
            tabId !== 'seizure_requests' || (!hideSeizureTab && !hideFollowupSeizureRequestsTab),
    );
}

export function filterSeizureFromFollowupModalTabs<T extends { id: string }>(
    followupModalTabs: readonly T[],
    hideSeizureTab: boolean,
    hideFollowupSeizureRequestsTab: boolean,
    followupTabsRestricted: boolean,
    restrictedFollowupTabIds: ReadonlySet<string>,
): T[] {
    return followupModalTabs.filter((tab) => {
        if (followupTabsRestricted && !restrictedFollowupTabIds.has(tab.id)) {
            return false;
        }
        return tab.id !== 'seizure_requests' || (!hideSeizureTab && !hideFollowupSeizureRequestsTab);
    });
}

export function canOpenSeizureRequestsTab(
    seizureMatrix: SeizureMatrixSeizureTabSlice,
    hideFollowupSeizureRequestsTab: boolean,
): boolean {
    return !seizureMatrix.hideSeizureTab && !hideFollowupSeizureRequestsTab;
}

export function resolveOpenSeizureRequestsTabBlockedMessage(
    hideFollowupSeizureRequestsTab: boolean,
    seizureMatrix: SeizureMatrixSeizureTabSlice,
): string {
    if (hideFollowupSeizureRequestsTab) {
        return 'تبويب الحجز غير متاح في مطالبات المشاهدة والاستصحاب';
    }
    if (seizureMatrix.ruleId === 'rule_0_government') {
        return 'المدين جهة حكومية — الحجز معطّل (حصانة الدولة)';
    }
    return 'لا يوجد رصيد متبٍّ — تبويب الحجز غير متاح';
}
