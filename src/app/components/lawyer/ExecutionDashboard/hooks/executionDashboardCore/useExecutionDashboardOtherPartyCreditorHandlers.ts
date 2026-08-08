import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
import {
    buildOtherPartyActionLogEntry,
    persistOtherPartyActionLogEntry,
} from '@/app/application/execution/followup/otherPartyActionLogPersist';
import {
    resolveCreditorOtherPartyTrackDecision,
    submitCreditorOtherPartyTrackToDecisions,
} from '@/app/utils/otherPartyCreditorTrackDecisionUtils';

type UseExecutionDashboardOtherPartyCreditorHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openDecisionsModalWithBoot: (boot?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
};

export function useExecutionDashboardOtherPartyCreditorHandlers({
    executionDataRef,
    executionId,
    decisionsStorageExecutionId,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    openDecisionsModalWithBoot,
}: UseExecutionDashboardOtherPartyCreditorHandlersParams) {
    const handleOtherPartyActionSubmitToDecisions = useCallback(
        (input: { date: string; content: string }): { ok: boolean; decisionId?: string } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content,
                appealRequestOrigin: 'debtor_side',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
                executionData: executionDataRef.current as Record<string, unknown> | null,
                otherPartyFollowup: true,
            });
            if (!decisionId) {
                showToast('تعذّر حفظ التحرك — أعد المحاولة', 'warning', { decisionsLink: true });
                return { ok: false };
            }
            try {
                SecureStoreService.flushHeavyPersistPending();
            } catch {
                /* ignore */
            }
            const now = new Date().toISOString();
            const logEntry = buildOtherPartyActionLogEntry({
                date: d,
                content,
                decisionRowId: decisionId,
            });
            const persisted = persistOtherPartyActionLogEntry(
                persistExecutionMerge,
                executionDataRef.current?.other_party_actions_log,
                logEntry,
            );
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر — قيد البت',
                description: `بتاريخ ${d}:\n\n${content}`,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            showToast(
                persisted
                    ? 'تم حفظ التحرك في السجل.'
                    : 'تم إنشاء بطاقة القرار — أعد المحاولة إن لم يظهر السجل.',
                persisted ? 'success' : 'warning',
                persisted ? undefined : { decisionsLink: true },
            );
            return { ok: true, decisionId, logEntryId: logEntry.id };
        },
        [
            decisionsStorageExecutionId,
            executionDataRef,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ],
    );

    const handleCreditorTrackSubmit = useCallback(
        (input: { optionId: string; label: string; date: string }): { ok: boolean; decisionId?: string } => {
            const storageId = String(
                decisionsStorageExecutionId || executionId || executionDataRef.current?.id || '',
            ).trim();
            const res = submitCreditorOtherPartyTrackToDecisions({
                executionId: storageId || undefined,
                optionId: input.optionId,
                label: input.label,
                requestDate: input.date,
                executionData: executionDataRef.current as Record<string, unknown> | null,
                otherPartyFollowup: true,
            });
            if (!res.ok) {
                showToast('تعذّر إنشاء البطاقة — قد يوجد طلب مماثل قيد البت.', 'warning', {
                    decisionsLink: true,
                });
                return { ok: false };
            }
            pushTimelineEvent({
                id: nextTimelineId(),
                date: input.date,
                timestamp: new Date().toISOString(),
                title: `${input.label} — قيد البت`,
                description: 'تقدّم وكيل الدائن — متابعة من جانب موكّل المدين.',
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
                metadata: {
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                    otherPartyTrackOptionId: input.optionId,
                },
            });
            showToast('تم إنشاء بطاقة في القرارات والطعون.', 'success', { decisionsLink: true });
            return res;
        },
        [decisionsStorageExecutionId, executionDataRef, executionId, nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleCreditorTrackResolve = useCallback(
        (input: { decisionId: string; resolution: 'approved' | 'rejected' }): boolean => {
            const ok = resolveCreditorOtherPartyTrackDecision({
                executionId: decisionsStorageExecutionId,
                decisionId: input.decisionId,
                resolution: input.resolution,
            });
            if (!ok) {
                showToast('تعذّر تحديث بطاقة القرار.', 'warning');
                return false;
            }
            showToast(
                input.resolution === 'approved' ? 'سُجّلت موافقة المنفذ.' : 'سُجّل رفض المنفذ.',
                'success',
            );
            return true;
        },
        [decisionsStorageExecutionId, showToast],
    );

    const handleCreditorTrackOpenDecision = useCallback(
        (decisionId: string) => {
            openDecisionsModalWithBoot({
                tab: 'current',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot],
    );

    const creditorOtherPartyTrackHandlers = useMemo(
        () => ({
            onSubmitCreditorRequest: handleCreditorTrackSubmit,
            onResolveCreditorDecision: handleCreditorTrackResolve,
            showMessage: (message: string, type?: 'warning' | 'success') =>
                showToast(message, type ?? 'info'),
            onOpenDecision: handleCreditorTrackOpenDecision,
        }),
        [
            handleCreditorTrackOpenDecision,
            handleCreditorTrackResolve,
            handleCreditorTrackSubmit,
            showToast,
        ],
    );

    const openOtherPartyAppealsModal = useCallback(
        (decisionId?: string) => {
            openDecisionsModalWithBoot({
                tab: 'previous',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot],
    );

    return useMemo(
        () => ({
            creditorOtherPartyTrackHandlers,
            otherPartyTabSubmitHandler: handleOtherPartyActionSubmitToDecisions,
            openOtherPartyAppealsModal,
        }),
        [
            creditorOtherPartyTrackHandlers,
            handleOtherPartyActionSubmitToDecisions,
            openOtherPartyAppealsModal,
        ],
    );
}
