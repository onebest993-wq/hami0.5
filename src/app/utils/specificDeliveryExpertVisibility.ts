import {
    resolveSpecificDeliveryItemNature,
    type SpecificDeliveryItemNature,
} from '@/app/utils/executionModuleStrategies';
import { isSpecificDeliveryConversionDecisionRow } from '@/app/utils/specificDeliveryConversionRequest';

export function resolveSpecificDeliveryNature(
    raw: string | undefined | null
): SpecificDeliveryItemNature | null {
    return resolveSpecificDeliveryItemNature(raw);
}

/** قيمة محددة مسبقاً في قرار الحكم — لا حاجة لخبير التقدير */
export function isSpecificDeliveryJudgmentValuePredetermined(input: {
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
}): boolean {
    const converted = Math.max(0, Math.trunc(Number(input.specificDeliveryConvertedAmount) || 0));
    if (converted > 0) return true;
    const debt = Math.max(0, Math.trunc(Number(input.debtAmount) || 0));
    const total = Math.max(0, Math.trunc(Number(input.totalAmount) || 0));
    return debt > 0 || total > 0;
}

export function hasSpecificDeliveryConversionDecision(
    decisions: Record<string, unknown>[]
): boolean {
    const list = Array.isArray(decisions) ? decisions : [];
    return list.some((d) => isSpecificDeliveryConversionDecisionRow(d));
}

/** خبير المنقول — فقط بعد زر استحالة التنفيذ وعند غياب قيمة الحكم */
export function shouldShowSpecificDeliveryMovableValuationExpert(input: {
    specificDeliveryItemNature?: string | null;
    specificDeliveryFinancialized?: boolean;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    decisions: Record<string, unknown>[];
}): boolean {
    const nature = resolveSpecificDeliveryNature(input.specificDeliveryItemNature);
    if (nature !== 'movable') return false;
    if (input.specificDeliveryFinancialized) return false;
    if (
        isSpecificDeliveryJudgmentValuePredetermined({
            debtAmount: input.debtAmount,
            totalAmount: input.totalAmount,
            specificDeliveryConvertedAmount: input.specificDeliveryConvertedAmount,
        })
    ) {
        return false;
    }
    return hasSpecificDeliveryConversionDecision(input.decisions);
}

/** خبير العقار — غير منقول فقط */
export function shouldShowSpecificDeliveryPropertyExpert(input: {
    specificDeliveryItemNature?: string | null;
    showPropertyExpertCardFlag?: boolean;
}): boolean {
    if (!input.showPropertyExpertCardFlag) return false;
    return resolveSpecificDeliveryNature(input.specificDeliveryItemNature) === 'immovable';
}
