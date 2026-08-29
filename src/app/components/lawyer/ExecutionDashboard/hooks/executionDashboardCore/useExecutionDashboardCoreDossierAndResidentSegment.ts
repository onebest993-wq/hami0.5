/** Dossier meta, lifecycle, party-death, followup/resident handlers → coreRuntimeVars */
import { useCallback, useMemo } from 'react';
import type { ExecutionDashboardProps } from '../../types';
import { useExecutionDashboardPartyDeathOpeners } from './useExecutionDashboardPartyDeathOpeners';
import { buildExecutionDashboardCoreRuntimeTailInput } from './buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './buildExecutionDashboardCoreRuntimeVars';
import { useExecutionDashboardUnifiedDossierMetaWorkflow } from './useExecutionDashboardUnifiedDossierMetaWorkflow';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../../orchestrators/useExecutionDossierLifecycleActionsOrchestrator';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { useExecutionDashboardCoreDossierFollowupHandlers } from './useExecutionDashboardCoreDossierFollowupHandlers';
import { useExecutionDashboardCoreResidentHandlers } from './useExecutionDashboardCoreResidentHandlers';
import type { ExecutionHandlerClusterGateInput } from '../executionHandlerClusterGate';
import type { useExecutionDashboardCoreBootPipeline } from './useExecutionDashboardCoreBootPipeline';
import type { useExecutionDashboardCorePipelinesChain } from './useExecutionDashboardCorePipelinesChain';

type Boot = ReturnType<typeof useExecutionDashboardCoreBootPipeline>;
type Pipelines = ReturnType<typeof useExecutionDashboardCorePipelinesChain>;

export type ExecutionDashboardCoreDossierAndResidentSegmentParams = {
    boot: Boot;
    file: ExecutionDashboardProps['file'];
    executionId: ExecutionDashboardProps['executionId'];
    onClose: ExecutionDashboardProps['onClose'];
    onUpdate: ExecutionDashboardProps['onUpdate'];
    workspacePipeline: Pipelines['workspacePipeline'];
    fileMetadataBinding: Pipelines['fileMetadataBinding'];
    followupDebtor: Pipelines['followupDebtor'];
    claimFinancialLedger: Pipelines['claimFinancialLedger'];
    graceMasterPipeline: Pipelines['graceMasterPipeline'];
    persistHandlerPipeline: Pipelines['persistHandlerPipeline'];
    financialStatus: Pipelines['financialStatus'];
    specificDeliveryConvertedAmount: Pipelines['specificDeliveryConvertedAmount'];
    specificDeliveryFinancialized: Pipelines['specificDeliveryFinancialized'];
    isEvictionExecutionModule: boolean;
    isRepresentingDebtor: boolean;
    daysRemainingInGracePeriod: Pipelines['graceMasterPipeline']['daysRemainingInGracePeriod'];
    statuteStatus: Pipelines['graceMasterPipeline']['statuteStatus'];
    showToastForHandlers: (
        message: string,
        type?: string,
        opts?: Record<string, unknown>,
    ) => void;
};

