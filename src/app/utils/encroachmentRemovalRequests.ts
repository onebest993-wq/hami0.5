import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    getGoverningEncroachmentProcedureRowForMatch,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowActive,
    patchExecutorDecisionRowReliable,
    readExecutorDecisionsArray,
    supersedeEncroachmentRejectedHubRowsBeforeNewRequest,
    evictionProcedureRowsMatch,
    type EvictionRequestKind,
} from '@/app/utils/executorSeizureDecisionQueue';
import { supersedePriorExecutorHubRows } from '@/app/utils/executorRequestLifecycleMutations';
import {
    appendUnifiedLedgerExecutionExpense,
    type EncroachmentCaseExpenseRow,
} from '@/app/utils/unifiedFundsLedgerStorage';
import { parseAmount } from '@/app/utils/execution/amountInput';

export type { EncroachmentCaseExpenseRow };

export type EncroachmentRemovalWorkflowKey = 'surveyor_appointment' | 'machinery_entry_permit';

export const ENCROACHMENT_SURVEYOR_REQUEST_TITLE = 'طلب انتداب خبير مساح';
export const ENCROACHMENT_MACHINERY_REQUEST_TITLE = 'طلب إذن إدخال آليات وعمال للإزالة';
export const ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY = 'مديرية التسجيل العقاري';

export const ENCROACHMENT_INITIAL_SURVEYOR_BODY =
    'طلب انتداب خبير مساح (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.';
export const ENCROACHMENT_INITIAL_MACHINERY_BODY =
    'طلب إذن إدخال آليات وعمال للإزالة (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.';

function newEncroachmentDecisionId(): string {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    const uuid = c?.randomUUID?.();
    if (uuid) return `enc_req_${uuid}`;
    return `enc_req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** طلب إزالة تجاوز — بدون شروط تكرار أو قفل؛ يُعرَض في مركز القرارات كإجراء ميداني */
export function appendEncroachmentRemovalExecutorRequest(input: {
    executionId: string | undefined;
    title: string;
    body: string;
    encroachmentWorkflowKey: EncroachmentRemovalWorkflowKey;
    supersedeCompletedHub?: boolean;
}): string | null {
    try {
        let arr = readExecutorDecisionsArray(input.executionId);
        arr = supersedeEncroachmentRejectedHubRowsBeforeNewRequest(
            arr,
            input.encroachmentWorkflowKey
        );
        const allRows = arr as Record<string, unknown>[];
        const matchInput = { encroachmentWorkflowKey: input.encroachmentWorkflowKey };
        const hubMatches = (row: Record<string, unknown>) =>
            String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
            evictionProcedureRowsMatch(row, matchInput) &&
            isEvictionProcedureHubRow(row);
        const governing = getGoverningEncroachmentProcedureRowForMatch(
            allRows,
            input.encroachmentWorkflowKey,
        );
        if (governing?.id) {
            if (input.supersedeCompletedHub) {
                arr = supersedePriorExecutorHubRows(
                    allRows,
                    hubMatches,
                    new Date().toISOString(),
                ) as typeof arr;
            } else if (isEvictionProcedureRowActive(governing, allRows)) {
                return null;
            } else {
                arr = supersedePriorExecutorHubRows(
                    allRows,
                    hubMatches,
                    new Date().toISOString(),
                ) as typeof arr;
            }
        }
        const decisionId = newEncroachmentDecisionId();
        const row = {
            id: decisionId,
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'eviction_procedure' as EvictionRequestKind,
            appealRequestOrigin: 'creditor_side' as const,
            encroachmentWorkflowKey: input.encroachmentWorkflowKey,
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

export function parseEncroachmentExpenseAmount(raw: string): number {
    const n = parseAmount(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

export function buildEncroachmentCaseExpenseRow(input: {
    amount: number;
    note: string;
    requestTitle: string;
    workflowKey: EncroachmentRemovalWorkflowKey;
}): EncroachmentCaseExpenseRow {
    return {
        id: `enc_ex_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        amount: input.amount,
        note: input.note,
        requestTitle: input.requestTitle,
        workflowKey: input.workflowKey,
        date: getLocalTodayYmd(),
    };
}

/** إرسال مبدئي لمركز القرارات — دون مصاريف ودون حقول تفصيلية */
export function sendInitialEncroachmentRemovalRequest(input: {
    executionId: string | undefined;
    title: string;
    body: string;
    encroachmentWorkflowKey: EncroachmentRemovalWorkflowKey;
    supersedeCompletedHub?: boolean;
}): { ok: boolean; decisionId?: string } {
    const decisionId = appendEncroachmentRemovalExecutorRequest({
        executionId: input.executionId,
        title: input.title,
        body: input.body,
        encroachmentWorkflowKey: input.encroachmentWorkflowKey,
        supersedeCompletedHub: input.supersedeCompletedHub,
    });
    return decisionId ? { ok: true, decisionId } : { ok: false };
}

/** بعد موافقة المنفذ — تحديث نص الطلب + قيد مصاريف تنفيذية */
export function finalizeEncroachmentRemovalRequestDetails(input: {
    executionId: string | undefined;
    decisionId: string;
    title: string;
    body: string;
    encroachmentWorkflowKey: EncroachmentRemovalWorkflowKey;
    expenseAmount: number;
    expenseReason: string;
}): { ok: boolean; expenseRow?: EncroachmentCaseExpenseRow } {
    const amount = Math.max(0, Math.trunc(input.expenseAmount));
    const decisionId = String(input.decisionId || '').trim();
    if (amount <= 0 || !decisionId) return { ok: false };

    const patched = patchExecutorDecisionRowReliable(input.executionId, decisionId, {
        body: input.body,
        encroachmentRequestSavedAt: new Date().toISOString(),
    });
    if (!patched.ok) return { ok: false };

    const expenseRow = buildEncroachmentCaseExpenseRow({
        amount,
        note: input.expenseReason,
        requestTitle: input.title,
        workflowKey: input.encroachmentWorkflowKey,
    });
    appendUnifiedLedgerExecutionExpense(input.executionId, amount, input.expenseReason);

    return { ok: true, expenseRow };
}
