/** منطق ExecutionDashboard — chunk execution-dashboard-core */
import type { ExecutionDashboardProps } from '../types';
import { useCallback, useEffect, useMemo } from 'react';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCore/executionDashboardCoreWorkspacePipelineTypes';
import { useExecutionDashboardPartyDeathOpeners } from './executionDashboardCore/useExecutionDashboardPartyDeathOpeners';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { buildExecutionDashboardCoreAssemblyHandlers } from './executionDashboardCore/buildExecutionDashboardCoreAssemblyHandlers';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { useStableScopeFlatBag } from './executionDashboardCore/useStableScopeFlatBag';
import { useExecutionDashboardUnifiedDossierMetaWorkflow } from './executionDashboardCore/useExecutionDashboardUnifiedDossierMetaWorkflow';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../orchestrators/useExecutionDossierLifecycleActionsOrchestrator';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { useExecutionDashboardCoreDossierFollowupHandlers } from './executionDashboardCore/useExecutionDashboardCoreDossierFollowupHandlers';
import { useExecutionDashboardCoreResidentHandlers } from './executionDashboardCore/useExecutionDashboardCoreResidentHandlers';
import { useExecutionDashboardCoreHandlerClusterRuntime } from './executionDashboardCore/useExecutionDashboardCoreHandlerClusterRuntime';
import { useExecutionDashboardCoreHandlerPrefetchEffects } from './executionDashboardCore/useExecutionDashboardCoreHandlerPrefetchEffects';
import type { ExecutionHandlerClusterGateInput } from './executionHandlerClusterGate';

type WorkspaceShowToast = ExecutionDashboardCoreWorkspacePipelineValue['showToast'];

function adaptWorkspaceShowToast(showToast: WorkspaceShowToast) {
    return (message: string, type?: string, opts?: Record<string, unknown>) => {
        showToast(
            message,
            type as Parameters<WorkspaceShowToast>[1],
            opts,
        );
    };
}
const EMPTY_HANDLER_CLUSTER_INPUT = Object.freeze({});

