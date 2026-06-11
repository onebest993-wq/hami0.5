import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    isEvictionProcedureRowPending,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { appendUnifiedLedgerExecutionExpense } from '@/app/utils/unifiedFundsLedgerStorage';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';

export const SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE =
    'طلب انتداب خبير لتقدير القيمة السوقية';
export const SPECIFIC_DELIVERY_MOVABLE_VALUATION_INITIAL_BODY =
    'طلب انتداب خبير لتقدير القيمة السوقية للشيء المنقول بعد تعذر التسليم أو هلاكه — يُستكمل بعد موافقة منفذ العدل.';
export const SPECIFIC_DELIVERY_MOVABLE_VALUATION_PAYLOAD_KIND =
    'specific_delivery_movable_valuation';

function newMovableValuationDecisionId(): string {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    const uuid = c?.randomUUID?.();
    if (uuid) return `spec_mov_val_${uuid}`;
    return `spec_mov_val_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function archiveSpecialFollowupHubRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: new Date().toISOString(),
        isArchived: true,
    };
}

export function sendInitialSpecificDeliveryMovableValuationRequest(input: {
    executionId: string | undefined;
    itemDescription?: string;
    supersedeCompletedHub?: boolean;
}): { ok: boolean; decisionId?: string } {
    try {
        let arr = readExecutorDecisionsArray(input.executionId);
        const existing = arr.find(
            (row) =>
                isSpecificDeliveryMovableValuationDecisionRow(row) &&
                !isExecutorHubRowSuperseded(row)
        );
        if (existing) {
            const pending = isEvictionProcedureRowPending(existing);
            if (pending) return { ok: false };
            if (input.supersedeCompletedHub) {
                arr = arr.map((row) =>
                    String((row as { id?: string }).id || '') === String(existing.id || '')
                        ? archiveSpecialFollowupHubRow(row as Record<string, unknown>)
                        : row
                );
            } else {
                const saved = Boolean(
                    String(existing.specificDeliveryMovableValuationSavedAt || '').trim()
                );
                const rejected = isExecutorRowRejectedAndFinal(existing);
                if (saved || !rejected) return { ok: false };
            }
        }
        const desc = String(input.itemDescription || '').trim();
        const body = desc
            ? `${SPECIFIC_DELIVERY_MOVABLE_VALUATION_INITIAL_BODY}\nوصف الشيء: ${desc}`
            : SPECIFIC_DELIVERY_MOVABLE_VALUATION_INITIAL_BODY;
        const decisionId = newMovableValuationDecisionId();
        const row = {
            id: decisionId,
            title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
            body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            appealRequestOrigin: 'creditor_side' as const,
            payloadJson: JSON.stringify({
                kind: SPECIFIC_DELIVERY_MOVABLE_VALUATION_PAYLOAD_KIND,
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

export function finalizeSpecificDeliveryMovableValuationRequest(input: {
    executionId: string | undefined;
    decisionId: string;
    itemDescription: string;
    expertFees: number;
    estimatedValue: number;
}): {
    ok: boolean;
    expenseRow?: SpecificDeliveryCaseExpenseRow;
    estimatedValue?: number;
} {
    const desc = String(input.itemDescription || '').trim();
    const fees = Math.max(0, Math.trunc(input.expertFees));
    const value = Math.max(0, Math.trunc(input.estimatedValue));
    const decisionId = String(input.decisionId || '').trim();
    if (!desc || fees <= 0 || value <= 0 || !decisionId) return { ok: false };

    const body =
        `${SPECIFIC_DELIVERY_MOVABLE_VALUATION_INITIAL_BODY}\n` +
        `وصف الشيء المراد تقديره: ${desc}\n` +
        `أجور الخبير التقديرية: ${fees.toLocaleString('ar-IQ')} د.ع.\n` +
        `القيمة المقدرة للشيء: ${value.toLocaleString('ar-IQ')} د.ع.`;

    const patched = patchExecutorDecisionRow(input.executionId, decisionId, {
        body,
        specificDeliveryMovableValuationSavedAt: new Date().toISOString(),
        specificDeliveryMovableValuationFees: fees,
        specificDeliveryMovableValuationAmount: value,
        specificDeliveryMovableValuationDescription: desc,
    });
    if (!patched) return { ok: false };

    const expenseReason = `أجور خبير تقدير قيمة منقول — ${desc}`;
    appendUnifiedLedgerExecutionExpense(input.executionId, fees, expenseReason);

    const expenseRow: SpecificDeliveryCaseExpenseRow = {
        id: `sd-exp-mov-${decisionId}`,
        amount: fees,
        note: expenseReason,
        requestTitle: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
        date: getLocalTodayYmd(),
        kind: 'movable_valuation_expert',
    };
    return { ok: true, expenseRow, estimatedValue: value };
}

export function isSpecificDeliveryMovableValuationDecisionRow(
    row: Record<string, unknown> | null | undefined
): boolean {
    if (!row) return false;
    if (String(row.requestKind || '') !== 'special_followup') return false;
    if (String(row.title || '').trim() === SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE) return true;
    const raw = String(row.payloadJson || '').trim();
    if (!raw) return false;
    try {
        const p = JSON.parse(raw) as { kind?: string };
        return p?.kind === SPECIFIC_DELIVERY_MOVABLE_VALUATION_PAYLOAD_KIND;
    } catch {
        return false;
    }
}
