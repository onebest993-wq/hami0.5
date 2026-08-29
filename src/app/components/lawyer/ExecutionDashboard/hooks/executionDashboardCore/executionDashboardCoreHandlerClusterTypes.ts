import type { TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';
import type { HandlerClusterFlatContext } from './handlerClusterContextShared';

/** حقيبة المعالجات — تقاطع المنظّمات بعد التسطيح، لا Record يحوّل كل حقل إلى unknown. */
export type ExecutionDashboardCoreHandlerClusterInput = HandlerClusterFlatContext & {
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
};

export function asHandlerClusterInput(value: object): ExecutionDashboardCoreHandlerClusterInput {
    return value as unknown as ExecutionDashboardCoreHandlerClusterInput;
}

export type HandlerClusterPushTimelineEvent = (
    event: TimelineEvent,
    options?: { mergePatch?: Record<string, unknown> },
) => void;

export type HandlerClusterPushTimelineDeps = {
    pushTimelineEvent: HandlerClusterPushTimelineEvent;
};