export function useExecutionDashboardCore({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps) {
    const boot = useExecutionDashboardCoreBootPipeline({ file, executionId });

    const pipelines = useExecutionDashboardCorePipelinesChain({
        boot,
        file,
        executionId,
        onUpdate,
    });

    const {
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    } = pipelines;

    const {
        followupOrchestrator,
        seizureOrchestrator,
        coercionOrchestrator,
        dossierLifecyclePanel,
        decisionsOrchestrator,
        activeFinancialTab,
        activeTimelineFilter,
        executionPaused,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        hideToast,
        showUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowLedgerModal,
        setEditingNoteId,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        notificationCount,
        showExecutionFinancialHub,
        timelineAccordionExpanded,
        isFinancialCenterExpanded,
        setSeizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        activeCoerciveActions,
        setActiveCoerciveActions,
        toggleEvictionGracePinned,
        evictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
    } = workspacePipeline;

    const { claimFinancials } = claimFinancialLedger;
    const { isEvictionExecutionModule, total_execution_expenses } = claimFinancialLedger;
    const { graceAndSummoning, daysRemainingInGracePeriod, statuteStatus } = graceMasterPipeline;
    const { debtorWorkspaceContext, followupTabAssembly, isRepresentingDebtor } = followupDebtor;
    const { followupSeizureTabs } = claimFinancialLedger;
    const { subsequentNoticeFlow, executorApprovalActions } = persistHandlerPipeline;
    const { openDecisionsModalWithBoot } = workspacePipeline;

    const showToastForHandlers = useMemo(
        () => adaptWorkspaceShowToast(workspacePipeline.showToast),
        [workspacePipeline.showToast],
    );

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

    const handlerClusterHeavySpreadSources = useMemo(
        () => ({
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
        }),
        [
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
        ],
    );

    const handlerClusterRuntime = useExecutionDashboardCoreHandlerClusterRuntime({
        executionId,
        activeTabId: boot.activeTabId,
        activeFollowupDebtorKey: followupDebtor.activeFollowupDebtorKey,
        handlerClusterGateInput,
        coreRuntimeVars,
        heavySpreadSources: handlerClusterHeavySpreadSources,
    });

    const { onPartyDeathHandlerClusterReady } = useExecutionDashboardCoreHandlerPrefetchEffects({
        executionDataId: boot.executionData?.id,
        isEvictionExecutionModule,
        showToast: (message, type) => showToastForHandlers(message, type),
        loadPartyDeathHandlerCluster,
        showUnifiedExecutionModal,
        unifiedModalTab: followupOrchestrator.unifiedModalTab,
        commitPartyDeathLiveHandlers,
    });

    const {
        handlerCluster,
        handlerClusterEpoch,
        loadLightHandlerCluster,
        loadFollowupHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadSeizureRequestsHandlerCluster,
        loadSeizureLogHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        loadDossierSupportHandlerCluster,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        dossierSupportHandlerClusterInput,
        handlerClusterMountKey,
        onLightHandlerClusterReady,
        onFollowupAdminSpecialHandlerClusterReady,
        onFollowupDossierControlsHandlerClusterReady,
        onFollowupOtherPartyHandlerClusterReady,
        onSeizureHeavyHandlerClusterReady,
        onCoerciveHeavyHandlerClusterReady,
        onDossierSupportHandlerClusterReady,
    } = handlerClusterRuntime;

    const scopeRuntimeInput = useMemo(
        () => ({
            isEvictionExecutionModule,
            executionData: boot.executionData,
            executionId,
            file,
            executorApprovalActions,
            total_execution_expenses,
            setSeizedAssets,
            seizureDraftsByDecisionId,
            setSeizureDraftsByDecisionId,
            activeCoerciveActions,
            setActiveCoerciveActions,
        }),
        [
            isEvictionExecutionModule,
            boot.executionData,
            executionId,
            file,
            executorApprovalActions,
            total_execution_expenses,
            setSeizedAssets,
            seizureDraftsByDecisionId,
            setSeizureDraftsByDecisionId,
            activeCoerciveActions,
            setActiveCoerciveActions,
        ],
    );

    const assemblyHandlers = useMemo(
        () =>
            buildExecutionDashboardCoreAssemblyHandlers({
                handlerCluster,
                coreRuntimeVars,
                coreDossierLifecycleActions,
                coreResidentHandlers,
            }),
        [handlerCluster, coreRuntimeVars, coreDossierLifecycleActions, coreResidentHandlers],
    );

    const modalScopeInput = useMemo(
        () =>
            buildExecutionDashboardCoreModalScopeInput({
                modals: boot.modals,
                setExecutionModal: boot.setExecutionModal,
                showLinkedDossierTimeline: boot.showLinkedDossierTimeline,
                showTransferFileNumberChangeModal: boot.showTransferFileNumberChangeModal,
                setShowDecisionsModal: boot.setShowDecisionsModal,
                setShowDocumentsModal: boot.setShowDocumentsModal,
                setShowTimelineModal: boot.setShowTimelineModal,
                setShowCoerciveModal: boot.setShowCoerciveModal,
                setShowNotificationModal: boot.setShowNotificationModal,
                setShowUnifiedSummonsModal,
                setShowPaymentModal: boot.setShowPaymentModal,
                setShowSeizedAssetsModal: boot.setShowSeizedAssetsModal,
                setShowNotesModal: boot.setShowNotesModal,
                setShowAppointmentModal: boot.setShowAppointmentModal,
                setShowPaymentCalculator: boot.setShowPaymentCalculator,
                setShowSettlementCalculator: boot.setShowSettlementCalculator,
                setShowPauseModal: boot.setShowPauseModal,
                setShowLedgerModal,
                showEditDossierMetaModal: dossierMetaWorkflow.showEditDossierMetaModal,
                setShowEditDossierMetaModal: dossierMetaWorkflow.setShowEditDossierMetaModal,
                setShowLinkedDossierTimeline: boot.setShowLinkedDossierTimeline,
                setShowTransferFileNumberChangeModal: boot.setShowTransferFileNumberChangeModal,
                setEditingNoteId,
                followupOrchestrator,
                seizureOrchestrator,
            }),
        [
            boot.modals,
            boot.setExecutionModal,
            boot.showLinkedDossierTimeline,
            boot.showTransferFileNumberChangeModal,
            boot.setShowDecisionsModal,
            boot.setShowDocumentsModal,
            boot.setShowTimelineModal,
            boot.setShowCoerciveModal,
            boot.setShowNotificationModal,
            setShowUnifiedSummonsModal,
            boot.setShowPaymentModal,
            boot.setShowSeizedAssetsModal,
            boot.setShowNotesModal,
            boot.setShowAppointmentModal,
            boot.setShowPaymentCalculator,
            boot.setShowSettlementCalculator,
            boot.setShowPauseModal,
            setShowLedgerModal,
            dossierMetaWorkflow.showEditDossierMetaModal,
            dossierMetaWorkflow.setShowEditDossierMetaModal,
            setEditingNoteId,
            followupOrchestrator,
            seizureOrchestrator,
        ],
    );

    const chunkSetupInput = useMemo(
        () => ({
            fingerprintInput: buildExecutionDashboardCoreChunkFingerprint({
                executionId,
                activeTabId: boot.activeTabId,
                activeFinancialTab,
                activeTimelineFilter,
                executionPaused,
                dossierLifecyclePanel,
                toastEpoch,
                unifiedLedgerRevision: claimFinancialLedger.unifiedLedgerRevision,
                executionStorageTick: boot.executionStorageTick,
                financialPrincipalAmount: claimFinancialLedger.financialPrincipalAmount,
                followupOrchestrator,
                showUnifiedSeizureLogModal: followupDebtor.showUnifiedSeizureLogModal,
                timelineAccordionExpanded,
                isFinancialCenterExpanded,
                isHeaderExpanded: boot.isHeaderExpanded,
                coercionOrchestrator,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
                showExecutionTrashModal: workspacePipeline.showExecutionTrashModal,
                handlerClusterEpoch,
                decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
                evictionGracePinned,
                evictionGraceHidden,
            }),
            chunkDataReady: Boolean(boot.executionData),
        }),
        [
            executionId,
            boot.activeTabId,
            activeFinancialTab,
            activeTimelineFilter,
            executionPaused,
            dossierLifecyclePanel,
            toastEpoch,
            claimFinancialLedger.unifiedLedgerRevision,
            boot.executionStorageTick,
            claimFinancialLedger.financialPrincipalAmount,
            followupOrchestrator,
            followupDebtor.showUnifiedSeizureLogModal,
            timelineAccordionExpanded,
            isFinancialCenterExpanded,
            boot.isHeaderExpanded,
            coercionOrchestrator,
            noticeVoluntaryPeriodEndOptimistic,
            voluntaryEndOptimistic,
            notificationCount,
            showExecutionFinancialHub,
            workspacePipeline.showExecutionTrashModal,
            handlerClusterEpoch,
            workspacePipeline.decisionsReloadEpoch,
            evictionGracePinned,
            evictionGraceHidden,
            boot.executionData,
        ],
    );

    const scopeLocalFlatPicked = useMemo(
        () => pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),
        [coreRuntimeVars],
    );
    const scopeRestFlatPicked = useMemo(
        () => pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),
        [coreRuntimeVars],
    );
    const scopeLocalFlat = useStableScopeFlatBag(scopeLocalFlatPicked);
    const scopeRestFlat = useStableScopeFlatBag(scopeRestFlatPicked);

    const {
        phoneBodyFingerprint,
        shellOverlayFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
        shellOverlayScopeSnapshot,
        followupModalSnapshot,
    } = useExecutionDashboardCoreScopeAndChunk({
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        scopeRuntimeInput,
        handlerCluster,
        assemblyHandlers,
        scopeLocalFlat,
        scopeRestFlat,
        modalScopeInput,
        chunkSetupInput,
    });

    useEffect(() => {
        const target = phoneBodyScopeRef.current;
        if (!target) return;
        const actions = coreDossierLifecycleActions as Record<string, unknown>;
        const pick = actions.handleDossierLifecyclePick;
        const confirm = actions.handleDossierLifecycleConfirmDetails;
        if (typeof pick === 'function') target.handleDossierLifecyclePick = pick;
        if (typeof confirm === 'function') target.handleDossierLifecycleConfirmDetails = confirm;
        target.dossierLifecycleActions = actions;
    }, [coreDossierLifecycleActions, phoneBodyScopeRef]);

    useEffect(() => {
        const target = phoneBodyScopeRef.current;
        if (!target) return;
        if (typeof toggleEvictionGracePinned === 'function') {
            target.toggleEvictionGracePinned = toggleEvictionGracePinned;
        }
        target.evictionGracePinned = evictionGracePinned;
        target.evictionGraceHidden = evictionGraceHidden;
        if (typeof setEvictionGraceHidden === 'function') {
            target.setEvictionGraceHidden = setEvictionGraceHidden;
        }
    }, [
        toggleEvictionGracePinned,
        evictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        phoneBodyScopeRef,
    ]);

    return {
        isLoading: boot.isLoading,
        loadError: boot.loadError,
        executionData: boot.executionData,
        viewExecutionData: boot.viewExecutionData,
        onClose,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        hideToast,
        phoneBodyFingerprint,
        shellOverlayFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
        shellOverlayScopeSnapshot,
        followupModalSnapshot,
        showUnifiedExecutionModal,
        unifiedModalTab: followupOrchestrator.unifiedModalTab,
        loadLightHandlerCluster,
        loadFollowupHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadSeizureRequestsHandlerCluster,
        loadSeizureLogHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        loadPublicationNoticeHandlerCluster: false,
        loadDossierSupportHandlerCluster,
        loadPartyDeathHandlerCluster,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        publicationNoticeHandlerClusterInput: EMPTY_HANDLER_CLUSTER_INPUT,
        dossierSupportHandlerClusterInput,
        partyDeathHandlerClusterInput: coerciveHeavyHandlerClusterInput,
        handlerClusterMountKey,
        onLightHandlerClusterReady,
        onFollowupAdminSpecialHandlerClusterReady,
        onFollowupDossierControlsHandlerClusterReady,
        onFollowupOtherPartyHandlerClusterReady,
        onSeizureHeavyHandlerClusterReady,
        onCoerciveHeavyHandlerClusterReady,
        onDossierSupportHandlerClusterReady,
        onPartyDeathHandlerClusterReady,
    };
}
