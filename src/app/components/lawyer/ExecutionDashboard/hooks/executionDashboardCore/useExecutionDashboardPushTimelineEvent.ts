// @ts-nocheck
/** Phase C — دفع حدث للسجل الزمني مع دمج/تخزين/مزامنة Supabase */
import { useCallback, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
    isInabaSubFileId,
} from '@/app/stores/executionDashboardStore';
import { insertTimelineEventWithThreadReplace } from '@/app/utils/timelineDedup';

export type UseExecutionDashboardPushTimelineEventParams = {
    executionId: string | undefined;
    parentDossierId: string | undefined;
    delegationParentFileId?: string | null | undefined;
    activeSubFileId?: string | null | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    timelineEventsRef?: MutableRefObject<TimelineEvent[]>;
};

export function useExecutionDashboardPushTimelineEvent({
    executionId,
    parentDossierId,
    delegationParentFileId,
    activeSubFileId,
    executionDataRef,
    persistExecutionMerge,
    setTimelineEvents,
    timelineEventsRef,
}: UseExecutionDashboardPushTimelineEventParams) {
    const pushTimelineEvent = useCallback(
        (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }): boolean => {
            const base = executionDataRef.current;
            if (!base) return false;

            const subId = String(activeSubFileId || '').trim();
            const parentForStamp = String(delegationParentFileId || parentDossierId || executionId || '').trim();
            const eventToApply =
                subId && isInabaSubFileId(subId) && parentForStamp
                    ? stampInabaTimelineEventMetadata(event, subId, parentForStamp)
                    : parentForStamp
                      ? stampParentTimelineEventMetadata(event, parentForStamp)
                      : event;
            const prevEvents = timelineEventsRef?.current ?? [];
            const nextEvents = insertTimelineEventWithThreadReplace(prevEvents, eventToApply);
            if (timelineEventsRef) {
                timelineEventsRef.current = nextEvents;
            }
            setTimelineEvents(nextEvents);
            const mergePatch = options?.mergePatch ?? {};
            const persisted = persistExecutionMerge({ ...mergePatch, timelineEvents: nextEvents });
            if (persisted === false) return false;

            const execId = String(executionDataRef.current?.id ?? executionId ?? '');
            if (execId && execId !== 'undefined' && event.snapshot != null) {
                queueMicrotask(() => {
                    const mergedRow =
                        nextEvents.find((e) => e.id === event.id) ??
                        nextEvents.find((e) => e.snapshot === event.snapshot) ??
                        nextEvents[0];
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
            }
            return true;
        },
        [
            activeSubFileId,
            delegationParentFileId,
            executionId,
            persistExecutionMerge,
            parentDossierId,
            executionDataRef,
            setTimelineEvents,
            timelineEventsRef,
        ],
    );

    return useMemo(() => ({ pushTimelineEvent }), [pushTimelineEvent]);
}
