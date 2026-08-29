import {
    createDefaultFollowupSpecializationFlags,
    type FollowupSpecializationVisibility,
} from '@/app/utils/followupSpecializationTypes';

/** دمج أعلام العزل — أي مطالبة تخفِي عنصراً يبقى مخفياً */
export function mergeFollowupSpecializationFlags(
    flagsList: FollowupSpecializationVisibility[],
): FollowupSpecializationVisibility {
    if (flagsList.length === 0) {
        throw new Error('mergeFollowupSpecializationFlags requires at least one flags object');
    }
    if (flagsList.length === 1) return flagsList[0]!;

    const empty = createDefaultFollowupSpecializationFlags();

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
        empty,
    );
}
