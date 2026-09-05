/** Phase B — handler cluster seizureFollowup (requests + init saves + كفيل; AssetModal is a separate bridge). */
import { adaptFollowupSeizureShowToast, useExecutionDashboardFollowupSeizureHandlers } from './useExecutionDashboardFollowupSeizureHandlers';
import { useExecutionDashboardGuarantorFollowupHandlers } from './useExecutionDashboardGuarantorFollowupHandlers';
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
        executionData,
        executionId,
        assignmentWorkspaceCtx,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        persistExecutionMergeRef,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
    } = c;

    const followupSeizureHandlers = useExecutionDashboardFollowupSeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast: adaptFollowupSeizureShowToast(showToast),
        propertySeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        movableSeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
    });

    const guarantorFollowupHandlers = useExecutionDashboardGuarantorFollowupHandlers({
        decisionsStorageExecutionId,
        executionData,
        executionId,
        assignmentWorkspaceCtx: assignmentWorkspaceCtx ?? { activeDebtorKey: null },
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        executionDataRef,
        persistExecutionMergeRef,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
    });

    return {
        followupSeizureHandlers,
        guarantorFollowupHandlers,
    };
}
