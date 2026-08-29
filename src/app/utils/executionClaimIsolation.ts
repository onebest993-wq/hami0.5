import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    isCustodyRemovalClaim,
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import { resolveSpecificDeliveryDebtTotal } from '@/app/utils/specificDeliveryItemsUtils';
import {
    isFinancialDebtCollectionClaim,
    isMaritalFurnitureClaim,
    isMatwaaClaim,
    isVisitationClaim,
} from '@/app/utils/followupSpecializationVisibility';

export { mergeFollowupSpecializationFlags } from '@/app/utils/followupSpecializationMerge';
export type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationTypes';

export type ExecutionClaimContext = Record<string, unknown> | null | undefined;

/** هل تطابق أي نوع مطالبة فعّال في الإضبارة */
export function executionClaimMatches(
    data: ExecutionClaimContext,
    fallbackClaimType: string | undefined,
    matcher: (claimType: string) => boolean
): boolean {
    const types = getEffectiveClaimTypes(data);
    if (types.length > 0) return types.some(matcher);
    return matcher(String(fallbackClaimType || data?.claimType || '').trim());
}

export function isVisitationExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    return executionClaimMatches(data, fallbackClaimType, isVisitationClaim);
}

export function isMaritalFurnitureExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    return executionClaimMatches(data, fallbackClaimType, isMaritalFurnitureClaim);
}

export function isCustodyRemovalExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    return executionClaimMatches(data, fallbackClaimType, isCustodyRemovalClaim);
}

export function isEncroachmentExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    return executionClaimMatches(data, fallbackClaimType, isEncroachmentRemovalClaim);
}

export function isEvictionExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    return executionClaimMatches(data, fallbackClaimType, isEvictionClaim);
}

const NON_FINANCIAL_CLAIM_FRAGMENTS = [
    'استصحاب',
    'مبيت',
    'تسليم طفل',
    'تسليم ولد',
] as const;

/** مطالبة غير مالية — لا مركز مالي ولا مسار حجز مالي */
export function isNonFinancialExecutionClaim(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): boolean {
    const types = getEffectiveClaimTypes(data);
    const list =
        types.length > 0
            ? types
            : [String(fallbackClaimType || data?.claimType || '').trim()].filter(Boolean);

    if (list.length === 0) return false;

    return list.every((ct) => isNonFinancialClaimType(ct, data));
}

function isNonFinancialClaimType(ct: string, data: ExecutionClaimContext): boolean {
    if (isVisitationClaim(ct)) return true;
    if (isMatwaaClaim(ct)) return true;
    if (isEncroachmentRemovalClaim(ct)) return true;
    if (isEvictionClaim(ct)) return true;
    if (isMaritalFurnitureClaim(ct)) return true;
    if (isSpecificDeliveryClaim(ct)) {
        const debt = resolveSpecificDeliveryDebtTotal(data ?? {});
        if (debt > 0) return false;
        if (
            !(data as { specificDeliveryFinancialized?: boolean } | null | undefined)
                ?.specificDeliveryFinancialized
        ) {
            return true;
        }
        return false;
    }
    return NON_FINANCIAL_CLAIM_FRAGMENTS.some((frag) => ct.includes(frag));
}

/**
 * نوع المطالبة الأساسي لمسار الوحدة — الأكثر تخصصاً يمنع تسريب إجراءات نوع آخر
 */
export function resolvePrimaryExecutionClaimType(
    data: ExecutionClaimContext,
    fallbackClaimType?: string
): string {
    const types = getEffectiveClaimTypes(data);
    if (types.length === 0) {
        return String(fallbackClaimType || data?.claimType || '').trim();
    }
    if (types.length === 1) return types[0]!;

    const priorityMatchers: Array<(ct: string) => boolean> = [
        isVisitationClaim,
        isMatwaaClaim,
        isEncroachmentRemovalClaim,
        isMaritalFurnitureClaim,
        isSpecificDeliveryClaim,
        isEvictionClaim,
        isFinancialDebtCollectionClaim,
    ];
    for (const matcher of priorityMatchers) {
        const hit = types.find(matcher);
        if (hit) return hit;
    }
    return types[0]!;
}

