/** Phase B Slice 2 — coercive + seizure release/receive (extracted from handler cluster) */
import { useExecutionDashboardCoerciveActionBridge } from './useExecutionDashboardCoerciveActionBridge';
import { useExecutionDashboardCoerciveActionHandlers } from './useExecutionDashboardCoerciveActionHandlers';
import { useExecutionDashboardSeizureReleaseHandlers } from './useExecutionDashboardSeizureReleaseHandlers';
import { useExecutionDashboardThirdPartyReceiveHandlers } from './useExecutionDashboardThirdPartyReceiveHandlers';
import { useExecutionDashboardStandaloneMarkHandlers } from './useExecutionDashboardStandaloneMarkHandlers';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
    HandlerClusterPushTimelineEvent,
} from './executionDashboardCoreHandlerClusterTypes';

export type SeizureCoerciveClusterDeps = {
    pushTimelineEvent: HandlerClusterPushTimelineEvent;
};

export function useExecutionDashboardCoreHandlerClusterSeizureCoercive(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: SeizureCoerciveClusterDeps,
) {
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
        coerciveUiLocked,
        activeDebtorIsEmployee,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        activeCoerciveActions,
        setActiveCoerciveActions,
        thirdPartySeizureSnapshotRef,
        setThirdPartySeizureAssets,
        seizureMatrixLedgerParamsRef,
        standaloneExecutionMarksSnapshotRef,
        setStandaloneExecutionMarks,
        getLocalTodayYmd,
    } = c;

    const { pushTimelineEvent } = deps;

    const coerciveActionBridge = useExecutionDashboardCoerciveActionBridge({
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
        isRepresentingDebtor: Boolean((c as { isRepresentingDebtor?: boolean }).isRepresentingDebtor),
    });

    const { saveCoerciveAction, clearActiveSalarySeizurePath } = coerciveActionBridge;

    const coerciveActionHandlers = useExecutionDashboardCoerciveActionHandlers({
        coerciveUiLocked,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        decisionsStorageExecutionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        coerciveSubjectRef,
        openSeizureRequestsTabRef,
        openFollowupModalPersisted: c.openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        showToast,
        saveCoerciveAction,
    });

    const seizureReleaseHandlers = useExecutionDashboardSeizureReleaseHandlers({
        seizedAssets,
        activeCoerciveActions,
        setSeizedAssets,
        setTimelineEvents,
        setActiveCoerciveActions,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
    });

    const thirdPartyReceiveHandlers = useExecutionDashboardThirdPartyReceiveHandlers({
        thirdPartySeizureSnapshotRef,
        setThirdPartySeizureAssets,
        persistExecutionMerge,
        showToast,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        seizureMatrixLedgerParamsRef,
        pushTimelineEvent,
        nextTimelineId,
        setUnifiedLedgerRevision,
    });

    const standaloneMarkHandlers = useExecutionDashboardStandaloneMarkHandlers({
        standaloneExecutionMarksSnapshotRef,
        setStandaloneExecutionMarks,
        decisionsStorageExecutionId,
        executionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
    });

    return {
        coerciveActionBridge,
        coerciveActionHandlers,
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        clearActiveSalarySeizurePath,
    };
}
