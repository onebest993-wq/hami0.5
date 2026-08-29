import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildOtherPartyActionLogEntry,
    persistOtherPartyActionLogEntry,
} from '@/app/application/execution/followup/otherPartyActionLogPersist';

export type SubmitOtherPartyFollowupActionInput = {
    date: string;
    content: string;
    decisionsStorageExecutionId: string | undefined;
    existingLog: OtherPartyActionLogEntry[] | null | undefined;
    executionData?: Record<string, unknown> | null;
    persistExecutionMerge?: (patch: Record<string, unknown>) => boolean | void;
    isRepresentingDebtor?: boolean;
    showToast?: (message: string, type?: string, opts?: Record<string, unknown>) => void;
};

function dispatchDecisionsReload(): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(DECISIONS_RELOAD_EVENT));
    } catch {
        /* ignore */
    }
}

export function submitOtherPartyFollowupAction(
    input: SubmitOtherPartyFollowupActionInput,
): { ok: boolean; decisionId?: string; logEntryId?: string } {
    const d = String(input.date || '').trim();
    const content = String(input.content || '').trim();
    if (!d || !content) {
        input.showToast?.('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
        return { ok: false };
    }

    if (input.isRepresentingDebtor) {
        const logEntry = buildOtherPartyActionLogEntry({
            date: d,
            content,
        });
        const persisted = persistOtherPartyActionLogEntry(
            input.persistExecutionMerge,
            input.existingLog,
            logEntry,
        );
        input.showToast?.(
            persisted
                ? 'تم تسجيل التحرك في السجل الزمني.'
                : 'تعذّر حفظ التحرك — أعد المحاولة',
            persisted ? 'success' : 'warning',
        );
        return persisted ? { ok: true, logEntryId: logEntry.id } : { ok: false };
    }

    const decisionId = appendSpecialFollowupRequest({
        executionId: input.decisionsStorageExecutionId,
        requestDate: d,
        content,
        appealRequestOrigin: 'debtor_side',
        decisionTitle: 'تحرك الطرف الآخر — قيد البت',
        executionData: input.executionData,
        otherPartyFollowup: true,
    });
    if (!decisionId) {
        input.showToast?.('تعذّر حفظ التحرك — أعد المحاولة', 'warning', { decisionsLink: true });
        return { ok: false };
    }
    try {
        SecureStoreService.flushHeavyPersistPending();
    } catch {
        /* ignore */
    }

    const logEntry = buildOtherPartyActionLogEntry({
        date: d,
        content,
        decisionRowId: decisionId,
    });
    const persisted = persistOtherPartyActionLogEntry(
        input.persistExecutionMerge,
        input.existingLog,
        logEntry,
    );

    dispatchDecisionsReload();

    input.showToast?.(
        persisted
            ? 'تم حفظ التحرك في السجل.'
            : 'تم إنشاء بطاقة القرار — أعد المحاولة إن لم يظهر السجل.',
        persisted ? 'success' : 'warning',
        persisted ? undefined : { decisionsLink: true },
    );

    return { ok: true, decisionId, logEntryId: logEntry.id };
}
