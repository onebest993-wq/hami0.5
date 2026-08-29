/** منطق ExecutionDashboard — chunk execution-dashboard-core */
import type { ExecutionDashboardProps } from '../types';
import { useEffect, useMemo } from 'react';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCore/executionDashboardCoreWorkspacePipelineTypes';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { buildExecutionDashboardCoreAssemblyHandlers } from './executionDashboardCore/buildExecutionDashboardCoreAssemblyHandlers';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { useStableScopeFlatBag } from './executionDashboardCore/useStableScopeFlatBag';
import { useExecutionDashboardCoreDossierAndResidentSegment } from './executionDashboardCore/useExecutionDashboardCoreDossierAndResidentSegment';
import { useExecutionDashboardCoreHandlerClusterRuntime } from './executionDashboardCore/useExecutionDashboardCoreHandlerClusterRuntime';
import { useExecutionDashboardCoreHandlerPrefetchEffects } from './executionDashboardCore/useExecutionDashboardCoreHandlerPrefetchEffects';
import { useExecutionDashboardCoreModalAndChunkInputs } from './executionDashboardCore/useExecutionDashboardCoreModalAndChunkInputs';

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

    const showToastForHandlers = useMemo(
        () => adaptWorkspaceShowToast(workspacePipeline.showToast),
        [workspacePipeline.showToast],
    );

    const {
        dossierMetaWorkflow,
        coreDossierLifecycleActions,
        loadPartyDeathHandlerCluster,
        commitPartyDeathLiveHandlers,
        coreResidentHandlers,
        handlerClusterGateInput,
        coreRuntimeVars,
    } = useExecutionDashboardCoreDossierAndResidentSegment({
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
    });

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

    const { modalScopeInput, chunkSetupInput } = useExecutionDashboardCoreModalAndChunkInputs({
        boot,
        setShowUnifiedSummonsModal,
        setShowLedgerModal,
        setEditingNoteId,
        followupOrchestrator,
        seizureOrchestrator,
        dossierMetaWorkflow,
        executionId,
        activeFinancialTab,
        activeTimelineFilter,
        executionPaused,
        dossierLifecyclePanel,
        toastEpoch,
        claimFinancialLedger,
        followupDebtor,
        timelineAccordionExpanded,
        isFinancialCenterExpanded,
        coercionOrchestrator,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        notificationCount,
        showExecutionFinancialHub,
        workspacePipeline,
        handlerClusterEpoch,
        evictionGracePinned,
        evictionGraceHidden,
    });

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
