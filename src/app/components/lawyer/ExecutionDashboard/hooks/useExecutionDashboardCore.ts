// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-dashboard-core */

import type { ExecutionDashboardProps } from '../types';
import { useCallback, useMemo, useState } from 'react';
import { useExecutionDashboardCoreBootPipeline } from './executionDashboardCore/useExecutionDashboardCoreBootPipeline';
import { useExecutionDashboardCorePipelinesChain } from './executionDashboardCore/useExecutionDashboardCorePipelinesChain';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from './executionHandlerClusterStubs';
import {
    buildExecutionHandlerClusterMountKey,
    shouldLoadExecutionHandlerCluster,
} from './executionHandlerClusterGate';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import { collectHandlerClusterContext } from './executionDashboardCore/collectHandlerClusterContext';
import { pickHandlerClusterAssemblyHandlers } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';

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

    const coreRuntimeVars = buildExecutionDashboardCoreRuntimeVars({
        ...workspacePipeline,
        ...followupDebtor,
        ...claimFinancialLedger,
        ...graceMasterPipeline,
        ...persistHandlerPipeline,
        ...fileMetadataBinding,
        ...buildExecutionDashboardCoreRuntimeTailInput({
            boot,
            props: { file, executionId, onClose, onUpdate },
            specificDeliveryConvertedAmount,
            specificDeliveryFinancialized,
            financialStatus,
            daysRemainingInGracePeriod,
            statuteStatus,
            followupOrchestrator,
        }),
    });

    const handlerClusterCore = buildHandlerClusterCoreInput(coreRuntimeVars);

    const [handlerCluster, setHandlerCluster] = useState(EXECUTION_HANDLER_CLUSTER_STUBS);
    const [handlerClusterEpoch, setHandlerClusterEpoch] = useState(0);

    const handlerClusterInput = useMemo(
        () =>
            collectHandlerClusterContext({
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
                core: handlerClusterCore,
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
            handlerClusterCore,
        ],
    );

    const loadHandlerCluster = shouldLoadExecutionHandlerCluster({
        showUnifiedExecutionModal,
        showUnifiedSeizureLogModal: followupDebtor.showUnifiedSeizureLogModal,
        showCoerciveModal: boot.modals.showCoerciveModal,
        showAppointmentModal: boot.modals.showAppointmentModal,
        showSeizedAssetsModal: boot.modals.showSeizedAssetsModal,
        showPaymentModal: boot.modals.showPaymentModal,
        showNotesModal: boot.modals.showNotesModal,
        showCoerciveActionForm: workspacePipeline.showCoerciveActionForm,
    });

    const handlerClusterMountKey = buildExecutionHandlerClusterMountKey({
        executionId,
        activeTabId: boot.activeTabId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        activeFollowupDebtorKey: followupDebtor.activeFollowupDebtorKey,
    });

    const onHandlerClusterReady = useCallback((next: Record<string, unknown>) => {
        setHandlerCluster(next);
        setHandlerClusterEpoch((epoch) => epoch + 1);
    }, []);

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardCoreScopeAndChunk({
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        scopeRuntimeInput: {
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
        },
        handlerCluster,
        assemblyHandlers: {
            ...pickHandlerClusterAssemblyHandlers(handlerCluster),
            ...pickCoreAssemblyHandlers(coreRuntimeVars),
        },
        scopeLocalFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),
        scopeRestFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),
        modalScopeInput: buildExecutionDashboardCoreModalScopeInput({
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
        chunkSetupInput: {
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
        },
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
        loadHandlerCluster,
        handlerClusterInput,
        handlerClusterMountKey,
        onHandlerClusterReady,
    };
}
