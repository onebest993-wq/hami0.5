/** Phase B — handler cluster seizureFollowup (requests + init saves only; AssetModal is a separate bridge). */
import { useExecutionDashboardFollowupSeizureHandlers } from './useExecutionDashboardFollowupSeizureHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterSeizureFollowup(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;

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
    } = c;

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

    return {
        followupSeizureHandlers,
    };
}
