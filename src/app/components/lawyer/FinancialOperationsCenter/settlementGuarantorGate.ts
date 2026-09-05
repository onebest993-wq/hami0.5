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
 * يتحكم بظهور شارة الكفيل المرتبطة بالتسوية:
 * تظهر عند وجود تسوية نشطة أو بعد إخلال تسوية، مع وعاء مالي متبقٍ.
 */
export function resolveAmountGuarantorRequestVisible(input: AmountGuarantorVisibilityInput): boolean {
    if (input.hideAllGuarantorPresence) return false;

    const balance = Math.max(0, Math.round(Number(input.financialCenterTotalIqd) || 0));
    if (balance <= 0) return false;

    if (input.pendingSettlement) return true;

    const breachAt = String(input.settlementBreachTriggeredAt || '').trim();
    return Boolean(breachAt);
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
