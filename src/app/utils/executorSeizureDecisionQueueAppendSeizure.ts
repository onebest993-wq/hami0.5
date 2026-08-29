/**
 * Seizure / funds / guarantor append helpers for the executor decision queue.
 */

import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    type SeizureRequestSubtype,
    type SeizureRequestTarget,
    assertDomainGate,
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    isGuarantorRequestDecisionRow,
    newExecutorDecisionId,
    parseSeizedMovableIdFromPayloadJson,
    parseSeizedPropertyIdFromPayloadJson,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
    readSeizureRequestTarget,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorSeizureDecisionQueueTypes';
import { isExecutorHubRowInactiveForGoverning } from '@/app/utils/executorSeizureDecisionQueueRead';

/** طلب كفيل ضامن من محضر المتابعة — يُعرَض على منفذ العدل للبتّ */
export function appendGuarantorFollowupRequest(input: {
    executionId: string | undefined;
    /** @deprecated يُتجاهل في النص المعروض؛ يُحفَظ التوافق مع الاستدعاءات القديمة */
    debtorName?: string;
}): { ok: boolean; decisionId?: string } {
    if (!assertDomainGate(input.executionId, 'guarantor_request')) {
        return { ok: false };
    }
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => isPending(x) && isGuarantorRequestDecisionRow(x));
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('guarantor_req');
        const row = {
            id: decisionId,
            title: 'طلب إدخال كفيل ضامن',
            body: 'قدم المدين طلباً لإدخال كفيل ضامن في الإضبارة.',
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'guarantor_request' as const,
            /** طلب من مسار المدين — الطعن يُنسَب للمدين عند الرفض وللمحامي عند القبول */
            appealRequestOrigin: 'debtor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

/** طلب صرف الأمانات التنفيذية من محضر المتابعة — يُعرَض على منفذ العدل للبتّ */
export function appendTrustDisburseRequest(input: {
    executionId: string | undefined;
}): { ok: boolean; decisionId?: string } {
    if (!assertDomainGate(input.executionId, 'trust_disburse')) {
        return { ok: false };
    }
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => isPending(x) && x.requestKind === 'trust_disburse');
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('trust_disburse');
        const row = {
            id: decisionId,
            title: 'طلب صرف الأمانات التنفيذية',
            body: 'طلب صرف مبلغ من رصيد الأمانات التنفيذية وفقاً للإجراءات القانونية، مع بيان المبلغ وجهة الصرف وإرفاق السند عند اللزوم.',
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'trust_disburse' as const,
            appealRequestOrigin: 'creditor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendThirdPartyFundsReceivedDecision(input: {
    executionId: string | undefined;
    thirdPartySeizureId: string;
    thirdPartyName: string;
    transferredAmountIqd: number;
}): { ok: boolean; decisionId?: string } {
    const seizureId = String(input.thirdPartySeizureId || '').trim();
    if (!seizureId) return { ok: false };
    const amt = Math.max(0, Math.trunc(Number(input.transferredAmountIqd || 0)));
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false };
    if (!assertDomainGate(input.executionId, 'third_party_funds_received')) {
        return { ok: false };
    }
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId);
        const isPending = (x: Record<string, unknown>) =>
            x.executorOutcome === 'pending' || x.executorOutcome === undefined;
        const dup = arr.some((x) => {
            if (!isPending(x)) return false;
            if (String(x.requestKind || '') !== 'third_party_funds_received') return false;
            const p = String((x as any).payloadJson || '').trim();
            if (!p) return false;
            try {
                const v = JSON.parse(p) as any;
                return String(v?.thirdPartySeizureId || '').trim() === seizureId;
            } catch {
                return false;
            }
        });
        if (dup) {
            dispatchDecisionsReload();
            return { ok: false };
        }
        const decisionId = newExecutorDecisionId('third_party_funds_received');
        const thirdPartyName = String(input.thirdPartyName || '').trim() || 'جهة ثالثة';
        const row = {
            id: decisionId,
            title: 'طلب تثبيت استلام وتحويل أموال محجوزة لدى الغير',
            body: `طلب تثبيت استلام مبلغ محجوز لدى الغير وتحويله إلى الإضبارة.\nالجهة: ${thirdPartyName}\nالمبلغ: ${amt.toLocaleString(
                'ar-IQ'
            )} د.ع.`,
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'third_party_funds_received' as const,
            payloadJson: JSON.stringify({
                thirdPartySeizureId: seizureId,
                thirdPartyName,
                transferredAmountIqd: amt,
            }),
            appealRequestOrigin: 'creditor_side' as const,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return { ok: true, decisionId };
    } catch {
        return { ok: false };
    }
}

