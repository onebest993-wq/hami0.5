/**
 * Special-followup append helpers for the executor seizure decision queue.
 */

import { COMMUNICATION_JOURNAL_TITLE_KEYWORD } from '@/app/utils/executionDomainIsolation';
import {
    assertDomainGate,
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    newExecutorDecisionId,
    persistExecutorDecisionsArray,
    readActiveExecutorDecisionsForMutate,
} from '@/app/utils/executorSeizureDecisionQueueTypes';

export function appendSpecialFollowupRequest(input: {
    executionId: string | undefined;
    requestDate: string;
    content: string;
    /** طلبات «تحركات الطرف الآخر» تُحسب لصالح المدين في مسار الطعن */
    appealRequestOrigin?: 'creditor_side' | 'debtor_side' | 'executor_side';
    /** عنوان صف مركز القرارات (افتراضي: طلب تنفيذي خاص) */
    decisionTitle?: string;
    /** حمولة منظمة لطلبات خاصة (مثل التوحيد) */
    payloadJson?: string;
    executionData?: Record<string, unknown> | null;
    /** مخاطبات السجل — تتجاوز بوابة الاختصاص */
    communicationJournal?: boolean;
    /** نماذج الطلبات — تتجاوز بوابة الاختصاص */
    adminRequestsTab?: boolean;
    /** تحركات الطرف الآخر — تتجاوز بوابة الاختصاص */
    otherPartyFollowup?: boolean;
}): string | null {
    const titleTrim = String(input.decisionTitle ?? '').trim();
    const resolvedTitle = titleTrim || 'طلب تنفيذي خاص';
    if (
        !assertDomainGate(input.executionId, 'special_followup', {
            executionData: input.executionData,
            decisionTitle: resolvedTitle,
            communicationJournal: input.communicationJournal,
            adminRequestsTab: input.adminRequestsTab,
            otherPartyFollowup: input.otherPartyFollowup,
            payloadJson: input.payloadJson,
        })
    ) {
        return null;
    }
    const trimmed = input.content.trim();
    const body = `بتاريخ ${input.requestDate}:\n\n${trimmed}`;
    const rowId = newExecutorDecisionId('special_followup');
    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId, input.executionData);
        const dupPending = arr.some((r) => {
            const pending = (r as any).executorOutcome === 'pending' || (r as any).executorOutcome === undefined;
            if (!pending) return false;
            if (String((r as any).requestKind || '') !== 'special_followup') return false;
            const t = String((r as any).title || '').trim();
            const b = String((r as any).body || '').trim();
            const p = String((r as any).payloadJson || '').trim();
            return t === resolvedTitle && b === body && p === String(input.payloadJson || '').trim();
        });
        if (dupPending) {
            dispatchDecisionsReload();
            return null;
        }
        const row = {
            id: rowId,
            title: resolvedTitle,
            body,
            date: input.requestDate,
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            ...(String(input.payloadJson || '').trim() ? { payloadJson: String(input.payloadJson).trim() } : {}),
            ...(input.appealRequestOrigin ? { appealRequestOrigin: input.appealRequestOrigin } : {}),
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr, input.executionData);
        dispatchDecisionsReload();
        return rowId;
    } catch {
        return null;
    }
}

/**
 * تسجيل مخاطبة في سجل محضر المتابعة — بدون بوابة special_followup (كل الاختصاصات).
 */
export function appendCommunicationJournalRequest(input: {
    executionId: string | undefined;
    letterDate: string;
    content: string;
    directorate: string;
    executionData?: Record<string, unknown> | null;
}): string | null {
    const letterDate = String(input.letterDate || '').trim();
    const directorate = String(input.directorate || '').trim();
    const trimmed = String(input.content || '').trim();
    if (!letterDate || !directorate || !trimmed) return null;

    const title = `${COMMUNICATION_JOURNAL_TITLE_KEYWORD} — ${directorate}`;
    const body = `بتاريخ ${letterDate}:\n\n${trimmed}`;
    const rowId = newExecutorDecisionId('special_followup');

    try {
        const arr = readActiveExecutorDecisionsForMutate(input.executionId, input.executionData);
        const dupPending = arr.some((r) => {
            const pending =
                (r as any).executorOutcome === 'pending' || (r as any).executorOutcome === undefined;
            if (!pending) return false;
            if (String((r as any).requestKind || '') !== 'special_followup') return false;
            const t = String((r as any).title || '').trim();
            const b = String((r as any).body || '').trim();
            return t === title && b === body;
        });
        if (dupPending) {
            dispatchDecisionsReload();
            return null;
        }

        const row = {
            id: rowId,
            title,
            body,
            date: letterDate,
            appealStatus: 'pending' as const,
            executorOutcome: 'pending' as const,
            requestKind: 'special_followup' as const,
            deputationTargetDirectorate: directorate,
            ...executorDecisionRowHubDefaults(),
        };
        arr.unshift(row);
        persistExecutorDecisionsArray(input.executionId, arr, input.executionData);
        dispatchDecisionsReload();
        return rowId;
    } catch {
        return null;
    }
}
