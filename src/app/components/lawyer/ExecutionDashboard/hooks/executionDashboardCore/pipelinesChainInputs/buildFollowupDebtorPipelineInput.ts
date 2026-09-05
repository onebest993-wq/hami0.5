/** Followup/debtor pipeline chain input builder */
import type { ExecutionDashboardCoreFollowupDebtorPipelineInput } from './types';
import type { ExecutionDashboardCoreWorkspacePipelineChainBag } from '../executionDashboardCoreWorkspacePipelineTypes';

export function buildExecutionDashboardCoreFollowupDebtorPipelineInput(input: {
    executionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['executionData'];
    viewExecutionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['viewExecutionData'];
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    claimType: string;
    creditors: ExecutionDashboardCoreFollowupDebtorPipelineInput['creditors'];
    debtors: ExecutionDashboardCoreFollowupDebtorPipelineInput['debtors'];
    dossierFileKey: string;
    executionFileKey: string;
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
    setShowExtraCreditors: (show: boolean) => void;
    setShowExtraDebtors: (show: boolean) => void;
    setDebtorSummonsMarkerLocal:
        ExecutionDashboardCoreFollowupDebtorPipelineInput['setDebtorSummonsMarkerLocal'];
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineChainBag;
}) {
    const {
        executionData,
        viewExecutionData,
        executionId,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        claimType,
        creditors,
        debtors,
        dossierFileKey,
        executionFileKey,
        setShowDecisionsModal,
        showDecisionsModal,
        setShowExtraCreditors,
        setShowExtraDebtors,
        setDebtorSummonsMarkerLocal,
        workspacePipeline,
    } = input;

    return {
        executionData,
        viewExecutionData,
        executionId,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        claimType,
        creditors,
        debtors,
        mergedTimelineEvents: workspacePipeline.mergedTimelineEvents,
        activeTimelineEvents: workspacePipeline.activeTimelineEvents,
        activeCoerciveActions: workspacePipeline.activeCoerciveActions,
        showUnifiedExecutionModal: workspacePipeline.showUnifiedExecutionModal,
        dossierFileKey,
        executionFileKey,
        setShowDecisionsModal,
        showDecisionsModal,
        setActiveTimelineFilter: workspacePipeline.setActiveTimelineFilter,
        setShowExtraCreditors,
        setShowExtraDebtors,
        caseTasksPendingRef: workspacePipeline.caseTasksPendingRef,
        setCaseTasksPending: workspacePipeline.setCaseTasksPending,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        persistExecutionMergeRef: workspacePipeline.persistExecutionMergeRef,
        setNotificationCount: workspacePipeline.setNotificationCount,
        setDebtorSummonsMarkerLocal,
        pushTimelineEventRef: workspacePipeline.pushTimelineEventRef,
        nextTimelineId: workspacePipeline.nextTimelineId,
        followupOrchestrator: workspacePipeline.followupOrchestrator,
    };
}