export function appendPendingExecutorSeizureDecision(input: {
    executionId: string | undefined;
    requestTitle: string;
    requestBody: string;
    seizureSubtype?: SeizureRequestSubtype;
    seizureTarget?: SeizureRequestTarget;
    seizurePayloadJson?: string;
}): string | null {
    if (!assertDomainGate(input.executionId, 'seizure')) {
        return null;
    }
    const decisionId = newExecutorDecisionId('seizure_req');
    try {
        const targetB = String(input.seizureTarget || 'debtor').trim() as SeizureRequestTarget;
        const subtypeB = String(input.seizureSubtype || '').trim();
        let arr = readActiveExecutorDecisionsForMutate(input.executionId);
        arr = supersedeRejectedFinalExecutorHubRows(arr, (r) => {
            if (String(r.requestKind || '') !== 'seizure') return false;
            if (readSeizureRequestTarget(r) !== targetB) return false;
            const a = String(r.seizureSubtype || '').trim();
            if (subtypeB && a && a !== subtypeB) return false;
            if (subtypeB && !a) return false;
            const t1 = String(r.title || '').trim();
            const t2 = String(input.requestTitle || '').trim();
            if (subtypeB) return true;
            if (!t1 || !t2) return false;
            return t1 === t2;
        });

        const inputMovableId = parseSeizedMovableIdFromPayloadJson(input.seizurePayloadJson);
        const inputPropertyId = parseSeizedPropertyIdFromPayloadJson(input.seizurePayloadJson);
        const dup = arr.find((r) => {
            if (isExecutorHubRowInactiveForGoverning(r, arr)) return false;
            if (String(r.requestKind || '') !== 'seizure') return false;
            const out = String((r as any).executorOutcome ?? 'pending');
            if (out !== 'pending') return false;
            if (readSeizureRequestTarget(r) !== targetB) return false;
            const a = String((r as any).seizureSubtype || '').trim();
            const b = String(input.seizureSubtype || '').trim();
            if (b && a && a !== b) return false;
            if (b && !a) return false;
            const rowMovableId = parseSeizedMovableIdFromPayloadJson(
                String((r as any).seizurePayloadJson || '')
            );
            const rowPropertyId = parseSeizedPropertyIdFromPayloadJson(
                String((r as any).seizurePayloadJson || '')
            );
            if (inputMovableId && rowMovableId && inputMovableId !== rowMovableId) return false;
            if (inputPropertyId && rowPropertyId && inputPropertyId !== rowPropertyId) return false;
            const t1 = String(r.title || '').trim();
            const t2 = String(input.requestTitle || '').trim();
            if (b) {
                if (inputMovableId || rowMovableId) {
                    return Boolean(inputMovableId) && inputMovableId === rowMovableId;
                }
                if (inputPropertyId || rowPropertyId) {
                    return Boolean(inputPropertyId) && inputPropertyId === rowPropertyId;
                }
                return true;
            }
            if (!t1 || !t2) return false;
            return t1 === t2;
        });
        if (dup && String((dup as any).id || '').trim()) {
            return null;
        }

        const row = {
            id: decisionId,
            title: input.requestTitle,
            body: input.requestBody,
            ...(String(input.seizurePayloadJson || '').trim()
                ? { seizurePayloadJson: String(input.seizurePayloadJson || '').trim() }
                : {}),
            date: getLocalTodayYmd(),
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'seizure' as const,
            appealRequestOrigin: 'creditor_side' as const,
            ...(input.seizureSubtype ? { seizureSubtype: input.seizureSubtype } : {}),
            ...(input.seizureTarget ? { seizureTarget: input.seizureTarget } : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr);
        return decisionId;
    } catch {
        return null;
    }
}
