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

export const SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE =
    'طلب انتداب خبير مساح / تسجيل عقاري';
/** @deprecated — توافق قرارات قديمة */
export const SPECIFIC_DELIVERY_SURVEYOR_TITLE = SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE;

export const SPECIFIC_DELIVERY_PROPERTY_EXPERT_INITIAL_BODY =
    'طلب انتداب خبير مساح / تسجيل عقاري للتحقق من حدود العقار ومطابقته للسند قبل التسليم — يُستكمل بعد موافقة منفذ العدل.';
export const SPECIFIC_DELIVERY_PROPERTY_EXPERT_PAYLOAD_KIND = 'specific_delivery_property_expert';
const LEGACY_SURVEYOR_PAYLOAD_KIND = 'specific_delivery_surveyor';

export type SpecificDeliveryCaseExpenseRow = {
    id: string;
    amount: number;
    note: string;
    requestTitle: string;
    date: string;
    kind: 'property_expert' | 'movable_valuation_expert';
};

function newPropertyExpertDecisionId(): string {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    const uuid = c?.randomUUID?.();
    if (uuid) return `spec_prop_exp_${uuid}`;
    return `spec_prop_exp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function archiveSpecialFollowupHubRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: new Date().toISOString(),
        isArchived: true,
    };
}

export function sendInitialSpecificDeliveryPropertyExpertRequest(input: {
    executionId: string | undefined;
    itemName?: string;
    supersedeCompletedHub?: boolean;
}): { ok: boolean; decisionId?: string } {
    try {
        let arr = readExecutorDecisionsArray(input.executionId);
        const existing = arr.find(
            (row) =>
                isSpecificDeliveryPropertyExpertDecisionRow(row) &&
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
                    String(existing.specificDeliveryPropertyExpertSavedAt || '').trim()
                );
                const rejected = isExecutorRowRejectedAndFinal(existing);
                if (saved || !rejected) return { ok: false };
            }
        }
        const item = String(input.itemName || '').trim();
        const body = item
            ? `${SPECIFIC_DELIVERY_PROPERTY_EXPERT_INITIAL_BODY}\nالشيء: ${item}`
            : SPECIFIC_DELIVERY_PROPERTY_EXPERT_INITIAL_BODY;
        const decisionId = newPropertyExpertDecisionId();
        const row = {
            id: decisionId,
            title: SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE,
            body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            appealRequestOrigin: 'creditor_side' as const,
            payloadJson: JSON.stringify({ kind: SPECIFIC_DELIVERY_PROPERTY_EXPERT_PAYLOAD_KIND }),
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

/** @deprecated */
export const sendInitialSpecificDeliverySurveyorRequest = sendInitialSpecificDeliveryPropertyExpertRequest;

export function finalizeSpecificDeliveryPropertyExpertRequest(input: {
    executionId: string | undefined;
    decisionId: string;
    registrationOffice: string;
    expertFees: number;
    itemName?: string;
}): { ok: boolean; expenseRow?: SpecificDeliveryCaseExpenseRow } {
    const office = String(input.registrationOffice || '').trim();
    const fees = Math.max(0, Math.trunc(input.expertFees));
    const decisionId = String(input.decisionId || '').trim();
    if (!office || fees <= 0 || !decisionId) return { ok: false };

    const item = String(input.itemName || '').trim();
    const body =
        `${SPECIFIC_DELIVERY_PROPERTY_EXPERT_INITIAL_BODY}\n` +
        (item ? `الشيء: ${item}\n` : '') +
        `دائرة التسجيل العقاري المختصة: ${office}\n` +
        `أجور الخبير: ${fees.toLocaleString('ar-IQ')} د.ع.`;

    const patched = patchExecutorDecisionRow(input.executionId, decisionId, {
        body,
        specificDeliveryPropertyExpertSavedAt: new Date().toISOString(),
        specificDeliveryPropertyExpertFees: fees,
        specificDeliveryPropertyExpertOffice: office,
    });
    if (!patched) return { ok: false };

    const expenseReason = `أجور خبير مساح / تسجيل عقاري — ${office}`;
    appendUnifiedLedgerExecutionExpense(input.executionId, fees, expenseReason);

    const expenseRow: SpecificDeliveryCaseExpenseRow = {
        id: `sd-exp-prop-${decisionId}`,
        amount: fees,
        note: expenseReason,
        requestTitle: SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE,
        date: getLocalTodayYmd(),
        kind: 'property_expert',
    };
    return { ok: true, expenseRow };
}

export function isSpecificDeliveryPropertyExpertDecisionRow(
    row: Record<string, unknown> | null | undefined
): boolean {
    if (!row) return false;
    if (String(row.requestKind || '') !== 'special_followup') return false;
    const title = String(row.title || '').trim();
    if (
        title === SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE ||
        title === 'طلب انتداب خبير مساح — تسليم شيء معين'
    ) {
        return true;
    }
    const raw = String(row.payloadJson || '').trim();
    if (!raw) return false;
    try {
        const p = JSON.parse(raw) as { kind?: string };
        return (
            p?.kind === SPECIFIC_DELIVERY_PROPERTY_EXPERT_PAYLOAD_KIND ||
            p?.kind === LEGACY_SURVEYOR_PAYLOAD_KIND
        );
    } catch {
        return false;
    }
}

/** @deprecated */
export const isSpecificDeliverySurveyorDecisionRow = isSpecificDeliveryPropertyExpertDecisionRow;
