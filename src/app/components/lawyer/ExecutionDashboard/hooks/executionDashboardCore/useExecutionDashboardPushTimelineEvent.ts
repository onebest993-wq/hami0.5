// @ts-nocheck
/** Phase C — دفع حدث للسجل الزمني مع دمج/تخزين/مزامنة Supabase */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    useExecutionDashboardStore,
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    isInabaSubFileId,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
} from '@/app/stores';
import { mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';

export type UseExecutionDashboardPushTimelineEventParams = {
    executionId: string | undefined;
    parentDossierId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardPushTimelineEvent({
    executionId,
    parentDossierId,
    executionDataRef,
    persistExecutionMerge,
    setTimelineEvents,
}: UseExecutionDashboardPushTimelineEventParams) {
    const pushTimelineEvent = useCallback(
        (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => {
            const storeSnap = useExecutionDashboardStore.getState();
            const subId = String(storeSnap.activeSubFileId || '').trim();
            const parentForStamp = String(
                storeSnap.delegationParentFileId || parentDossierId || executionId || '',
            ).trim();
            const eventToApply =
                subId && isInabaSubFileId(subId) && parentForStamp
                    ? stampInabaTimelineEventMetadata(event, subId, parentForStamp)
                    : parentForStamp
                      ? stampParentTimelineEventMetadata(event, parentForStamp)
                      : event;
            setTimelineEvents((prev) => {
                const threadKey =
                    event.metadata &&
                    typeof (event.metadata as Record<string, unknown>).timelineThreadKey === 'string'
                        ? String((event.metadata as Record<string, unknown>).timelineThreadKey)
                        : null;
                let next: TimelineEvent[];
                if (threadKey) {
                    const idx = prev.findIndex(
                        (e) =>
                            e.metadata &&
                            String((e.metadata as Record<string, unknown>).timelineThreadKey ?? '') ===
                                threadKey,
                    );
                    if (idx >= 0) {
                        const prevRow = prev[idx];
                        next = [...prev];
                        next[idx] = {
                            ...prevRow,
                            ...eventToApply,
                            id: prevRow.id,
                            metadata: { ...prevRow.metadata, ...eventToApply.metadata },
                        };
                    } else {
                        next = mergeSimilarRecentTimelineEvent(prev, eventToApply);
                    }
                } else {
                    next = mergeSimilarRecentTimelineEvent(prev, eventToApply);
                }
                if (subId && isInabaSubFileId(subId)) {
                    next = filterTimelineEventsForInabaDossier(next, subId);
                } else if (parentDossierId) {
                    next = filterTimelineEventsForParentDossier(next, parentDossierId);
                }
                const mergePatch = options?.mergePatch ?? {};
                queueMicrotask(() => {
                    persistExecutionMerge({ ...mergePatch, timelineEvents: next });
                    const execId = String(executionDataRef.current?.id ?? executionId ?? '');
                    if (!execId || execId === 'undefined') return;
                    if (event.snapshot == null) return;
                    const mergedRow =
                        next.find((e) => e.id === event.id) ??
                        next.find((e) => e.snapshot === event.snapshot) ??
                        next[0];
                    const rowForRemote = mergedRow
                        ? { ...mergedRow, id: event.id, snapshot: event.snapshot }
                        : { ...event };
                    void import('@/app/services/timelineEventsSupabase')
                        .then(({ insertTimelineEventToSupabase }) =>
                            insertTimelineEventToSupabase({
                                executionFileId: execId,
                                event: rowForRemote,
                                snapshotData: event.snapshot,
                            }),
                        )
                        .catch(() => {});
                });
                return next;
            });
        },
        [executionId, persistExecutionMerge, parentDossierId, executionDataRef, setTimelineEvents],
    );

    return { pushTimelineEvent };
}
