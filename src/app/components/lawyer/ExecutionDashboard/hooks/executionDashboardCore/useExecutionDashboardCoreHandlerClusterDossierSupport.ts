// @ts-nocheck
import { useExecutionDossierLifecycleActionsOrchestrator } from '../../orchestrators/useExecutionDossierLifecycleActionsOrchestrator';
import { useDossierMeta } from '../useDossierMeta';
import { useExecutionDashboardParentDossierPersistence } from './useExecutionDashboardParentDossierPersistence';
import type { ExecutionDashboardCoreHandlerClusterInput, HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterDossierSupport(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
    const {
        classification,
        closeDossierLifecyclePanel,
        decisionsStorageExecutionId,
        directorate,
        docNumber,
        dossierDateDraft,
        dossierFileKey,
        dossierPendingStatus,
        dossierReasonDraft,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        executionData,
        executionDataRef,
        executionId,
        fileNumber,
        fileYear,
        financialLedgerRef,
        isEvictionExecutionModule,
        judgmentDate,
        nextTimelineId,
        onUpdate,
        parentDossierId,
        parentExecutionFile,
        persistExecutionMerge,
        reconcileDossierLifecycle,
        seizedAssetsSnapshotRef,
        setDossierDateDraft,
        setDossierLifecyclePanelPhase,
        setDossierPendingStatus,
        setDossierReasonDraft,
        setExecutionStorageTick,
        setTimelineEvents,
        showToast,
    } = c as any;

    const dossierLifecycleActions = useExecutionDossierLifecycleActionsOrchestrator({
        executionData,
        executionId,
        executionDataRef,
        dossierFileKey,
        financialLedgerRef,
        seizedAssetsSnapshotRef,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        reconcileDossierLifecycle,
        showToast,
        dossierPendingStatus,
        dossierReasonDraft,
        dossierDateDraft,
        setDossierReasonDraft,
        setDossierDateDraft,
        setDossierPendingStatus,
        setDossierLifecyclePanelPhase,
        closeDossierLifecyclePanel,
    });

    const dossierMetaWorkflow = useDossierMeta(
        executionData,
        directorate,
        fileNumber,
        fileYear,
        docNumber,
        judgmentDate,
        classification,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        isEvictionExecutionModule,
        persistExecutionMerge,
        showToast,
    );

    const parentDossierPersistence = useExecutionDashboardParentDossierPersistence({
        parentDossierId,
        parentExecutionFile,
        onUpdate,
        setExecutionStorageTick,
        showToast,
    });

    return {
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
    };
}
