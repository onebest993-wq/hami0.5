import {
    resolveSpecificDeliveryItemNature,
    type SpecificDeliveryItemNature,
} from '@/app/utils/executionModuleStrategies';
import {
    isSpecificDeliveryConversionDecisionRow,
    parseSpecificDeliveryConversionPayload,
} from '@/app/utils/specificDeliveryConversionRequest';
import {
    allSpecificDeliveryItemsFinancialized,
    getPendingSpecificDeliveryItems,
    readSpecificDeliveryItems,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

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

/** موافقة المنفذ على طلب التحويل / هلاك — شرط ظهور خبير المنقول */
export function hasApprovedSpecificDeliveryConversionDecision(
    decisions: Record<string, unknown>[]
): boolean {
    const list = Array.isArray(decisions) ? decisions : [];
    for (const d of list) {
        if (!isSpecificDeliveryConversionDecisionRow(d)) continue;
        if (isExecutorHubRowSuperseded(d)) continue;
        if (isExecutorRowRejectedAndFinal(d)) continue;
        if (Boolean(String(d.specificDeliveryConversionSavedAt || '').trim())) return true;
        if (isExecutorRowEffectivelyApproved(d)) return true;
    }
    return false;
}

function isItemLinkedToApprovedConversion(
    item: SpecificDeliveryItem,
    decisions: Record<string, unknown>[]
): boolean {
    for (const d of decisions) {
        if (!isSpecificDeliveryConversionDecisionRow(d)) continue;
        if (isExecutorHubRowSuperseded(d)) continue;
        if (isExecutorRowRejectedAndFinal(d)) continue;
        const saved = Boolean(String(d.specificDeliveryConversionSavedAt || '').trim());
        if (!saved && !isExecutorRowEffectivelyApproved(d)) continue;
        const payload = parseSpecificDeliveryConversionPayload(d);
        if (payload.itemId && payload.itemId === item.id) return true;
        const payloadName = String(payload.itemName || '').trim();
        if (payloadName && payloadName === String(item.name || '').trim()) return true;
    }
    return false;
}

function pendingMovableItemsNeedingExpert(
    input: {
        specificDeliveryItemNature?: string | null;
        specificDeliveryItems?: SpecificDeliveryItem[] | null;
    },
    decisions: Record<string, unknown>[]
): SpecificDeliveryItem[] {
    const items = readSpecificDeliveryItems(input);
    if (items.length > 0) {
        return items.filter(
            (item) =>
                item.status === 'pending' &&
                item.nature === 'movable' &&
                (item.declaredDestroyed || isItemLinkedToApprovedConversion(item, decisions))
        );
    }
    if (resolveSpecificDeliveryNature(input.specificDeliveryItemNature) === 'movable') {
        return [{ id: 'legacy', name: '', nature: 'movable', status: 'pending' }];
    }
    return [];
}

/** خبير المنقول — بعد موافقة المنفذ على طلب التحويل/الهلاك وعند وجود منقول pending */
export function shouldShowSpecificDeliveryMovableValuationExpert(input: {
    specificDeliveryItemNature?: string | null;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    specificDeliveryFinancialized?: boolean;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    decisions: Record<string, unknown>[];
}): boolean {
    const items = readSpecificDeliveryItems(input);
    const pendingMovable = pendingMovableItemsNeedingExpert(input, input.decisions);
    if (pendingMovable.length === 0) return false;
    if (items.length > 0 ? allSpecificDeliveryItemsFinancialized(items) : input.specificDeliveryFinancialized) {
        return false;
    }
    if (
        pendingMovable.every(
            (item) => Math.max(0, Math.trunc(Number(item.judgmentValueIqd) || 0)) > 0
        )
    ) {
        return false;
    }
    if (!hasApprovedSpecificDeliveryConversionDecision(input.decisions)) {
        return false;
    }
    const hasExplicitMultiItems =
        Array.isArray(input.specificDeliveryItems) && input.specificDeliveryItems.length > 0;
    if (
        !hasExplicitMultiItems &&
        isSpecificDeliveryJudgmentValuePredetermined({
            debtAmount: input.debtAmount,
            totalAmount: input.totalAmount,
            specificDeliveryConvertedAmount: input.specificDeliveryConvertedAmount,
        })
    ) {
        return false;
    }
    return true;
}

/** خبير العقار — غير منقول فقط */
export function shouldShowSpecificDeliveryPropertyExpert(input: {
    specificDeliveryItemNature?: string | null;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    showPropertyExpertCardFlag?: boolean;
}): boolean {
    if (!input.showPropertyExpertCardFlag) return false;
    const items = readSpecificDeliveryItems(input);
    if (items.length > 0) {
        return getPendingSpecificDeliveryItems(items).some((item) => item.nature === 'immovable');
    }
    return resolveSpecificDeliveryNature(input.specificDeliveryItemNature) === 'immovable';
}
