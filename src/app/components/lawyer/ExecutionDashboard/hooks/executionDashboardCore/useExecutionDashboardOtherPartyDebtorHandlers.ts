import { useCallback, useEffect, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { buildTimelineEventsFromOtherPartyActionLog } from '@/app/utils/otherPartyActionLogTimeline';

type UseExecutionDashboardOtherPartyDebtorHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardOtherPartyDebtorHandlers({
    executionData,
    timelineEvents,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: UseExecutionDashboardOtherPartyDebtorHandlersParams) {
    const otherPartyTabSubmitHandler = useCallback(
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

    const otherPartyLogMigratedRef = useRef(false);
    useEffect(() => {
        if (otherPartyLogMigratedRef.current) return;
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
        nextTimelineId,
        persistExecutionMerge,
        setTimelineEvents,
        showToast,
        timelineEvents,
    ]);

    return useMemo(
        () => ({
            creditorOtherPartyTrackHandlers: undefined,
            otherPartyTabSubmitHandler,
            openOtherPartyAppealsModal: undefined,
        }),
        [otherPartyTabSubmitHandler],
    );
}
