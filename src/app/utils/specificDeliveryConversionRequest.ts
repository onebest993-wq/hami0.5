import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    isEvictionProcedureRowPending,
    patchExecutorDecisionRowReliable,
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

function archiveSpecialFollowupHubRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: new Date().toISOString(),
        isArchived: true,
    };
}

export function isSpecificDeliveryConversionCycleComplete(
    row: Record<string, unknown> | null | undefined,
    opts?: {
        requiresCashValue?: boolean;
        allDecisions?: Record<string, unknown>[];
    }
): boolean {
    if (!row) return false;
    const saved = Boolean(String(row.specificDeliveryConversionSavedAt || '').trim());
    if (saved) return true;
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (opts?.requiresCashValue) return false;
    /** بعد الموافقة يُكمَّل تلقائياً — القيمة عبر الخبير */
    if (opts?.allDecisions?.length) return false;
    return isExecutorRowEffectivelyApproved(row);
}

export function sendInitialSpecificDeliveryConversionRequest(input: {
    executionId: string | undefined;
    supersedeCompletedHub?: boolean;
    itemId?: string;
    itemName?: string;
}): { ok: boolean; decisionId?: string } {
    try {
        let arr = readExecutorDecisionsArray(input.executionId);
        const itemId = String(input.itemId || '').trim();
        const existing = arr.find((row) => {
            if (!isSpecificDeliveryConversionDecisionRow(row) || isExecutorHubRowSuperseded(row)) {
                return false;
            }
            if (!itemId) return true;
            const payload = parseSpecificDeliveryConversionPayload(row as Record<string, unknown>);
            return String(payload.itemId || '').trim() === itemId;
        });
        if (existing) {
            if (isEvictionProcedureRowPending(existing)) return { ok: false };
            const saved = Boolean(
                String(
                    (existing as { specificDeliveryConversionSavedAt?: string })
                        .specificDeliveryConversionSavedAt || '',
                ).trim(),
            );
            const rejected = isExecutorRowRejectedAndFinal(existing);
            if (saved || rejected) {
                if (input.supersedeCompletedHub) {
                    arr = arr.map((row) =>
                        String((row as { id?: string }).id || '') === String(existing.id || '')
                            ? archiveSpecialFollowupHubRow(row as Record<string, unknown>)
                            : row
                    );
                } else {
                    return { ok: false };
                }
            } else {
                return { ok: false };
            }
        }
        const decisionId = newConversionDecisionId();
        const itemName = String(input.itemName || '').trim();
        const bodyExtra = itemName ? `\nالشيء: ${itemName}` : '';
        const row = {
            id: decisionId,
            title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
            body: SPECIFIC_DELIVERY_CONVERSION_INITIAL_BODY + bodyExtra,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            appealRequestOrigin: 'creditor_side' as const,
            payloadJson: JSON.stringify({
                kind: SPECIFIC_DELIVERY_CONVERSION_PAYLOAD_KIND,
                ...(itemId ? { itemId } : {}),
                ...(itemName ? { itemName } : {}),
            }),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        writeExecutorDecisionsArray(input.executionId, arr);
        dispatchDecisionsReload();
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** @deprecated — استخدم sendInitialSpecificDeliveryConversionRequest */
export function appendSpecificDeliveryConversionRequest(input: {
    executionId: string | undefined;
}): string | null {
    const result = sendInitialSpecificDeliveryConversionRequest(input);
    return result.ok ? result.decisionId ?? null : null;
}

export function completeSpecificDeliveryConversionApproval(input: {
    executionId: string | undefined;
    decisionId: string;
    itemName?: string;
}): { ok: boolean } {
    const decisionId = String(input.decisionId || '').trim();
    if (!decisionId) return { ok: false };

    const item = String(input.itemName || '').trim();
    const body =
        `طلب تحويل المطالبة إلى قيمة نقدية لتعذر التسليم أو هلاك الشيء.\n` +
        (item ? `الشيء المُعلَن هلاكه: ${item}\n` : '') +
        `تم تسجيل الهلاك — يُستكمل تقدير القيمة السوقية عبر انتداب الخبير.`;

    const patched = patchExecutorDecisionRowReliable(input.executionId, decisionId, {
        body,
        specificDeliveryConversionSavedAt: new Date().toISOString(),
        specificDeliveryConversionAmount: null,
    });
    return patched.ok ? { ok: true } : { ok: false };
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

    const patched = patchExecutorDecisionRowReliable(input.executionId, decisionId, {
        body,
        specificDeliveryConversionSavedAt: new Date().toISOString(),
        specificDeliveryConversionAmount: amount,
    });
    return patched.ok ? { ok: true, amount } : { ok: false };
}

export function parseSpecificDeliveryConversionPayload(
    row: Record<string, unknown> | null | undefined,
): { itemId?: string; itemName?: string } {
    if (!row) return {};
    const raw = String(row.payloadJson || '').trim();
    if (!raw) return {};
    try {
        const p = JSON.parse(raw) as { itemId?: string; itemName?: string };
        return {
            itemId: String(p.itemId || '').trim() || undefined,
            itemName: String(p.itemName || '').trim() || undefined,
        };
    } catch {
        return {};
    }
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
