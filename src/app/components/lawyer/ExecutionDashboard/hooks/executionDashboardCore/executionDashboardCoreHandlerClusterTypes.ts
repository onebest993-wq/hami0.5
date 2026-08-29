import type { TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

/** Shared input bag for handler cluster wiring (Phase B). */
export type ExecutionDashboardCoreHandlerClusterInput = Record<string, unknown> & {
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
};

export type HandlerClusterPushTimelineEvent = (
    event: TimelineEvent,
    options?: { mergePatch?: Record<string, unknown> },
) => void;

export type HandlerClusterPushTimelineDeps = {
    pushTimelineEvent: HandlerClusterPushTimelineEvent;
};
