import { useExecutionDashboardFollowupSeizureHandlers } from './useExecutionDashboardFollowupSeizureHandlers';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
    HandlerClusterPushTimelineDeps,
} from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterSeizureFollowupRequests(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
    const resolved = c as Record<string, unknown>;

    const {
        decisionsStorageExecutionId,
        executionDataRef,
        movableSeizureSubjectDraft,
        nextTimelineId,
        persistExecutionMerge,
        propertySeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        showToast,
    } = resolved;

    const followupSeizureHandlers = useExecutionDashboardFollowupSeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
        propertySeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        movableSeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
    });

    return { followupSeizureHandlers };
}
