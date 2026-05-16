import { useMemo } from 'react';

export function useDebtorScopedTimeline(
    activeTimelineEvents: any[],
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { key: string; isPrimary: boolean } | null,
    primaryDebtorWorkspaceKey: string | undefined,
    activeTimelineFilter: string,
    TIMELINE_FILTER_MAP: Record<string, string | string[]>,
    timelineEventBelongsToDebtorWorkspace: (e: any, ak: string, pk: string) => boolean,
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

    const filteredTimelineEvents = useMemo(() => {
        const base = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        if (activeTimelineFilter === 'الكل') return base;
        const rule = TIMELINE_FILTER_MAP[activeTimelineFilter];
        if (!rule) return base;
        return base.filter((e) => (Array.isArray(rule) ? rule.includes(e.type) : e.type === rule));
    }, [
        debtorBrowserTabsMode,
        activeTimelineEventsDebtorScoped,
        activeTimelineEvents,
        activeTimelineFilter,
        TIMELINE_FILTER_MAP,
    ]);

    const timelineRadarPreviewLimit = useMemo(() => {
        const ev = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        return ev.some((e) => Boolean(e.isPinned)) ? 5 : 3;
    }, [debtorBrowserTabsMode, activeTimelineEventsDebtorScoped, activeTimelineEvents]);

    return { activeTimelineEventsDebtorScoped, filteredTimelineEvents, timelineRadarPreviewLimit };
}