export function useExecutionDashboardCoreDossierAndResidentSegment(
    p: ExecutionDashboardCoreDossierAndResidentSegmentParams,
) {
    const {
        boot,
        file,
        executionId,
        onClose,
        onUpdate,
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        isEvictionExecutionModule,
        isRepresentingDebtor,
        daysRemainingInGracePeriod,
        statuteStatus,
        showToastForHandlers,
    } = p;

    const {
        followupOrchestrator,
        seizureOrchestrator,
        dossierLifecyclePanel,
        showUnifiedExecutionModal,
        openDecisionsModalWithBoot,
    } = workspacePipeline;

    const dossierMetaWorkflow = useExecutionDashboardUnifiedDossierMetaWorkflow({
        executionData: boot.executionData,
        directorate: fileMetadataBinding.directorate,
        fileNumber: fileMetadataBinding.fileNumber,
        fileYear: fileMetadataBinding.fileYear,
        docNumber: fileMetadataBinding.docNumber,
        judgmentDate: fileMetadataBinding.judgmentDate,
        classification: fileMetadataBinding.classification,
        evictionPropertyNumber: fileMetadataBinding.evictionPropertyNumber,
        evictionPropertyDistrict: fileMetadataBinding.evictionPropertyDistrict,
        evictionPropertyTypeField: fileMetadataBinding.evictionPropertyTypeField,
        evictionFullAddressField: fileMetadataBinding.evictionFullAddressField,
        evictionPremisesUseRaw: fileMetadataBinding.evictionPremisesUseRaw,
        isEvictionExecutionModule,
        persistExecutionMerge: persistHandlerPipeline.persistExecutionMerge,
        parentDossierId: boot.parentDossierId,
        parentExecutionFile: boot.parentExecutionFile,
        onUpdate,
        setExecutionStorageTick: boot.setExecutionStorageTick,
        showToast: showToastForHandlers,
    });

    const coreDossierLifecycleActionsRaw = useExecutionDossierLifecycleActionsOrchestrator({
        executionData: boot.executionData,
        executionId,
        executionDataRef: boot.executionDataRef,
        dossierFileKey: boot.dossierFileKey,
        financialLedgerRef: workspacePipeline.financialLedgerRef,
        seizedAssetsSnapshotRef: workspacePipeline.seizedAssetsSnapshotRef,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        nextTimelineId: workspacePipeline.nextTimelineId,
        persistExecutionMerge: persistHandlerPipeline.persistExecutionMerge,
        reconcileDossierLifecycle: boot.reconcileDossierLifecycle,
        showToast: (message, type) =>
            showToastForHandlers(
                message,
                type === 'success' || type === 'warning' || type === 'info' ? type : 'info',
            ),
        dossierPendingStatus: dossierLifecyclePanel.dossierPendingStatus,
        dossierReasonDraft: dossierLifecyclePanel.dossierReasonDraft,
        dossierDateDraft: dossierLifecyclePanel.dossierDateDraft,
        setDossierReasonDraft: dossierLifecyclePanel.setDossierReasonDraft,
        setDossierDateDraft: dossierLifecyclePanel.setDossierDateDraft,
        setDossierPendingStatus: dossierLifecyclePanel.setDossierPendingStatus,
        setDossierLifecyclePanelOpen: dossierLifecyclePanel.setDossierLifecyclePanelOpen,
        setDossierLifecyclePanelPhase: dossierLifecyclePanel.setDossierLifecyclePanelPhase,
        closeDossierLifecyclePanel: dossierLifecyclePanel.closeDossierLifecyclePanel,
    });
    const coreDossierLifecycleActions = useMemo(
        () => ({ ...coreDossierLifecycleActionsRaw }),
        [
            coreDossierLifecycleActionsRaw.applyDossierLifecycleToFileAndTimeline,
            coreDossierLifecycleActionsRaw.handleDossierLifecyclePick,
            coreDossierLifecycleActionsRaw.handleDossierLifecycleConfirmDetails,
        ],
    );

    const {
        partyDeathHandlers,
        loadPartyDeathHandlerCluster,
        commitLiveHandlers: commitPartyDeathLiveHandlers,
    } = useExecutionDashboardPartyDeathOpeners({
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        executionId,
        executionDataId: boot.executionData?.id,
        executionDataRef: boot.executionDataRef,
        partyDeathModalParty: followupOrchestrator.partyDeathModalParty,
        setPartyDeathModalParty: followupOrchestrator.setPartyDeathModalParty,
        setPartyDeathModalDecisionId: followupOrchestrator.setPartyDeathModalDecisionId,
        showToast: showToastForHandlers,
    });

    const coreDossierFollowupHandlers = useExecutionDashboardCoreDossierFollowupHandlers({
        executionDataRef: boot.executionDataRef,
        executionData: boot.executionData,
        executionId,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        parentExecutionFile: boot.parentExecutionFile,
        isInabaActive: boot.isInabaActive,
        isUnifiedTabActive: boot.isUnifiedTabActive,
        isRepresentingDebtor,
        timelineEvents: workspacePipeline.timelineEvents,
        nextTimelineId: workspacePipeline.nextTimelineId,
        pushTimelineEventRef: workspacePipeline.pushTimelineEventRef,
        persistExecutionMerge: persistHandlerPipeline.persistExecutionMerge,
        showToast: showToastForHandlers,
        openDecisionsModalWithBoot,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        specialRequestDate: followupOrchestrator.specialRequestDate,
        specialRequestManualTitle: followupOrchestrator.specialRequestManualTitle,
        specialRequestContent: followupOrchestrator.specialRequestContent,
        setSpecialRequestTemplatePick: followupOrchestrator.setSpecialRequestTemplatePick,
        setSpecialRequestContent: followupOrchestrator.setSpecialRequestContent,
        setSpecialRequestManualTitle: followupOrchestrator.setSpecialRequestManualTitle,
        setSpecialRequestDate: followupOrchestrator.setSpecialRequestDate,
        setDossierActionModalOpen: followupOrchestrator.setDossierActionModalOpen,
        setDossierActionModalSaving: followupOrchestrator.setDossierActionModalSaving,
        setDossierActionModalType: followupOrchestrator.setDossierActionModalType,
        setExecutionStorageTick: boot.setExecutionStorageTick,
    });

    const coreResidentHandlers = useExecutionDashboardCoreResidentHandlers({
        boot: {
            executionData: boot.executionData,
            executionDataRef: boot.executionDataRef,
            parentDossierId: boot.parentDossierId,
            currentFileId: boot.currentFileId,
            setShowPaymentModal: boot.setShowPaymentModal,
        },
        file,
        executionId,
        workspacePipeline,
        persistHandlerPipeline,
        graceMasterPipeline,
        followupDebtor,
        claimFinancialLedger,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        linkSeizureAuctionToAppointments: Boolean(seizureOrchestrator.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment:
            persistHandlerPipeline.pushSeizureAuctionCalendarAppointment,
    });

    const handleMemoFollowupClick = useCallback(() => {
        if (typeof followupDebtor.closeUnifiedSeizureLog === 'function') {
            followupDebtor.closeUnifiedSeizureLog();
        }
        if (typeof followupDebtor.openFollowupModalPersisted === 'function') {
            followupDebtor.openFollowupModalPersisted();
            return;
        }
        try {
            const { openModal } = useExecutionDashboardStore.getState();
            openModal('showUnifiedExecutionModal');
        } catch {
            /* ignore */
        }
    }, [followupDebtor]);

    const handlerClusterGateInput = useMemo(
        (): ExecutionHandlerClusterGateInput => ({
            hasOpenExecutionDossier: Boolean(String(boot.executionData?.id ?? '').trim()),
            isEvictionExecutionModule,
            showUnifiedExecutionModal,
            unifiedModalTab: followupOrchestrator.unifiedModalTab,
            showUnifiedSeizureLogModal: followupDebtor.showUnifiedSeizureLogModal,
            showCoerciveModal: boot.modals.showCoerciveModal,
            showAppointmentModal: boot.modals.showAppointmentModal,
            showSeizedAssetsModal: boot.modals.showSeizedAssetsModal,
            showPaymentModal: boot.modals.showPaymentModal,
            showNotesModal: boot.modals.showNotesModal,
            showCoerciveActionForm: workspacePipeline.showCoerciveActionForm,
            showEditDossierMetaModal: dossierMetaWorkflow.showEditDossierMetaModal,
            editPartyTarget: persistHandlerPipeline.editPartyTarget,
            dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
            isHeaderExpanded: boot.isHeaderExpanded,
            showUnifiedSummonsModal: boot.modals.showUnifiedSummonsModal,
            showNotificationModal: boot.modals.showNotificationModal,
            partyDeathModalParty: followupOrchestrator.partyDeathModalParty,
        }),
        [
            boot.executionData?.id,
            isEvictionExecutionModule,
            showUnifiedExecutionModal,
            followupOrchestrator.unifiedModalTab,
            followupOrchestrator.partyDeathModalParty,
            followupDebtor.showUnifiedSeizureLogModal,
            boot.modals.showCoerciveModal,
            boot.modals.showAppointmentModal,
            boot.modals.showSeizedAssetsModal,
            boot.modals.showPaymentModal,
            boot.modals.showNotesModal,
            workspacePipeline.showCoerciveActionForm,
            dossierMetaWorkflow.showEditDossierMetaModal,
            persistHandlerPipeline.editPartyTarget,
            dossierLifecyclePanel.dossierLifecyclePanelOpen,
            boot.isHeaderExpanded,
        ],
    );

    const coreRuntimeTailInput = useMemo(
        () =>
            buildExecutionDashboardCoreRuntimeTailInput({
                boot,
                props: { file, executionId, onClose, onUpdate },
                specificDeliveryConvertedAmount,
                specificDeliveryFinancialized,
                financialStatus,
                daysRemainingInGracePeriod,
                statuteStatus,
                followupOrchestrator,
                evictionPremisesUseResolved: fileMetadataBinding.evictionPremisesUseResolved,
            }),
        [
            boot,
            file,
            executionId,
            onClose,
            onUpdate,
            specificDeliveryConvertedAmount,
            specificDeliveryFinancialized,
            financialStatus,
            daysRemainingInGracePeriod,
            statuteStatus,
            followupOrchestrator,
            fileMetadataBinding.evictionPremisesUseResolved,
        ],
    );

    const coreRuntimeVars = useMemo(
        () =>
            buildExecutionDashboardCoreRuntimeVars({
                ...workspacePipeline,
                ...followupDebtor,
                ...claimFinancialLedger,
                ...graceMasterPipeline,
                ...persistHandlerPipeline,
                ...fileMetadataBinding,
                ...dossierMetaWorkflow,
                dossierMetaWorkflow,
                partyDeathHandlers,
                handleMemoFollowupClick,
                ...coreDossierLifecycleActions,
                dossierLifecycleActions: coreDossierLifecycleActions,
                ...coreDossierFollowupHandlers,
                ...coreResidentHandlers,
                ...coreRuntimeTailInput,
            }),
        [
            workspacePipeline,
            followupDebtor,
            claimFinancialLedger,
            graceMasterPipeline,
            persistHandlerPipeline,
            fileMetadataBinding,
            dossierMetaWorkflow,
            partyDeathHandlers,
            handleMemoFollowupClick,
            coreDossierLifecycleActions,
            coreDossierFollowupHandlers,
            coreResidentHandlers,
            coreRuntimeTailInput,
        ],
    );

    return {
        dossierMetaWorkflow,
        coreDossierLifecycleActions,
        loadPartyDeathHandlerCluster,
        commitPartyDeathLiveHandlers,
        coreResidentHandlers,
        handlerClusterGateInput,
        coreRuntimeVars,
    };
}
