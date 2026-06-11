import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import {
    isFinancialDebtCollectionClaim,
    isMaritalFurnitureClaim,
    isMatwaaClaim,
    isVisitationClaim,
    type FollowupSpecializationVisibility,
} from '@/app/utils/followupSpecializationVisibility';

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
    if (
        isSpecificDeliveryClaim(ct) &&
        !(data as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized
    ) {
        return true;
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

/** دمج أعلام العزل — أي مطالبة تخفِي عنصراً يبقى مخفياً */
export function mergeFollowupSpecializationFlags(
    flagsList: FollowupSpecializationVisibility[]
): FollowupSpecializationVisibility {
    if (flagsList.length === 0) {
        throw new Error('mergeFollowupSpecializationFlags requires at least one flags object');
    }
    if (flagsList.length === 1) return flagsList[0]!;

    const empty: FollowupSpecializationVisibility = {
        isFinancialDebtCollection: false,
        hidePersonalCoerciveFollowupTab: false,
        hideFollowupCoerciveTab: false,
        hidePersonalJudgePresentation: false,
        hidePersonalForcedBringActivation: false,
        hideGuarantorSeizureSubTab: false,
        hideAllGuarantorPresence: false,
        forceSettlementBuriedOnly: false,
        showFinancialGuarantorRequestOnly: false,
        hideCoerciveGraceNoticeBanner: false,
        hideCoerciveFinancialBanners: false,
        hideCoerciveSeizureSalaryAndProperty: false,
        hideEncroachmentEvictionProcedureItems: false,
        showEncroachmentRemovalRequestCards: false,
        showSpecificDeliverySurveyorCard: false,
        showSpecificDeliveryConversionCard: false,
        hideEvictionCustodianProcedure: false,
        showSpecificDeliveryBreakInventoryCard: false,
        showHiddenBreakInventoryRequest: false,
        showSpecificDeliveryFieldProcedures: false,
        suppressHiddenPersonalCoerciveRequests: false,
        hideDossierFinancialTools: false,
        hideFollowupSeizureRequestsTab: false,
        showCorrespondencesSoftProcedures: false,
    };

    return flagsList.reduce(
        (acc, f) => ({
            isFinancialDebtCollection:
                acc.isFinancialDebtCollection || f.isFinancialDebtCollection,
            hidePersonalCoerciveFollowupTab:
                acc.hidePersonalCoerciveFollowupTab || f.hidePersonalCoerciveFollowupTab,
            hideFollowupCoerciveTab: acc.hideFollowupCoerciveTab || f.hideFollowupCoerciveTab,
            hidePersonalJudgePresentation:
                acc.hidePersonalJudgePresentation || f.hidePersonalJudgePresentation,
            hidePersonalForcedBringActivation:
                acc.hidePersonalForcedBringActivation || f.hidePersonalForcedBringActivation,
            hideGuarantorSeizureSubTab:
                acc.hideGuarantorSeizureSubTab || f.hideGuarantorSeizureSubTab,
            hideAllGuarantorPresence: acc.hideAllGuarantorPresence || f.hideAllGuarantorPresence,
            forceSettlementBuriedOnly: acc.forceSettlementBuriedOnly || f.forceSettlementBuriedOnly,
            showFinancialGuarantorRequestOnly:
                acc.showFinancialGuarantorRequestOnly || f.showFinancialGuarantorRequestOnly,
            hideCoerciveGraceNoticeBanner:
                acc.hideCoerciveGraceNoticeBanner || f.hideCoerciveGraceNoticeBanner,
            hideCoerciveFinancialBanners:
                acc.hideCoerciveFinancialBanners || f.hideCoerciveFinancialBanners,
            hideCoerciveSeizureSalaryAndProperty:
                acc.hideCoerciveSeizureSalaryAndProperty || f.hideCoerciveSeizureSalaryAndProperty,
            hideEncroachmentEvictionProcedureItems:
                acc.hideEncroachmentEvictionProcedureItems ||
                f.hideEncroachmentEvictionProcedureItems,
            showEncroachmentRemovalRequestCards:
                acc.showEncroachmentRemovalRequestCards || f.showEncroachmentRemovalRequestCards,
            showSpecificDeliverySurveyorCard:
                acc.showSpecificDeliverySurveyorCard || f.showSpecificDeliverySurveyorCard,
            showSpecificDeliveryConversionCard:
                acc.showSpecificDeliveryConversionCard || f.showSpecificDeliveryConversionCard,
            hideEvictionCustodianProcedure:
                acc.hideEvictionCustodianProcedure || f.hideEvictionCustodianProcedure,
            showSpecificDeliveryBreakInventoryCard:
                acc.showSpecificDeliveryBreakInventoryCard ||
                f.showSpecificDeliveryBreakInventoryCard,
            showHiddenBreakInventoryRequest:
                acc.showHiddenBreakInventoryRequest || f.showHiddenBreakInventoryRequest,
            showSpecificDeliveryFieldProcedures:
                acc.showSpecificDeliveryFieldProcedures || f.showSpecificDeliveryFieldProcedures,
            suppressHiddenPersonalCoerciveRequests:
                acc.suppressHiddenPersonalCoerciveRequests ||
                f.suppressHiddenPersonalCoerciveRequests,
            hideDossierFinancialTools:
                acc.hideDossierFinancialTools || f.hideDossierFinancialTools,
            hideFollowupSeizureRequestsTab:
                acc.hideFollowupSeizureRequestsTab || f.hideFollowupSeizureRequestsTab,
            showCorrespondencesSoftProcedures:
                acc.showCorrespondencesSoftProcedures || f.showCorrespondencesSoftProcedures,
        }),
        empty
    );
}
