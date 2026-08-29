/**
 * Eviction / party-death append helpers for the executor decision queue.
 */

import { type EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    formatCreditorPartyDeathSummaryAr,
    stringifyCreditorPartyDeathPayload,
    type CreditorPartyDeathStoredAction,
} from '@/app/utils/creditorPartyDeathPersistence';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isExecutorRowEffectivelyApproved } from '@/app/utils/executorDecisionRowApproval';
import {
    type EvictionRequestKind,
    assertDomainGate,
    creditorPartyDeathDecisionTitle,
    dispatchDecisionsReload,
    evictionProcedureRowsMatch,
    executorDecisionRowHubDefaults,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowPending,
    newExecutorDecisionId,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    stringifyDebtorPartyDeathPayload,
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import {
    evictionBranchGateInput,
    getDebtorHeirSubstitutionRequestStatus,
    getGoverningEvictionProcedureRowForNewRequest,
    hasPendingCreditorPartyDeathRequest,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isExecutorHubRowInactiveForGoverning,
} from '@/app/utils/executorSeizureDecisionQueueRead';

export function appendCreditorPartyDeathRequest(input: {
    executionId: string | undefined;
    action: CreditorPartyDeathStoredAction;
    creditorNameSnapshot: string;
    heirNames: string[];
}): { ok: boolean; decisionId?: string } {
    if (hasPendingCreditorPartyDeathRequest(input.executionId)) {
        dispatchDecisionsReload();
        return { ok: false };
    }
    const decisionId = newExecutorDecisionId('creditor_death_req');
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const storedPayload = {
            action: input.action,
            creditorNameSnapshot: input.creditorNameSnapshot,
            heir_names: input.heirNames.filter((s) => /\S/.test(String(s))),
        };
        const payloadJson = stringifyCreditorPartyDeathPayload(storedPayload);
        const row = {
            id: decisionId,
            title: creditorPartyDeathDecisionTitle(input.action),
            body: formatCreditorPartyDeathSummaryAr(storedPayload),
            creditorPartyDeathPayloadJson: payloadJson,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'creditor_party_death' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** طلب «إحلال ورثة المدين» إلى المنفذ (لا أثر على ملف التنفيذ قبل البت). */
export function appendDebtorHeirSubstitutionRequest(input: {
    executionId: string | undefined;
    debtorNameSnapshot: string;
}): { ok: boolean; decisionId?: string } {
    const status = getDebtorHeirSubstitutionRequestStatus(input.executionId);
    if (status === 'pending') {
        dispatchDecisionsReload();
        return { ok: false };
    }
    const decisionId = newExecutorDecisionId('debtor_heir_req');
    const payloadJson = stringifyDebtorPartyDeathPayload({
        action: 'heir_substitution',
        debtorNameSnapshot: input.debtorNameSnapshot,
        heir_names: [],
    });
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const row = {
            id: decisionId,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            body: `المدين: ${input.debtorNameSnapshot || 'المدين'}.`,
            debtorPartyDeathPayloadJson: payloadJson,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'debtor_party_death' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendEvictionExecutorRequest(input: {
    executionId: string | undefined;
    title: string;
    body: string;
    requestKind: EvictionRequestKind;
    /** يُملأ لطلبات التخلية الميدانية لتمكين المسار الآلي بعد قبول المنفذ */
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    /** بعد اكتمال مسار سابق — أرشفة الصف الحاكم وتقديم طلب hub جديد */
    supersedeCompletedHub?: boolean;
    /** لقطة الإضبارة الفعلية (مهمة عند تخزين القرارات تحت معرّف الأب) */
    executionData?: Record<string, unknown> | null;
}): boolean {
    if (!assertDomainGate(input.executionId, input.requestKind, { executionData: input.executionData })) {
        return false;
    }
    try {
        let arr: Record<string, unknown>[] = readActiveExecutorDecisionsForMutate(
            input.executionId,
            input.executionData
        );

        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;

        if (input.requestKind === 'lawyer_fee_payout') {
            const alreadyApproved = arr.some(
                (x) =>
                    (x as { requestKind?: string }).requestKind === 'lawyer_fee_payout' &&
                    isExecutorRowEffectivelyApproved(x as Record<string, unknown>)
            );
            if (alreadyApproved) {
                dispatchDecisionsReload();
                return false;
            }
            const dup = arr.some(
                (x) =>
                    isPending(x as Record<string, unknown>) &&
                    (x as { requestKind?: string }).requestKind === 'lawyer_fee_payout'
            );
            if (dup) {
                dispatchDecisionsReload();
                return false;
            }
        }

        if (input.requestKind === 'unified_collection') {
            const dupPending = arr.some(
                (x) =>
                    isPending(x as Record<string, unknown>) &&
                    (x as { requestKind?: string }).requestKind === 'unified_collection'
            );
            if (dupPending) {
                dispatchDecisionsReload();
                return false;
            }
        }

        if (input.requestKind === 'eviction_procedure') {
            const wf = String(input.evictionWorkflowKey || '').trim();
            const title = String(input.title || '').trim();
            const matchInput = { evictionWorkflowKey: wf, title };

            arr = supersedeRejectedFinalExecutorHubRows(arr, (row) => {
                if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                    return false;
                }
                return evictionProcedureRowsMatch(row, matchInput) && isEvictionProcedureHubRow(row);
            });

            const hubMatches = (row: Record<string, unknown>) =>
                String((row as { requestKind?: string }).requestKind || '') === 'eviction_procedure' &&
                evictionProcedureRowsMatch(row, matchInput) &&
                isEvictionProcedureHubRow(row);

            const allRows = arr as Record<string, unknown>[];
            const gateInput = evictionBranchGateInput(matchInput);
            const governing = getGoverningEvictionProcedureRowForNewRequest(allRows, matchInput);
            const governingPending =
                governing?.id &&
                !isExecutorHubRowInactiveForGoverning(governing, allRows) &&
                isEvictionProcedureRowPending(governing) &&
                isEvictionProcedureRowActive(governing, allRows);
            if (governingPending) {
                dispatchDecisionsReload();
                return false;
            }

            if (input.supersedeCompletedHub) {
                arr = supersedePriorExecutorHubRows(arr, hubMatches);
            } else if (governing?.id) {
                if (isEvictionBranchBlockingNewRequest(allRows, gateInput)) {
                    dispatchDecisionsReload();
                    return false;
                }
                if (isEvictionBranchResendBlocked(allRows, gateInput)) {
                    dispatchDecisionsReload();
                    return false;
                }
                if (!isEvictionProcedureRowActive(governing, allRows)) {
                    arr = supersedePriorExecutorHubRows(arr, hubMatches);
                }
            }

            arr = arr.filter((x) => {
                const row = x as Record<string, unknown>;
                if (!isPending(row)) return true;
                if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                    return true;
                }
                return !evictionProcedureRowsMatch(row, matchInput);
            });
        }

        const row = {
            id: newExecutorDecisionId('eviction_req'),
            title: input.title,
            body: input.body,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: input.requestKind,
            appealRequestOrigin: 'creditor_side' as const,
            ...(input.evictionWorkflowKey
                ? { evictionWorkflowKey: input.evictionWorkflowKey }
                : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr, input.executionData);
        return true;
    } catch {
        return false;
    }
}
