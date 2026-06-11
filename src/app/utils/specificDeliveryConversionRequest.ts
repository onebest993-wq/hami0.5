import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';

export const SPECIFIC_DELIVERY_CONVERSION_TITLE =
    '⚠️ طلب تحويل المطالبة لتعذر التسليم / هلاك الشيء';
export const SPECIFIC_DELIVERY_CONVERSION_INITIAL_BODY =
    'طلب تحويل المطالبة إلى قيمة نقدية لتعذر التسليم أو هلاك الشيء — تُستكمل القيمة بعد موافقة المنفذ.';
export const SPECIFIC_DELIVERY_CONVERSION_PAYLOAD_KIND = 'specific_delivery_conversion';

function newConversionDecisionId(): string {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    const uuid = c?.randomUUID?.();
    if (uuid) return `spec_conv_${uuid}`;
    return `spec_conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function appendSpecificDeliveryConversionRequest(input: {
    executionId: string | undefined;
}): string | null {
    try {
        const arr = readExecutorDecisionsArray(input.executionId);
        const existing = arr.find((row) => isSpecificDeliveryConversionDecisionRow(row));
        if (existing && !isExecutorRowRejectedAndFinal(existing)) return null;
        const decisionId = newConversionDecisionId();
        const row = {
            id: decisionId,
            title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
            body: SPECIFIC_DELIVERY_CONVERSION_INITIAL_BODY,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            appealRequestOrigin: 'creditor_side' as const,
            payloadJson: JSON.stringify({ kind: SPECIFIC_DELIVERY_CONVERSION_PAYLOAD_KIND }),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        writeExecutorDecisionsArray(input.executionId, arr);
        dispatchDecisionsReload();
        return decisionId;
    } catch {
        return null;
    }
}

export function sendInitialSpecificDeliveryConversionRequest(input: {
    executionId: string | undefined;
}): { ok: boolean; decisionId?: string } {
    const decisionId = appendSpecificDeliveryConversionRequest(input);
    return decisionId ? { ok: true, decisionId } : { ok: false };
}

export function finalizeSpecificDeliveryConversionRequest(input: {
    executionId: string | undefined;
    decisionId: string;
    cashValue: number;
    itemName?: string;
}): { ok: boolean; amount?: number } {
    const amount = Math.max(0, Math.trunc(input.cashValue));
    const decisionId = String(input.decisionId || '').trim();
    if (amount <= 0 || !decisionId) return { ok: false };

    const item = String(input.itemName || '').trim();
    const body =
        `طلب تحويل المطالبة إلى قيمة نقدية لتعذر التسليم أو هلاك الشيء.\n` +
        (item ? `الشيء: ${item}\n` : '') +
        `القيمة النقدية للشيء: ${amount.toLocaleString('ar-IQ')} د.ع.`;

    const patched = patchExecutorDecisionRow(input.executionId, decisionId, {
        body,
        specificDeliveryConversionSavedAt: new Date().toISOString(),
        specificDeliveryConversionAmount: amount,
    });
    return patched ? { ok: true, amount } : { ok: false };
}

export function isSpecificDeliveryConversionDecisionRow(
    row: Record<string, unknown> | null | undefined
): boolean {
    if (!row) return false;
    if (String(row.requestKind || '') !== 'special_followup') return false;
    if (String(row.title || '').trim() === SPECIFIC_DELIVERY_CONVERSION_TITLE) return true;
    const raw = String(row.payloadJson || '').trim();
    if (!raw) return false;
    try {
        const p = JSON.parse(raw) as { kind?: string };
        return p?.kind === SPECIFIC_DELIVERY_CONVERSION_PAYLOAD_KIND;
    } catch {
        return false;
    }
}
