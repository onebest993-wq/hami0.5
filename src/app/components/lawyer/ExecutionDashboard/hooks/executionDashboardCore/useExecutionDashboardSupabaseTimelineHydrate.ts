import { useEffect } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { isInabaSubFileId } from '@/app/stores/executionDashboardStore';

export function useExecutionDashboardSupabaseTimelineHydrate({
    executionDataId,
    setTimelineEvents,
}: {
    executionDataId: string | undefined;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
}) {
    useEffect(() => {
        const id = executionDataId;
        if (!id || id === 'undefined' || isInabaSubFileId(id)) return;

        let cancelled = false;

        void import('@/app/services/timelineEventsSupabase')
            .then(({ fetchTimelineEventsFromSupabase, mergeRemoteSnapshotsIntoTimelineEvents }) =>
                fetchTimelineEventsFromSupabase(String(id)).then((rows) => {
                    if (cancelled || !rows.length) return;
                    setTimelineEvents((prev) => mergeRemoteSnapshotsIntoTimelineEvents(prev, rows));
                }),
            )
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [executionDataId, setTimelineEvents]);
}
