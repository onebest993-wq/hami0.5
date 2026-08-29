
/** مطالبات أحوال شخصية يمكن الجمع بينها في إضبارة واحدة */
export const SHARIA_LINKED_FINANCIAL_CLAIM_VALUES = [
    'نفقة',
    'نفقة ماضية',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'مهر مؤجل',
] as const;

export type ShariaLinkedFinancialClaim = (typeof SHARIA_LINKED_FINANCIAL_CLAIM_VALUES)[number];

/** تصنيف أحوال شخصية (قرارات المحاكم — شرعي) — لا يجوز تعدد المدينين */
export function isPersonalStatusClassification(classification: string): boolean {
    return String(classification || '').trim() === 'شرعي';
}

export function isDirectorateSectionComplete(directorate: string, fileNumber: string): boolean {
    return Boolean(String(directorate || '').trim() && String(fileNumber || '').trim());
}

export function isInstrumentSectionReadyForParties(input: {
    docType: string;
    classification: string;
    claimType: string;
    effectiveClaimTypes: string[];
    requiresClassification: boolean;
}): boolean {
    if (!String(input.docType || '').trim()) return false;
    if (
        input.requiresClassification &&
        (!String(input.classification || '').trim() || input.classification === 'none')
    ) {
        return false;
    }
    const types =
        input.effectiveClaimTypes.length > 0
            ? input.effectiveClaimTypes
            : input.claimType
              ? [input.claimType]
              : [];
    return types.length > 0;
}

export function isShariaLinkedFinancialClaim(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    return (SHARIA_LINKED_FINANCIAL_CLAIM_VALUES as readonly string[]).includes(ct);
}

const ONGOING_ALIMONY_CLAIM_TYPES = new Set(['نفقة', 'حجة نفقة اتفاقية']);

/** أنواع المطالبة الفعّالة من الإضبارة (مصفوفة claimTypes أو claimType مفرد) */
export function getEffectiveClaimTypes(
    executionData: Record<string, unknown> | null | undefined
): string[] {
    if (!executionData) return [];
    const fromArray = Array.isArray(executionData.claimTypes)
        ? (executionData.claimTypes as string[]).map((t) => String(t || '').trim()).filter(Boolean)
        : [];
    if (fromArray.length > 0) return fromArray;
    const single = String(executionData.claimType || '').trim();
    return single ? [single] : [];
}

/** نفقة مستمرة/اتفاقية — مسار تراكم شهري منفصل عن الديون المقطوعة */
export function hasOngoingAlimonyClaimTypes(claimTypes: string[]): boolean {
    return claimTypes.some((t) => ONGOING_ALIMONY_CLAIM_TYPES.has(t));
}

export function hasOngoingAlimonyInExecution(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType?: string
): boolean {
    const types = getEffectiveClaimTypes(executionData);
    if (types.length > 0) return hasOngoingAlimonyClaimTypes(types);
    const ct = String(fallbackClaimType || '').trim();
    return (
        ONGOING_ALIMONY_CLAIM_TYPES.has(ct) ||
        (ct.includes('نفقة') &&
            !ct.includes('نفقة عدة') &&
            !ct.includes('نفقة ماضية') &&
            !ct.includes('مهر'))
    );
}

/** إضبارة مركّبة: نفقة مستمرة + مطالبة مالية أخرى (ماضية، مهر، عدة، …) */
export function hasCompositeNonOngoingClaimTypes(
    executionData: Record<string, unknown> | null | undefined
): boolean {
    const types = getEffectiveClaimTypes(executionData);
    return types.some((t) => !ONGOING_ALIMONY_CLAIM_TYPES.has(t));
}
