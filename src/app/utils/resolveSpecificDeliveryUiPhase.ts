import {
    resolveSpecificDeliveryItemNature,
    type SpecificDeliveryItemNature,
} from '@/app/utils/executionModuleStrategies';
import {
    aggregateSpecificDeliveryFinancializedAmount,
    allSpecificDeliveryItemsFinancialized,
    getPendingSpecificDeliveryItems,
    readSpecificDeliveryItems,
    resolvePrimarySpecificDeliveryNature,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';

/** مرحلة واجهة تسليم شيء معين */
export type SpecificDeliveryUiPhase = 'needs_nature' | 'pre_delivery' | 'post_financialization';

export interface SpecificDeliveryUiPhaseInput {
    specificDeliveryItemNature?: string | null;
    specificDeliveryFinancialized?: boolean;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
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
    hideFollowupSeizureRequestsTab: boolean;
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
    hideFollowupSeizureRequestsTab: false,
    hideEvictionCustodianProcedure: true,
    hideEncroachmentEvictionExtras: true,
});

export function resolveSpecificDeliveryUiPhase(
    input: SpecificDeliveryUiPhaseInput
): SpecificDeliveryUiPhaseResult {
    const items = readSpecificDeliveryItems(input);
    const pendingItems = getPendingSpecificDeliveryItems(items);
    const hasPending =
        pendingItems.length > 0 ||
        (items.length === 0 && !Boolean(input.specificDeliveryFinancialized));
    const financializedTotal =
        items.length > 0
            ? aggregateSpecificDeliveryFinancializedAmount(items)
            : 0;
    const anyFinancialized =
        financializedTotal > 0 ||
        (items.length === 0 && Boolean(input.specificDeliveryFinancialized));
    const allFinancialized =
        items.length > 0
            ? allSpecificDeliveryItemsFinancialized(items)
            : Boolean(input.specificDeliveryFinancialized);
    const isEmployee = Boolean(input.isEmployee);

    const naturePool = pendingItems.length > 0 ? pendingItems : items;
    const nature =
        resolvePrimarySpecificDeliveryNature(naturePool, input.specificDeliveryItemNature) ??
        resolveSpecificDeliveryItemNature(input.specificDeliveryItemNature);

    if (!nature && items.length === 0) {
        return needsNatureResult(isEmployee);
    }

    if (allFinancialized && !hasPending) {
        return {
            phase: 'post_financialization',
            nature,
            showFieldProcedures: false,
            showSurveyorCard: false,
            showBreakInventoryCard: false,
            showHiddenBreakInventoryRequest: false,
            showConversionCard: false,
            showPersonalCoerciveTab: false,
            hidePersonalDetentionCard: true,
            hidePersonalForcedBringCard: true,
            activateFinancialSeizurePath: true,
            hideCoerciveFollowupTab: isEmployee,
            showFinancialGuarantorRequestOnly: !isEmployee,
            hideGuarantorSeizureSubTab: true,
            hideCoerciveGraceNotice: true,
            hideCoerciveFinancialBanners: true,
            hideCoerciveSeizureTools: true,
            hideFollowupSeizureRequestsTab: false,
            hideEvictionCustodianProcedure: true,
            hideEncroachmentEvictionExtras: true,
        };
    }

    const pendingImmovable = pendingItems.some((item) => item.nature === 'immovable');
    const effectiveNature = nature ?? pendingItems[0]?.nature ?? 'movable';

    return {
        phase: hasPending ? 'pre_delivery' : 'post_financialization',
        nature: effectiveNature,
        showFieldProcedures: hasPending,
        showSurveyorCard: pendingImmovable,
        showBreakInventoryCard: false,
        showHiddenBreakInventoryRequest: pendingImmovable,
        showConversionCard: hasPending,
        showPersonalCoerciveTab: false,
        hidePersonalDetentionCard: anyFinancialized || pendingImmovable || isEmployee,
        hidePersonalForcedBringCard: anyFinancialized || pendingImmovable,
        activateFinancialSeizurePath: anyFinancialized,
        hideCoerciveFollowupTab: false,
        showFinancialGuarantorRequestOnly: false,
        hideGuarantorSeizureSubTab: isEmployee,
        hideCoerciveGraceNotice: true,
        hideCoerciveFinancialBanners: true,
        hideCoerciveSeizureTools: true,
        hideFollowupSeizureRequestsTab: !anyFinancialized,
        hideEvictionCustodianProcedure: true,
        hideEncroachmentEvictionExtras: true,
    };
}
