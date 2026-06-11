import type { PendingSettlement, UnifiedLedgerStore } from './types';

export interface AmountGuarantorVisibilityInput {
    /** استحصال/استخلاص دين مالي — يُفعّل بوابة التسوية */
    isFinancialDebtCollectionClaim: boolean;
    financialCenterTotalIqd: number;
    settlementBreachTriggeredAt?: string | null;
    pendingSettlement?: PendingSettlement | null;
    /** استحصال مالي + موظف — لا كفيل بأي نوع */
    hideAllGuarantorPresence?: boolean;
}

/**
 * يتحكم بظهور «كفيل ضامن للمبلغ»:
 * لا يظهر إلا بعد إخلال تسوية (تسجيل تسوية ثم عدم السداد وإلغاؤها) مع وعاء مالي.
 */
export function resolveAmountGuarantorRequestVisible(input: AmountGuarantorVisibilityInput): boolean {
    if (input.hideAllGuarantorPresence) return false;

    const balance = Math.max(0, Math.round(Number(input.financialCenterTotalIqd) || 0));
    if (balance <= 0) return false;

    const breachAt = String(input.settlementBreachTriggeredAt || '').trim();
    if (!breachAt) return false;

    if (input.pendingSettlement) return false;

    return true;
}

/** إلغاء التسوية بعد «لم يتم التسديد» — يُفعّل مسار الكفيل */
export function applySettlementBreachCancellation(
    store: UnifiedLedgerStore,
    atIso: string
): UnifiedLedgerStore {
    return {
        ...store,
        pendingSettlement: null,
        settlementBreachTriggeredAt: atIso,
    };
}

/** تسجيل تسوية جديدة — يعيد الكفيل إلى وضع الترقب */
export function applyNewSettlementRegistration(
    store: UnifiedLedgerStore,
    pending: PendingSettlement
): UnifiedLedgerStore {
    return {
        ...store,
        pendingSettlement: pending,
        settlementBreachTriggeredAt: null,
    };
}
