// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-dashboard-core */

import type { ExecutionDashboardProps } from '../types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useExecutionDashboardPartyDeathOpeners } from './executionDashboardCore/useExecutionDashboardPartyDeathOpeners';
import type { PartyDeathLiveHandlers } from './executionDashboardCore/useExecutionDashboardPartyDeathOpeners';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from './executionHandlerClusterStubs';
import {
    buildExecutionHandlerClusterMountKey,
    shouldLoadExecutionHandlerClusterCoerciveHeavy,
    shouldLoadExecutionHandlerClusterDossierSupport,
    shouldLoadExecutionHandlerClusterFollowupAdminSpecial,
    shouldLoadExecutionHandlerClusterFollowupDossierControls,
    shouldLoadExecutionHandlerClusterFollowupHeavy,
    shouldLoadExecutionHandlerClusterFollowupOtherParty,
    shouldLoadExecutionHandlerClusterLight,
    shouldLoadExecutionHandlerClusterSeizureLog,
    shouldLoadExecutionHandlerClusterSeizureRequests,
    shouldLoadExecutionHandlerClusterSeizureHeavy,
} from './executionHandlerClusterGate';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import { pickHandlerClusterAssemblyHandlers } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { pickFollowupAdminSpecialHandlerClusterInput } from './executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import { pickFollowupOtherPartyHandlerClusterInput } from './executionDashboardCore/followupOtherPartyHandlerClusterInput';
import { useExecutionDashboardUnifiedDossierMetaWorkflow } from './executionDashboardCore/useExecutionDashboardUnifiedDossierMetaWorkflow';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../orchestrators/useExecutionDossierLifecycleActionsOrchestrator';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

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
        isHeaderExpanded,
        setSeizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        activeCoerciveActions,
        setActiveCoerciveActions,
    } = workspacePipeline;

    const { claimFinancials } = claimFinancialLedger;
    const { isEvictionExecutionModule, total_execution_expenses } = claimFinancialLedger;
    const { graceAndSummoning, daysRemainingInGracePeriod, statuteStatus } = graceMasterPipeline;
    const { debtorWorkspaceContext, followupTabAssembly } = followupDebtor;
    const { followupSeizureTabs } = claimFinancialLedger;
    const { subsequentNoticeFlow, executorApprovalActions } = persistHandlerPipeline;

    // مقيم على Core — لا يعتمد على dossier-support الكسول (كان يترك زر التعديل على stub)
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
        showToast: workspacePipeline.showToast,
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
        showToast: workspacePipeline.showToast,
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
        showToast: workspacePipeline.showToast,
    });

    useEffect(() => {
        if (!loadPartyDeathHandlerCluster) return;
        return scheduleIdleWork(() => {
            prefetchExecutionHandlerClusterPartyDeathBridge();
        }, 80);
    }, [loadPartyDeathHandlerCluster]);

    const onPartyDeathHandlerClusterReady = useCallback((cluster: Record<string, unknown>) => {
        commitPartyDeathLiveHandlers(cluster as PartyDeathLiveHandlers);
    }, [commitPartyDeathLiveHandlers]);

    const handleMemoFollowupClick = useCallback(() => {
        if (typeof followupDebtor.closeUnifiedSeizureLog === 'function') {
            followupDebtor.closeUnifiedSeizureLog();
        }
        try {
            const { openModal } = useExecutionDashboardStore.getState();
            openModal('showUnifiedExecutionModal');
        } catch {
            /* ignore */
        }
        if (typeof followupDebtor.openFollowupModalPersisted === 'function') {
            followupDebtor.openFollowupModalPersisted();
        }
    }, [followupDebtor]);

    const handlerClusterGateInput = useMemo(
        () => ({
            showUnifiedExecutionModal,
            unifiedModalTab: followupDebtor.unifiedModalTab,
            showUnifiedSeizureLogModal: followupDebtor.showUnifiedSeizureLogModal,
            showCoerciveModal: boot.modals.showCoerciveModal,
            showAppointmentModal: boot.modals.showAppointmentModal,
            showSeizedAssetsModal: boot.modals.showSeizedAssetsModal,
            showPaymentModal: boot.modals.showPaymentModal,
            showNotesModal: boot.modals.showNotesModal,
            showCoerciveActionForm: workspacePipeline.showCoerciveActionForm,
            showEditDossierMetaModal: dossierMetaWorkflow.showEditDossierMetaModal,
            dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
            isHeaderExpanded,
        }),
        [
            showUnifiedExecutionModal,
            followupDebtor.unifiedModalTab,
            followupDebtor.showUnifiedSeizureLogModal,
            boot.modals.showCoerciveModal,
            boot.modals.showAppointmentModal,
            boot.modals.showSeizedAssetsModal,
            boot.modals.showPaymentModal,
            boot.modals.showNotesModal,
            workspacePipeline.showCoerciveActionForm,
            dossierMetaWorkflow.showEditDossierMetaModal,
            dossierLifecyclePanel.dossierLifecyclePanelOpen,
            isHeaderExpanded,
        ],
    );

    const loadLightHandlerCluster = shouldLoadExecutionHandlerClusterLight(handlerClusterGateInput);
    const loadFollowupHeavyHandlerCluster = shouldLoadExecutionHandlerClusterFollowupHeavy(handlerClusterGateInput);
    const loadFollowupAdminSpecialHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupAdminSpecial(handlerClusterGateInput);
    const loadFollowupDossierControlsHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupDossierControls(handlerClusterGateInput);
    const loadFollowupOtherPartyHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupOtherParty(handlerClusterGateInput);
    const loadSeizureHeavyHandlerCluster = shouldLoadExecutionHandlerClusterSeizureHeavy(handlerClusterGateInput);
    const loadSeizureRequestsHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureRequests(handlerClusterGateInput);
    const loadSeizureLogHandlerCluster = shouldLoadExecutionHandlerClusterSeizureLog(handlerClusterGateInput);
    const loadCoerciveHeavyHandlerCluster = shouldLoadExecutionHandlerClusterCoerciveHeavy(handlerClusterGateInput);
    const loadDossierSupportHandlerCluster = shouldLoadExecutionHandlerClusterDossierSupport(handlerClusterGateInput);
    const loadAnyHeavyHandlerCluster =
        loadFollowupHeavyHandlerCluster || loadSeizureHeavyHandlerCluster || loadCoerciveHeavyHandlerCluster;

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
            coreRuntimeTailInput,
        ],
    );

    const [handlerCluster, setHandlerCluster] = useState(EXECUTION_HANDLER_CLUSTER_STUBS);
    const [handlerClusterEpoch, setHandlerClusterEpoch] = useState(0);

    const lightHandlerClusterInput = useMemo(
        () => {
            if (!loadLightHandlerCluster || loadAnyHeavyHandlerCluster) {
                return EMPTY_HANDLER_CLUSTER_INPUT;
            }

            return coreRuntimeVars;
        },
        [loadAnyHeavyHandlerCluster, loadLightHandlerCluster, coreRuntimeVars],
    );

    const handlerClusterHeavySpreads = useMemo(
        () => {
            return {
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
                core: coreRuntimeVars,
            };
        },
        [
            coreRuntimeVars,
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

    const followupAdminSpecialHandlerClusterInput = useMemo(
        () =>
            loadFollowupAdminSpecialHandlerCluster
                ? pickFollowupAdminSpecialHandlerClusterInput(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupAdminSpecialHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupDossierControlsHandlerClusterInput = useMemo(
        () =>
            loadFollowupDossierControlsHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupDossierControlsHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupOtherPartyHandlerClusterInput = useMemo(
        () =>
            loadFollowupOtherPartyHandlerCluster
                ? pickFollowupOtherPartyHandlerClusterInput(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupOtherPartyHandlerCluster, handlerClusterHeavySpreads],
    );

    const seizureHeavyHandlerClusterInput = useMemo(
        () =>
            loadSeizureHeavyHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadSeizureHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const coerciveHeavyHandlerClusterInput = useMemo(
        () =>
            loadCoerciveHeavyHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadCoerciveHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const dossierSupportHandlerClusterInput = useMemo(
        () =>
            loadDossierSupportHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadDossierSupportHandlerCluster, handlerClusterHeavySpreads],
    );

    const handlerClusterMountKey = buildExecutionHandlerClusterMountKey({
        executionId,
        activeTabId: boot.activeTabId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        activeFollowupDebtorKey: followupDebtor.activeFollowupDebtorKey,
    });

    useEffect(() => {
        setHandlerCluster(EXECUTION_HANDLER_CLUSTER_STUBS);
        setHandlerClusterEpoch(0);
    }, [handlerClusterMountKey]);

    const onLightHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({ ...current, ...next }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onFollowupAdminSpecialHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({
            ...current,
            ...next,
            dossierFollowupHandlers: {
                ...(current.dossierFollowupHandlers as Record<string, unknown> | undefined),
                ...(next.dossierFollowupHandlers as Record<string, unknown> | undefined),
            },
        }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onFollowupDossierControlsHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({
            ...current,
            ...next,
            dossierFollowupHandlers: {
                ...(current.dossierFollowupHandlers as Record<string, unknown> | undefined),
                ...(next.dossierFollowupHandlers as Record<string, unknown> | undefined),
            },
        }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onFollowupOtherPartyHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({
            ...current,
            ...next,
            dossierFollowupHandlers: {
                ...(current.dossierFollowupHandlers as Record<string, unknown> | undefined),
                ...(next.dossierFollowupHandlers as Record<string, unknown> | undefined),
            },
        }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onSeizureHeavyHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({ ...current, ...next }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onCoerciveHeavyHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster(next);
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const onDossierSupportHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster((current) => ({ ...current, ...next }));
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

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

    const assemblyHandlers = useMemo(() => {
        const clusterHandlers = pickHandlerClusterAssemblyHandlers(handlerCluster);
        const coreHandlers = pickCoreAssemblyHandlers(coreRuntimeVars);
        const coreActions = coreHandlers.dossierLifecycleActions;
        const clusterActions = clusterHandlers.dossierLifecycleActions;
        const dossierLifecycleActions =
            coreActions && typeof coreActions === 'object' && !Array.isArray(coreActions)
                ? coreActions
                : clusterActions &&
                    typeof clusterActions === 'object' &&
                    !Array.isArray(clusterActions)
                  ? clusterActions
                  : coreDossierLifecycleActions;
        return {
            ...clusterHandlers,
            ...coreHandlers,
            dossierLifecycleActions,
            // دائماً من Core — لا يعتمد على تحميل light/notes cluster
            handleMemoFollowupClick: coreRuntimeVars.handleMemoFollowupClick,
            openFollowupModalPersisted: coreRuntimeVars.openFollowupModalPersisted,
        };
    }, [handlerCluster, coreRuntimeVars, coreDossierLifecycleActions]);

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
                isHeaderExpanded,
                coercionOrchestrator,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
                handlerClusterEpoch,
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
            isHeaderExpanded,
            coercionOrchestrator,
            noticeVoluntaryPeriodEndOptimistic,
            voluntaryEndOptimistic,
            notificationCount,
            showExecutionFinancialHub,
            handlerClusterEpoch,
            boot.executionData,
        ],
    );

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
        scopeLocalFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),
        scopeRestFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),
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
        unifiedModalTab: followupDebtor.unifiedModalTab,
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
