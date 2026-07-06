// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-dashboard-core */

import type { ExecutionDashboardProps } from '../types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from './executionHandlerClusterStubs';
import {
    buildExecutionHandlerClusterMountKey,
    shouldLoadExecutionHandlerClusterCoerciveHeavy,
    shouldLoadExecutionHandlerClusterDossierSupport,
    shouldLoadExecutionHandlerClusterFollowupAdminSpecial,
    shouldLoadExecutionHandlerClusterFollowupDossierControls,
    shouldLoadExecutionHandlerClusterFollowupOtherParty,
    shouldLoadExecutionHandlerClusterFollowupHeavy,
    shouldLoadExecutionHandlerClusterLight,
    shouldLoadExecutionHandlerClusterSeizureHeavy,
} from './executionHandlerClusterGate';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import {
    collectDossierSupportHandlerClusterContext,
    collectFollowupAdminSpecialHandlerClusterContext,
    collectFollowupDossierControlsHandlerClusterContext,
    collectFollowupOtherPartyHandlerClusterContext,
    collectHandlerClusterContext,
    collectSeizureHeavyHandlerClusterContext,
} from './executionDashboardCore/collectHandlerClusterContext';
import { pickHandlerClusterAssemblyHandlers } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';

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
            showEditDossierMetaModal: boot.modals.showEditDossierMetaModal,
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
            boot.modals.showEditDossierMetaModal,
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
                ...coreRuntimeTailInput,
            }),
        [
            workspacePipeline,
            followupDebtor,
            claimFinancialLedger,
            graceMasterPipeline,
            persistHandlerPipeline,
            fileMetadataBinding,
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

            return buildHandlerClusterCoreInput(coreRuntimeVars);
        },
        [loadAnyHeavyHandlerCluster, loadLightHandlerCluster, coreRuntimeVars],
    );

    const handlerClusterHeavySpreads = useMemo(
        () => {
            const core = buildHandlerClusterCoreInput(coreRuntimeVars);
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
                core,
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
                ? collectFollowupAdminSpecialHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupAdminSpecialHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupDossierControlsHandlerClusterInput = useMemo(
        () =>
            loadFollowupDossierControlsHandlerCluster
                ? collectFollowupDossierControlsHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupDossierControlsHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupOtherPartyHandlerClusterInput = useMemo(
        () =>
            loadFollowupOtherPartyHandlerCluster
                ? collectFollowupOtherPartyHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupOtherPartyHandlerCluster, handlerClusterHeavySpreads],
    );

    const seizureHeavyHandlerClusterInput = useMemo(
        () =>
            loadSeizureHeavyHandlerCluster
                ? collectSeizureHeavyHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadSeizureHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const coerciveHeavyHandlerClusterInput = useMemo(
        () =>
            loadCoerciveHeavyHandlerCluster
                ? collectHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadCoerciveHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const dossierSupportHandlerClusterInput = useMemo(
        () =>
            loadDossierSupportHandlerCluster
                ? collectDossierSupportHandlerClusterContext(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
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
        setHandlerCluster(next);
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

    const assemblyHandlers = useMemo(
        () => ({
            ...pickHandlerClusterAssemblyHandlers(handlerCluster),
            ...pickCoreAssemblyHandlers(coreRuntimeVars),
        }),
        [handlerCluster, coreRuntimeVars],
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
                setShowEditDossierMetaModal: dossierLifecyclePanel.setShowEditDossierMetaModal,
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
            dossierLifecyclePanel.setShowEditDossierMetaModal,
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
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
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
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
        showUnifiedExecutionModal,
        loadLightHandlerCluster,
        loadFollowupHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
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
    };
}
