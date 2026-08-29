import { useMemo } from 'react';
import type { TimelineEvent } from '@/app/types/execution';

export function useDebtorScopedTimeline(
    activeTimelineEvents: TimelineEvent[],
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { key: string; isPrimary: boolean } | null,
    primaryDebtorWorkspaceKey: string | undefined,
    timelineEventBelongsToDebtorWorkspace: (
        e: TimelineEvent,
        ak: string,
        pk: string,
    ) => boolean,
) {
    const activeTimelineEventsDebtorScoped = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup || !primaryDebtorWorkspaceKey) {
            return activeTimelineEvents;
        }
        const ak = activeWorkspaceDebtorForFollowup.key;
        return activeTimelineEvents.filter((e) =>
            timelineEventBelongsToDebtorWorkspace(e, ak, primaryDebtorWorkspaceKey)
        );
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEvents,
        primaryDebtorWorkspaceKey,
    ]);

    const timelineRadarPreviewLimit = useMemo(() => {
        const ev = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        return ev.some((e) => Boolean(e.isPinned)) ? 5 : 3;
    }, [debtorBrowserTabsMode, activeTimelineEventsDebtorScoped, activeTimelineEvents]);

    return { activeTimelineEventsDebtorScoped, timelineRadarPreviewLimit };
}
