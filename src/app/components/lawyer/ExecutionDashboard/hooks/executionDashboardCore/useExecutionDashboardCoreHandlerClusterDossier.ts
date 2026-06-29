// @ts-nocheck
/** Phase B — handler cluster dossier */
import { useMemo } from 'react';
import { useExecutionDashboardDossierFollowupHandlers } from './useExecutionDashboardDossierFollowupHandlers';
import { useExecutionDashboardParentDossierPersistence } from './useExecutionDashboardParentDossierPersistence';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../../orchestrators';
import { useDossierMeta } from '../useDossierMeta';
import type { ExecutionDashboardCoreHandlerClusterInput, HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';

export type { HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterDossier(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;

    const {
        classification,
        closeDossierLifecyclePanel,
        debtors,
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
        isInabaActive,
        isRepresentingDebtor,
        isUnifiedTabActive,
        judgmentDate,
        nextTimelineId,
        onUpdate,
        openDecisionsModalWithBoot,
        parentDossierId,
        parentExecutionFile,
        persistExecutionMerge,
        reconcileDossierLifecycle,
        seizedAssetsSnapshotRef,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setDossierDateDraft,
        setDossierLifecyclePanelPhase,
        setDossierPendingStatus,
        setDossierReasonDraft,
        setExecutionStorageTick,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        setTimelineEvents,
        showToast,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        timelineEvents,
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

const {
        applyDossierLifecycleToFileAndTimeline,
        handleDossierLifecyclePick,
        handleDossierLifecycleConfirmDetails,
    } = dossierLifecycleActions;



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

const {
        showEditDossierMetaModal,
        dossierMetaDraft,
        setShowEditDossierMetaModal,
        setDossierMetaDraft,
        openEditDossierMeta,
        saveDossierMetaDraft,
    } = dossierMetaWorkflow;



    const parentDossierPersistence = useExecutionDashboardParentDossierPersistence({
        parentDossierId,
        parentExecutionFile,
        onUpdate,
        setExecutionStorageTick,
        showToast,
    });

const {
        persistParentDossierMerge,
        parentIsEvictionForExpandedHeader,
        openParentDossierMetaEdit,
    } = parentDossierPersistence;



    /** مصدر موحّد لتحديث المدينين — يفضّل البيانات المدمجة في الملف على props المتأخرة */
    const debtorsForPartyPatch = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors as Debtor[];
        }
        return (debtors || []) as Debtor[];
    }, [executionData?.debtors, debtors]);

    const dossierFollowupHandlers = useExecutionDashboardDossierFollowupHandlers({
        executionDataRef,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        parentExecutionFile,
        isInabaActive,
        isUnifiedTabActive,
        isRepresentingDebtor,
        timelineEvents,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openDecisionsModalWithBoot,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setExecutionStorageTick,
        setSpecialRequestTemplatePick,
        setSpecialRequestContent,
        setSpecialRequestManualTitle,
        setSpecialRequestDate,
        setTimelineEvents,
    });

const {
        handleDossierAction,
        handleOpenDossierAction,
        runSpecialFollowupSubmit,
        creditorOtherPartyTrackHandlers,
        otherPartyTabSubmitHandler,
        openOtherPartyAppealsModal,
    } = dossierFollowupHandlers;
    return {
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
        dossierFollowupHandlers,
        debtorsForPartyPatch,
    };
}
