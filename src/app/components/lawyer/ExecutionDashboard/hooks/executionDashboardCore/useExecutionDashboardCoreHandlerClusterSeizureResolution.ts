import { useExecutionDashboardSeizureReleaseHandlers } from './useExecutionDashboardSeizureReleaseHandlers';
import { useExecutionDashboardThirdPartyReceiveHandlers } from './useExecutionDashboardThirdPartyReceiveHandlers';
import { useExecutionDashboardStandaloneMarkHandlers } from './useExecutionDashboardStandaloneMarkHandlers';
import { useExecutionDashboardSalarySeizurePatch } from './useExecutionDashboardSalarySeizurePatch';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
    HandlerClusterPushTimelineDeps,
} from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterSeizureResolution(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
    const resolved = c as any;

    const {
        seizedAssets,
        activeCoerciveActions,
        setSeizedAssets,
        setTimelineEvents,
        setActiveCoerciveActions,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        thirdPartySeizureSnapshotRef,
        setThirdPartySeizureAssets,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        seizureMatrixLedgerParamsRef,
        setUnifiedLedgerRevision,
        standaloneExecutionMarksSnapshotRef,
        setStandaloneExecutionMarks,
        executionDataRef,
        getLocalTodayYmd,
        activeDebtorIsDeceased,
    } = resolved;

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

    const salarySeizurePatch = useExecutionDashboardSalarySeizurePatch({
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        decisionsStorageExecutionId,
        executionId,
        persistExecutionMerge,
    });

    return {
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
    };
}
