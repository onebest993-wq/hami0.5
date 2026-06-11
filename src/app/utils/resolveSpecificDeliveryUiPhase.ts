import {
    resolveSpecificDeliveryItemNature,
    type SpecificDeliveryItemNature,
} from '@/app/utils/executionModuleStrategies';

/** مرحلة واجهة تسليم شيء معين */
export type SpecificDeliveryUiPhase = 'needs_nature' | 'pre_delivery' | 'post_financialization';

export interface SpecificDeliveryUiPhaseInput {
    specificDeliveryItemNature?: string | null;
    specificDeliveryFinancialized?: boolean;
    isEmployee: boolean;
}

/** مخرجات مرحلة واحدة — بديل أعلام followup المتفرقة */
export interface SpecificDeliveryUiPhaseResult {
    phase: SpecificDeliveryUiPhase;
    nature: SpecificDeliveryItemNature | null;
    /** إظهار كتلة الإجراءات الميدانية (شرطة، ميدان، كسر، مساح، تحويل) */
    showFieldProcedures: boolean;
    showSurveyorCard: boolean;
    showBreakInventoryCard: boolean;
    /** طلب كسر الأقفال — في الطلبات المخفية (تبويب الطلبات) وليس الإجراءات الجبرية */
    showHiddenBreakInventoryRequest: boolean;
    showConversionCard: boolean;
    showPersonalCoerciveTab: boolean;
    hidePersonalDetentionCard: boolean;
    hidePersonalForcedBringCard: boolean;
    activateFinancialSeizurePath: boolean;
    hideCoerciveFollowupTab: boolean;
    showFinancialGuarantorRequestOnly: boolean;
    hideGuarantorSeizureSubTab: boolean;
    hideCoerciveGraceNotice: boolean;
    hideCoerciveFinancialBanners: boolean;
    hideCoerciveSeizureTools: boolean;
    hideEvictionCustodianProcedure: boolean;
    hideEncroachmentEvictionExtras: boolean;
}

const needsNatureResult = (isEmployee: boolean): SpecificDeliveryUiPhaseResult => ({
    phase: 'needs_nature',
    nature: null,
    showFieldProcedures: false,
    showSurveyorCard: false,
    showBreakInventoryCard: false,
    showHiddenBreakInventoryRequest: false,
    showConversionCard: false,
    showPersonalCoerciveTab: false,
    hidePersonalDetentionCard: true,
    hidePersonalForcedBringCard: true,
    activateFinancialSeizurePath: false,
    hideCoerciveFollowupTab: false,
    showFinancialGuarantorRequestOnly: false,
    hideGuarantorSeizureSubTab: isEmployee,
    hideCoerciveGraceNotice: true,
    hideCoerciveFinancialBanners: true,
    hideCoerciveSeizureTools: true,
    hideEvictionCustodianProcedure: true,
    hideEncroachmentEvictionExtras: true,
});

export function resolveSpecificDeliveryUiPhase(
    input: SpecificDeliveryUiPhaseInput
): SpecificDeliveryUiPhaseResult {
    const nature = resolveSpecificDeliveryItemNature(input.specificDeliveryItemNature);
    const financialized = Boolean(input.specificDeliveryFinancialized);
    const isEmployee = Boolean(input.isEmployee);

    if (!nature) {
        return needsNatureResult(isEmployee);
    }

    if (financialized) {
        const earnerMovable = !isEmployee && nature === 'movable';
        return {
            phase: 'post_financialization',
            nature,
            showFieldProcedures: false,
            showSurveyorCard: false,
            showBreakInventoryCard: false,
            showHiddenBreakInventoryRequest: false,
            showConversionCard: false,
            showPersonalCoerciveTab: earnerMovable,
            hidePersonalDetentionCard: false,
            hidePersonalForcedBringCard: false,
            activateFinancialSeizurePath: true,
            hideCoerciveFollowupTab: isEmployee,
            showFinancialGuarantorRequestOnly: !isEmployee,
            hideGuarantorSeizureSubTab: true,
            hideCoerciveGraceNotice: true,
            hideCoerciveFinancialBanners: false,
            hideCoerciveSeizureTools: false,
            hideEvictionCustodianProcedure: true,
            hideEncroachmentEvictionExtras: true,
        };
    }

    const immovable = nature === 'immovable';
    return {
        phase: 'pre_delivery',
        nature,
        showFieldProcedures: true,
        showSurveyorCard: immovable,
        showBreakInventoryCard: false,
        showHiddenBreakInventoryRequest: immovable,
        showConversionCard: true,
        showPersonalCoerciveTab: false,
        hidePersonalDetentionCard: immovable || isEmployee,
        hidePersonalForcedBringCard: immovable,
        activateFinancialSeizurePath: false,
        hideCoerciveFollowupTab: false,
        showFinancialGuarantorRequestOnly: false,
        hideGuarantorSeizureSubTab: isEmployee,
        hideCoerciveGraceNotice: true,
        hideCoerciveFinancialBanners: true,
        hideCoerciveSeizureTools: true,
        hideEvictionCustodianProcedure: true,
        hideEncroachmentEvictionExtras: true,
    };
}
