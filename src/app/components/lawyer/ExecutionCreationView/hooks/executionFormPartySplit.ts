
export const FINANCIAL_CLAIM_TYPES_PARTY_SPLIT = new Set([
    'استحصال دين مالي',
    'استخلاص دين مالي',
    'مهر مؤجل',
    'حجة زواج - مهر معجل',
    'حجة زواج - مهر مؤجل',
    'حجة وصية',
    'حجة تخارج',
    'حجة مخالعة',
    'حجة إقرار بدين',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'استيفاء دين من بيع عقار',
    'نفقة',
    'نفقة ماضية',
    'حجة نفقة اتفاقية',
]);

export function isFinancialClaimForPartySplit(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    return Boolean(ct && FINANCIAL_CLAIM_TYPES_PARTY_SPLIT.has(ct));
}

export function resolveEffectiveClaimTypesList(
    effectiveClaimTypes: string[],
    claimType: string,
): string[] {
    return effectiveClaimTypes.length > 0
        ? effectiveClaimTypes
        : claimType
          ? [claimType]
          : [];
}

/** تقسيم مستقل/ضامن — مدني + مطالبة مالية قابلة للتقسيم فقط */
export function showCivilDebtorSolidarySplit(
    classification: string,
    effectiveClaimTypes: string[],
    claimType: string,
): boolean {
    if (String(classification || '').trim() !== 'مدني') return false;
    const types = resolveEffectiveClaimTypesList(effectiveClaimTypes, claimType);
    return types.some((ct) => isFinancialClaimForPartySplit(ct));
}

/** هل تُعرض حاوية حصة المدين المستقل في نموذج الإنشاء */
export function shouldShowIndependentDebtorSharePanels(
    classification: string,
    effectiveClaimTypes: string[],
    claimType: string,
    totalDebtorCount: number,
    totalCreditorCount: number,
): boolean {
    if (!showCivilDebtorSolidarySplit(classification, effectiveClaimTypes, claimType)) {
        return false;
    }
    if (totalDebtorCount < 1) return false;
    if (totalDebtorCount <= 1 && totalCreditorCount <= 1) return false;
    return true;
}
