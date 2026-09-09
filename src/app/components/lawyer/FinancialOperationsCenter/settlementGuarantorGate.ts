import type { PendingSettlement, UnifiedLedgerStore } from './types';

export interface AmountGuarantorVisibilityInput {
    /** استحصال/استخلاص دين مالي — يُفعّل بوابة التسوية */
    isFinancialDebtCollectionClaim: boolean;
    financialCenterTotalIqd: number;
    settlementBreachTriggeredAt?: string | null;
    /**
     * ⚠️ يُستقبَل ولا يُستشار — عمداً.
     *
     * لا يُحذف من الواجهة لأن المستدعي يمرّره ولأن غيابه يُغري بإعادة الشرط.
     * تفصيل سبب تجاهله في توثيق الدالّة أدناه.
     */
    pendingSettlement?: PendingSettlement | null;
    /** استحصال مالي + موظف — لا كفيل بأي نوع */
    hideAllGuarantorPresence?: boolean;
}

/**
 * ظهور شارة الكفيل المرتبطة بالتسوية: **بعد إخلال مسجَّل فقط**، مع وعاء مالي متبقٍ.
 *
 * ولا تظهر أثناء تسوية معلّقة — وهذا مقصود لا سهو. طلب الكفيل **تصعيد**، والمدين
 * الملتزم بتسوية لم يُخلّ بها بعدُ في وضع سليم؛ فالمطالبة بكفيل حينها سابقة
 * لأوانها وتضغط على طرفٍ لم يتأخّر.
 *
 * فالشرط هو `settlementBreachTriggeredAt` وحده — ولا يُسجَّل إلا عبر
 * `applySettlementBreachCancellation`، أي بعد «لم يتم التسديد» فعلاً. وتسجيل
 * تسوية جديدة (`applyNewSettlementRegistration`) يُصفّره فتختفي الشارة ثانيةً.
 *
 * ⚠️ `pendingSettlement` مُستقبَل ولا يُقرأ. كان الكود يحوي
 * `if (input.pendingSettlement) return true;` وأُزيل عمداً في commit `e076ee1f`
 * برسالة صريحة: «Guarantor now shows ONLY when settlementBreachTriggeredAt
 * actually recorded — standby/awaiting-due/new-settlement scenarios correctly
 * HIDE guarantor». ويؤكّده اختبار مخصَّص ناجح:
 * `settlementGuarantorGate.test.ts` → «hides amount guarantor … while settlement
 * is in standby (no breach)».
 *
 * تُرك المعامل مكانه ليقرأ من يأتي **لماذا** يُتجاهَل، فلا يُعاد الشرط ظنّاً
 * أنه سهو. وقد ضلّل غيابُ هذا التوثيق مراجعةً فعليةً قبل كتابته.
 */
export function resolveAmountGuarantorRequestVisible(input: AmountGuarantorVisibilityInput): boolean {
    if (input.hideAllGuarantorPresence) return false;

    const balance = Math.max(0, Math.round(Number(input.financialCenterTotalIqd) || 0));
    if (balance <= 0) return false;

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
