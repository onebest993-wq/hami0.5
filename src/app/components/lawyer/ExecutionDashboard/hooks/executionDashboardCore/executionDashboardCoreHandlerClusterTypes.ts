import type { TimelineEvent } from '@/app/types/execution';

/** Shared input bag for handler cluster wiring (Phase B). */
export type ExecutionDashboardCoreHandlerClusterInput = Record<string, unknown>;

export type HandlerClusterPushTimelineEvent = (
    event: TimelineEvent,
    options?: { mergePatch?: Record<string, unknown> },
) => void;

export type HandlerClusterPushTimelineDeps = {
    pushTimelineEvent: HandlerClusterPushTimelineEvent;
};
