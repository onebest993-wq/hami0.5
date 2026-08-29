/** Followup/debtor pipeline chain input builder */
import type { AnyRecord, ExecutionDashboardCoreFollowupDebtorPipelineInput } from './types';

export function buildExecutionDashboardCoreFollowupDebtorPipelineInput(input: {
    executionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['executionData'];
    viewExecutionData: ExecutionDashboardCoreFollowupDebtorPipelineInput['viewExecutionData'];
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    claimType: string;
    creditors: ExecutionDashboardCoreFollowupDebtorPipelineInput['creditors'];
    debtors: ExecutionDashboardCoreFollowupDebtorPipelineInput['debtors'];
    showToast: (msg: string, type?: string) => void;
    dossierFileKey: string;
    executionFileKey: string;
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
    setShowExtraCreditors: (show: boolean) => void;
    setShowExtraDebtors: (show: boolean) => void;
    setDebtorSummonsMarkerLocal:
        ExecutionDashboardCoreFollowupDebtorPipelineInput['setDebtorSummonsMarkerLocal'];
    workspacePipeline: AnyRecord;
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
        showToast,
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
        realEstateSeizureRegistryAssets: workspacePipeline.realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets: workspacePipeline.salarySeizureRegistryAssets,
        movableSeizureRegistryAssets: workspacePipeline.movableSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets: workspacePipeline.thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi: workspacePipeline.thirdPartySeizuresUi,
        showToast,
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
