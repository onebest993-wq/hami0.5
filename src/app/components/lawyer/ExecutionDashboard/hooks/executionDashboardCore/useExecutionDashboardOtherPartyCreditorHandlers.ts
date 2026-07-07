import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
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
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return { ok: false };
            }
            const now = new Date().toISOString();
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
            showToast('تم حفظ التحرك في السجل.', 'success');
            return { ok: true, decisionId };
        },
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, showToast],
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
