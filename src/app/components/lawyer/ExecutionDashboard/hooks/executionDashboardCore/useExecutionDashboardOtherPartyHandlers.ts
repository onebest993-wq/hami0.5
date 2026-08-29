import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
import {
    resolveCreditorOtherPartyTrackDecision,
    submitCreditorOtherPartyTrackToDecisions,
} from '@/app/utils/otherPartyCreditorTrackDecisionUtils';
import { buildTimelineEventsFromOtherPartyActionLog } from '@/app/utils/otherPartyActionLogTimeline';
import {
    buildOtherPartyActionLogEntry,
    persistOtherPartyActionLogEntry,
} from '@/app/application/execution/followup/otherPartyActionLogPersist';

type UseExecutionDashboardOtherPartyHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    isRepresentingDebtor: boolean;
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openDecisionsModalWithBoot: (boot?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardOtherPartyHandlers({
    executionDataRef,
    executionData,
    executionId,
    decisionsStorageExecutionId,
    isRepresentingDebtor,
    timelineEvents,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    openDecisionsModalWithBoot,
    setTimelineEvents,
}: UseExecutionDashboardOtherPartyHandlersParams) {
    const handleOtherPartyActionLogOnly = useCallback(
        (input: { date: string; content: string }): { ok: boolean } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر',
                description: content,
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
            });
            showToast('تم تسجيل التحرك في السجل الزمني.', 'success');
            return { ok: true };
        },
        [nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleOtherPartyActionSubmitToDecisions = useCallback(
        (input: { date: string; content: string }): { ok: boolean; decisionId?: string; logEntryId?: string } => {
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

    const otherPartyTabSubmitHandler = useMemo(
        () =>
            isRepresentingDebtor
                ? handleOtherPartyActionLogOnly
                : handleOtherPartyActionSubmitToDecisions,
        [handleOtherPartyActionLogOnly, handleOtherPartyActionSubmitToDecisions, isRepresentingDebtor],
    );

    const otherPartyLogMigratedRef = useRef(false);
    useEffect(() => {
        if (!isRepresentingDebtor || otherPartyLogMigratedRef.current) return;
        const log = executionData?.other_party_actions_log;
        if (!Array.isArray(log) || log.length === 0) return;
        otherPartyLogMigratedRef.current = true;
        const { events: migrated, migratedIds } = buildTimelineEventsFromOtherPartyActionLog(
            log,
            timelineEvents,
            nextTimelineId,
        );
        if (migrated.length === 0) {
            persistExecutionMerge({ other_party_actions_log: [] });
            return;
        }
        const nextTimeline = [...migrated, ...timelineEvents];
        persistExecutionMerge({
            timelineEvents: nextTimeline,
            other_party_actions_log: [],
        });
        setTimelineEvents(nextTimeline);
        if (migratedIds.length > 0) {
            showToast(
                `نُقل ${migratedIds.length} سجل إلى السجل الزمني (تبويب تحركات الطرف الآخر).`,
                'info',
            );
        }
    }, [
        executionData?.other_party_actions_log,
        isRepresentingDebtor,
        nextTimelineId,
        persistExecutionMerge,
        setTimelineEvents,
        showToast,
        timelineEvents,
    ]);

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
            otherPartyTabSubmitHandler,
            openOtherPartyAppealsModal,
        }),
        [
            creditorOtherPartyTrackHandlers,
            openOtherPartyAppealsModal,
            otherPartyTabSubmitHandler,
        ],
    );
}
