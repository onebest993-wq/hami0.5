/** مستويات ظهور خيار التسوية حسب متبقي الوعاء */
export type SettlementUxTier = 'hidden' | 'buried' | 'secondary' | 'primary';

export const SETTLEMENT_UX_BURIED_MAX = 500_000;
export const SETTLEMENT_UX_SECONDARY_MAX = 3_000_000;

export interface SettlementUxTierOptions {
    /** استحصال مالي + موظف — التسوية تبقى في ⋮ المخفي مهما كان المتبقي */
    forceBuriedOnly?: boolean;
}

/**
 * يحدد موقع وأهمية زر «عرض تسوية مالية» بناءً على Remaining_Balance.
 * يُعاد حسابه لحظياً عند أي تسديد أو مصروف.
 */
export function resolveSettlementUxTier(
    remainingBalanceIqd: number,
    options?: SettlementUxTierOptions
): SettlementUxTier {
    const remaining = Math.max(0, Math.round(Number(remainingBalanceIqd) || 0));
    if (remaining <= 0) return 'hidden';
    if (options?.forceBuriedOnly) return 'buried';
    if (remaining <= SETTLEMENT_UX_BURIED_MAX) return 'buried';
    if (remaining <= SETTLEMENT_UX_SECONDARY_MAX) return 'secondary';
    return 'primary';
}
