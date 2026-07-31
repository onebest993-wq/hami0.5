/**
 * توأم تجميع تاريخي — المسار الحيّ للإنتاج هو useExecutionDashboardCore
 * عبر ExecutionDashboardViewResolved → ResolvedRuntimeSurface.
 * يُبقى للعقود الهيكلية/المقارنات؛ لا يُستدعى كـ hook من Surface الحيّ.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { registerExecutionHandlerStubNotifier } from './executionHandlerClusterStubs';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import {
    shouldLoadExecutionHandlerClusterCoerciveHeavy,
    shouldLoadExecutionHandlerClusterDossierSupport,
    shouldLoadExecutionHandlerClusterFollowupAdminSpecial,
    shouldLoadExecutionHandlerClusterFollowupDossierControls,
    shouldLoadExecutionHandlerClusterFollowupHeavy,
    shouldLoadExecutionHandlerClusterFollowupOtherParty,
    shouldLoadExecutionHandlerClusterLight,
    shouldLoadExecutionHandlerClusterSeizureHeavy,
    shouldLoadExecutionHandlerClusterSeizureLog,
    shouldLoadExecutionHandlerClusterSeizureRequests,
} from './executionHandlerClusterGate';
import { buildExecutionDashboardCoreRuntimeTailInput } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeTailInput';
import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';
import {
    pickHandlerClusterAssemblyHandlers,
    pickHandlerClusterRestExtras,
} from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';
import { useExecutionDashboardDossierAdminFollowupHandlers } from './executionDashboardCore/useExecutionDashboardDossierAdminFollowupHandlers';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../orchestrators/useExecutionDossierLifecycleActionsOrchestrator';
import { useExecutionDashboardSupabaseTimelineHydrate } from './executionDashboardCore/useExecutionDashboardSupabaseTimelineHydrate';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { useExecutionDashboardDebtorEmploymentHandlers } from './executionDashboardCore/useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardPartyDeathOpeners } from './executionDashboardCore/useExecutionDashboardPartyDeathOpeners';
import type { PartyDeathLiveHandlers } from './executionDashboardCore/useExecutionDashboardPartyDeathOpeners';
import { useExecutionDashboardUnifiedDossierMetaWorkflow } from './executionDashboardCore/useExecutionDashboardUnifiedDossierMetaWorkflow';
import { useExecutionHandlerClusterAssembly } from './useExecutionHandlerClusterAssembly';
import { buildExecutionDashboardRuntimeAssemblyResult } from './executionDashboardCore/buildExecutionDashboardRuntimeAssemblyResult';
import type { ExecutionDashboardProps } from '../types';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

export type RuntimeAssemblyBaseVm = {
    boot: Record<string, any>;
    pipelines: Record<string, any>;
    file: ExecutionDashboardProps['file'];
    executionId: ExecutionDashboardProps['executionId'];
    onClose: ExecutionDashboardProps['onClose'];
    onUpdate?: ExecutionDashboardProps['onUpdate'];
    viewExecutionData: unknown;
};

export function useExecutionDashboardRuntimeAssembly(baseVm: RuntimeAssemblyBaseVm) {
    const { boot, pipelines, file, executionId, onClose, onUpdate } = baseVm;

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

    useExecutionDashboardSupabaseTimelineHydrate({
        executionDataId: workspacePipeline.executionData?.id,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
    });

    const { claimFinancials } = claimFinancialLedger;
    const { isEvictionExecutionModule, total_execution_expenses } = claimFinancialLedger;
    const { graceAndSummoning, daysRemainingInGracePeriod, statuteStatus } = graceMasterPipeline;
    const { debtorWorkspaceContext, followupTabAssembly } = followupDebtor;
    const { followupSeizureTabs } = claimFinancialLedger;
    const { subsequentNoticeFlow, executorApprovalActions } = persistHandlerPipeline;
    const {
        classification,
        directorate,
        fileNumber,
        fileYear,
        docNumber,
        judgmentDate,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
    } = fileMetadataBinding;

    const debtorEmploymentHandler = useExecutionDashboardDebtorEmploymentHandlers({
        executionDataRef: boot.executionDataRef,
        debtorWorkspaceEntries: followupDebtor.debtorWorkspaceEntries,
        nextTimelineId: workspacePipeline.nextTimelineId,
        persistExecutionMerge: persistHandlerPipeline.persistExecutionMerge,
        showToast: workspacePipeline.showToast,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
    });

    /**
     * وفاة الخصوم — فتحات خفيفة على المسار البارد؛ الجسر الحقيقي يُحمَّل عند
     * نية قائمة ⋮ / نافذة الوفاة (لا stubs صامتة).
     */
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

    const dossierMetaWorkflow = useExecutionDashboardUnifiedDossierMetaWorkflow({
        executionData: boot.executionData,
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
        persistExecutionMerge: persistHandlerPipeline.persistExecutionMerge,
        parentDossierId: boot.parentDossierId,
        parentExecutionFile: boot.parentExecutionFile,
        onUpdate,
        setExecutionStorageTick: boot.setExecutionStorageTick,
        showToast: workspacePipeline.showToast,
    });

    useEffect(() => {
        const showToast = workspacePipeline.showToast;
        registerExecutionHandlerStubNotifier((path) => {
            prefetchExecutionCoreHandlers('light');
            prefetchExecutionCoreHandlers('dossier-support');
            if (typeof showToast === 'function') {
                showToast(
                    'جاري تجهيز أدوات الإضبارة — أعد المحاولة بعد لحظة.',
                    'info',
                );
            }
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
                console.warn('[execution] handler still stub:', path);
            }
        });
        return () => {
            registerExecutionHandlerStubNotifier(null);
        };
    }, [workspacePipeline.showToast]);

    const handlerClusterGateInput = useMemo(
        () => ({
            showUnifiedExecutionModal,
            showUnifiedSummonsModal: boot.modals.showUnifiedSummonsModal,
            unifiedModalTab: followupDebtor.unifiedModalTab,
            showUnifiedSeizureLogModal: followupDebtor.showUnifiedSeizureLogModal,
            showCoerciveModal: boot.modals.showCoerciveModal,
            showAppointmentModal: boot.modals.showAppointmentModal,
            showSeizedAssetsModal: boot.modals.showSeizedAssetsModal,
            showPaymentModal: boot.modals.showPaymentModal,
            showNotificationModal: boot.modals.showNotificationModal,
            showNotesModal: boot.modals.showNotesModal,
            showCoerciveActionForm: workspacePipeline.showCoerciveActionForm,
            showEditDossierMetaModal: dossierMetaWorkflow.showEditDossierMetaModal,
            partyDeathModalParty: followupOrchestrator.partyDeathModalParty,
            dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
            isHeaderExpanded,
        }),
        [
            showUnifiedExecutionModal,
            boot.modals.showUnifiedSummonsModal,
            followupDebtor.unifiedModalTab,
            followupDebtor.showUnifiedSeizureLogModal,
            boot.modals.showCoerciveModal,
            boot.modals.showAppointmentModal,
            boot.modals.showSeizedAssetsModal,
            boot.modals.showPaymentModal,
            boot.modals.showNotificationModal,
            boot.modals.showNotesModal,
            workspacePipeline.showCoerciveActionForm,
            dossierMetaWorkflow.showEditDossierMetaModal,
            followupOrchestrator.partyDeathModalParty,
            dossierLifecyclePanel.dossierLifecyclePanelOpen,
            isHeaderExpanded,
        ],
    );

    // حمّل light فوراً عند وجود بيانات إضبارة — يقلّص نافذة stubs الصامتة لأدوات الملاحظات/الدفع/المواعيد
    const loadLightHandlerCluster = shouldLoadExecutionHandlerClusterLight(handlerClusterGateInput);
    const loadFollowupHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupHeavy(handlerClusterGateInput);
    const loadFollowupAdminSpecialHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupAdminSpecial(handlerClusterGateInput);
    const loadFollowupDossierControlsHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupDossierControls(handlerClusterGateInput);
    const loadFollowupOtherPartyHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupOtherParty(handlerClusterGateInput);
    const loadSeizureHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureHeavy(handlerClusterGateInput);
    const loadSeizureRequestsHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureRequests(handlerClusterGateInput);
    const loadSeizureLogHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureLog(handlerClusterGateInput);
    const loadCoerciveHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterCoerciveHeavy(handlerClusterGateInput);
    const loadPublicationNoticeHandlerCluster = Boolean(
        boot.modals.showUnifiedSummonsModal && !workspacePipeline.activeDebtorIsEmployee,
    );
    const loadDossierSupportHandlerCluster =
        shouldLoadExecutionHandlerClusterDossierSupport(handlerClusterGateInput);
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

    const handleMemoFollowupClick = useCallback(() => {
        if (typeof followupDebtor.closeUnifiedSeizureLog === 'function') {
            followupDebtor.closeUnifiedSeizureLog();
        }
        try {
            useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
        } catch {
            /* ignore */
        }
        if (typeof followupDebtor.openFollowupModalPersisted === 'function') {
            followupDebtor.openFollowupModalPersisted();
        }
    }, [followupDebtor]);

    const pushTimelineEventFromCore = useCallback(
        (...args: Parameters<NonNullable<typeof workspacePipeline.pushTimelineEventRef.current>>) => {
            const pushTimelineEvent = workspacePipeline.pushTimelineEventRef.current;
            if (typeof pushTimelineEvent === 'function') {
                return pushTimelineEvent(...args);
            }
            return false;
        },
        [workspacePipeline.pushTimelineEventRef],
    );

    const coreDossierAdminFollowupHandlersRaw = useExecutionDashboardDossierAdminFollowupHandlers({
        executionData: workspacePipeline.executionData,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        specialRequestDate: followupOrchestrator.specialRequestDate,
        specialRequestManualTitle: followupOrchestrator.specialRequestManualTitle,
        specialRequestContent: followupOrchestrator.specialRequestContent,
        nextTimelineId: workspacePipeline.nextTimelineId,
        pushTimelineEvent: pushTimelineEventFromCore,
        showToast: workspacePipeline.showToast,
        setSpecialRequestTemplatePick: followupOrchestrator.setSpecialRequestTemplatePick,
        setSpecialRequestContent: followupOrchestrator.setSpecialRequestContent,
        setSpecialRequestManualTitle: followupOrchestrator.setSpecialRequestManualTitle,
        setSpecialRequestDate: followupOrchestrator.setSpecialRequestDate,
    });
    const coreDossierAdminFollowupHandlers = useMemo(
        () => ({ ...coreDossierAdminFollowupHandlersRaw }),
        [
            coreDossierAdminFollowupHandlersRaw.runSpecialFollowupSubmit,
        ],
    );

    const persistExecutionMergeFromCore = useCallback(
        (...args: Parameters<NonNullable<typeof workspacePipeline.persistExecutionMergeRef.current>>) => {
            const persistExecutionMerge = workspacePipeline.persistExecutionMergeRef.current;
            if (typeof persistExecutionMerge === 'function') {
                return persistExecutionMerge(...args);
            }
            return false;
        },
        [workspacePipeline.persistExecutionMergeRef],
    );

    const coreDossierLifecycleActionsRaw = useExecutionDossierLifecycleActionsOrchestrator({
        executionData: workspacePipeline.executionData,
        executionId,
        executionDataRef: boot.executionDataRef,
        dossierFileKey: boot.dossierFileKey,
        financialLedgerRef: workspacePipeline.financialLedgerRef,
        seizedAssetsSnapshotRef: workspacePipeline.seizedAssetsSnapshotRef,
        setTimelineEvents: workspacePipeline.setTimelineEvents,
        nextTimelineId: workspacePipeline.nextTimelineId,
        persistExecutionMerge: persistExecutionMergeFromCore,
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

    const coreRuntimeVars = useMemo(
        () =>
            buildExecutionDashboardCoreRuntimeVars({
                ...workspacePipeline,
                ...followupDebtor,
                ...claimFinancialLedger,
                ...graceMasterPipeline,
                ...persistHandlerPipeline,
                ...fileMetadataBinding,
                ...debtorEmploymentHandler,
                partyDeathHandlers,
                ...dossierMetaWorkflow,
                dossierMetaWorkflow,
                ...coreRuntimeTailInput,
                ...coreDossierAdminFollowupHandlers,
                ...coreDossierLifecycleActions,
                dossierLifecycleActions: coreDossierLifecycleActions,
                handleMemoFollowupClick,
            }),
        [
            workspacePipeline,
            followupDebtor,
            claimFinancialLedger,
            graceMasterPipeline,
            persistHandlerPipeline,
            fileMetadataBinding,
            debtorEmploymentHandler,
            partyDeathHandlers,
            dossierMetaWorkflow,
            coreRuntimeTailInput,
            coreDossierAdminFollowupHandlers,
            coreDossierLifecycleActions,
            handleMemoFollowupClick,
        ],
    );

    const {
        handlerCluster,
        handlerClusterEpoch,
        handlerClusterMountKey,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        publicationNoticeHandlerClusterInput,
        dossierSupportHandlerClusterInput,
        onLightHandlerClusterReady,
        onFollowupAdminSpecialHandlerClusterReady,
        onFollowupDossierControlsHandlerClusterReady,
        onFollowupOtherPartyHandlerClusterReady,
        onSeizureHeavyHandlerClusterReady,
        onCoerciveHeavyHandlerClusterReady,
        onDossierSupportHandlerClusterReady,
    } = useExecutionHandlerClusterAssembly({
        loadLightHandlerCluster,
        loadAnyHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        loadPublicationNoticeHandlerCluster,
        loadDossierSupportHandlerCluster,
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
        executionId,
        activeTabId: boot.activeTabId,
        decisionsReloadEpoch: workspacePipeline.decisionsReloadEpoch,
        activeFollowupDebtorKey: followupDebtor.activeFollowupDebtorKey,
    });

    const scopeLocalFlat = useMemo(
        () => pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),
        [coreRuntimeVars],
    );
    const scopeRestFlat = useMemo(
        () => pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),
        [coreRuntimeVars],
    );

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
            handlerClusterRestExtras: pickHandlerClusterRestExtras(handlerCluster),
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
            handlerCluster,
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
                  : coreActions;
        return {
            ...clusterHandlers,
            ...coreHandlers,
            ...(dossierLifecycleActions ? { dossierLifecycleActions } : {}),
            handleMemoFollowupClick: coreRuntimeVars.handleMemoFollowupClick,
            openFollowupModalPersisted: coreRuntimeVars.openFollowupModalPersisted,
        };
    }, [handlerCluster, coreRuntimeVars]);

    const modalScopeInput = useMemo(
        () =>
            buildExecutionDashboardCoreModalScopeInput({
                modals: boot.modals,
                setExecutionModal: boot.setExecutionModal,
                showLinkedDossierTimeline: boot.showLinkedDossierTimeline,
                showTransferFileNumberChangeModal: boot.showTransferFileNumberChangeModal,
                showEvictionExpenseModal: followupOrchestrator.showEvictionExpenseModal,
                showEvictionLawyerFeeModal: followupOrchestrator.showEvictionLawyerFeeModal,
                showEvictionResidentialGraceModal:
                    followupOrchestrator.showEvictionResidentialGraceModal,
                showGuarantorDetailsModal: seizureOrchestrator.showGuarantorDetailsModal,
                showHeirsNotificationModal: followupOrchestrator.showHeirsNotificationModal,
                showRealEstateSeizureModal: seizureOrchestrator.showRealEstateSeizureModal,
                showSolidaryCoerciveTargetModal:
                    followupOrchestrator.showSolidaryCoerciveTargetModal,
                showStayOfExecutionModal: followupOrchestrator.showStayOfExecutionModal,
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
            followupOrchestrator.showEvictionExpenseModal,
            followupOrchestrator.showEvictionLawyerFeeModal,
            followupOrchestrator.showEvictionResidentialGraceModal,
            seizureOrchestrator.showGuarantorDetailsModal,
            followupOrchestrator.showHeirsNotificationModal,
            seizureOrchestrator.showRealEstateSeizureModal,
            followupOrchestrator.showSolidaryCoerciveTargetModal,
            followupOrchestrator.showStayOfExecutionModal,
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
            setEditingNoteId,
            followupOrchestrator,
            seizureOrchestrator,
            dossierMetaWorkflow.setShowEditDossierMetaModal,
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
        scopeLocalFlat,
        scopeRestFlat,
        modalScopeInput,
        chunkSetupInput,
    });

    // حقن مباشر لمعالجات دورة حياة الإضبارة في ref الـ PhoneBody —
    // مسار chunk merge كان يتركها undefined فيفتح توست «الربط الحقيقي».
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

    return buildExecutionDashboardRuntimeAssemblyResult({
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
        loadPublicationNoticeHandlerCluster,
        loadDossierSupportHandlerCluster,
        loadPartyDeathHandlerCluster,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        publicationNoticeHandlerClusterInput,
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
    });
}
