// @ts-nocheck
/** Phase B Slice 2 — coercive + seizure release/receive (extracted from handler cluster) */
import { useExecutionDashboardCoerciveActionBridge } from './useExecutionDashboardCoerciveActionBridge';
import { useExecutionDashboardCoerciveActionHandlers } from './useExecutionDashboardCoerciveActionHandlers';
import { useExecutionDashboardSeizureReleaseHandlers } from './useExecutionDashboardSeizureReleaseHandlers';
import { useExecutionDashboardThirdPartyReceiveHandlers } from './useExecutionDashboardThirdPartyReceiveHandlers';
import { useExecutionDashboardStandaloneMarkHandlers } from './useExecutionDashboardStandaloneMarkHandlers';
import { useExecutionDashboardSalarySeizurePatch } from './useExecutionDashboardSalarySeizurePatch';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
    HandlerClusterPushTimelineEvent,
} from './executionDashboardCoreHandlerClusterTypes';

export type SeizureCoerciveClusterDeps = {
    pushTimelineEvent: HandlerClusterPushTimelineEvent;
    focusSeizurePropertyInlineCompletion: unknown;
    focusSeizureMovableInlineCompletion: unknown;
    focusSeizureThirdPartyInlineCompletion: unknown;
    focusSeizureNoticeInlineCompletion: unknown;
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
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
    } = c as Record<string, unknown>;

    const { pushTimelineEvent } = deps;

    focusSeizurePropertyInlineRef.current = deps.focusSeizurePropertyInlineCompletion;
    focusSeizureMovableInlineRef.current = deps.focusSeizureMovableInlineCompletion;
    focusSeizureThirdPartyInlineRef.current = deps.focusSeizureThirdPartyInlineCompletion;
    focusSeizureNoticeInlineRef.current = deps.focusSeizureNoticeInlineCompletion;

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
        coerciveActionBridge,
        coerciveActionHandlers,
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
        clearActiveSalarySeizurePath,
    };
}
