import { useExecutionDashboardCoerciveActionBridge } from './useExecutionDashboardCoerciveActionBridge';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterCoerciveActionBridge(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const resolved = c as any;
    const {
        saveCoerciveActionRef,
        setShowCoerciveActionForm,
        settlementGuarantorGate,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        activeWorkspaceDebtorForFollowup,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        coerciveSubjectRef,
        showToast,
        setLastActionDate,
        setUnifiedLedgerRevision,
        isRepresentingDebtor,
    } = resolved;

    return useExecutionDashboardCoerciveActionBridge({
        saveCoerciveActionRef,
        setShowCoerciveActionForm,
        settlementGuarantorGate,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        activeWorkspaceDebtorForFollowup,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        coerciveSubjectRef,
        showToast,
        setLastActionDate,
        setUnifiedLedgerRevision,
        isRepresentingDebtor: Boolean(isRepresentingDebtor),
    });
}
