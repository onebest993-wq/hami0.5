import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyFinancialTab,
    LazyOtherPartyTab,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from '../executionDashboardLazyRegistry';
import { isEncroachmentRemovalClaim } from '@/app/utils/executionModuleStrategies';
import { DebtorFinancialProgressBar as DebtorFinancialProgressBarComponent } from '../components/DebtorFinancialProgressBar';
import { useFollowupModal } from '../followupModalContext';
import {
    resolveActiveFollowupChipTabId,
    resolveFollowupActivePanelKey,
    useFollowupModalTabKeepAlive,
} from '../followupTabKeepAlive';
import {
    prefetchAllExecutionFollowupTabs,
    prefetchExecutionFollowupTab,
} from '../executionFollowupTabPrefetch';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { useExecutionDashboardStore } from '@/app/stores';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';

export type ExecutionFollowupModalPortalController = ReturnType<
    typeof useExecutionFollowupModalPortalController
>;

export function useExecutionFollowupModalPortalController() {

    const {
        CoerciveTab,
        CommunicationsTab,
        DebtorFinancialProgressBar,
        DossierControlsTab,
        FinancialTab,
        OtherPartyTab,
        PersonalTab,
        RequestsTab,
        SeizureRequestsTab,
        activeCoerciveActions,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeDebtorNoticeScope,
        activeFollowupDebtorKey,
        activeNoticeState,
        activeSubFileId,
        activeTimelineEvents,
        allDebtorsUnified,
        appealPerspective,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
        assignmentWorkspaceCtx,
        claimType,
        claimTypeForExecutionModule,
        closeFollowupModalPersisted,
        coerciveUiLocked,
        consumeFollowupExpandProcedure,
        creditorOtherPartyTrackHandlers,
        daysRemainingInGracePeriod,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorForcedToAttend,
        debtorSummonsProfile,
        debtorsSectionRef,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        dossierActionModalSaving,
        effectiveFollowupModalTabs,
        employeeForcedBringAwaitingPersonalOutcome,
        employeePersonalTabUnlockStorageKey,
        evictionHeirsNotificationDateYmd,
        evictionPremisesUseResolved,
        evictionProcedureLockHint,
        evictionProcedureLocked,
        executionCoerciveButtonDisabled,
        executionData,
        executionDataRef,
        executionDebtorTabIndex,
        executionDomainContext,
        executionId,
        executionPaused,
        executionStatus,
        finalizeBreakInventoryEntry,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupExpandProcedureKey,
        followupGarnishmentAmountPreview,
        followupModalBodyScrollRef,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        followupSpecialization,
        hideExecutiveDetentionJudgeCard,
        earnerFinancialPersonalCoerciveActive,
        forcedBringDecisionState,
        forcedSummoningAnalysis,
        getLocalTodayYmd,
        gracePeriodEnded,
        handleCoerciveAction,
        handleDossierAction,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentResolveForcedBringOutcome,
        handleEmployeeAssignmentTerminate,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEncroachmentExpenseRecorded,
        handleEndGracePeriod,
        handleEvictionHeirsNotificationDateChange,
        handleGuarantorRequestFromFollowup,
        handleIssueHeirsExecutionNoticeMemo,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
        headerFields,
        hideCoerciveTabsForDebtorAgent,
        inabaCorrespondenceLog,
        inabaTargets,
        inlineActionGateKey,
        isAlimonyClaimType,
        isEvictionExecutionModule,
        isHistoricalMode,
        isInabaActive,
        isMaritalFurnitureClaim,
        isPersonalStatusExecutionClaim,
        isRepresentingDebtor,
        isSolidaryLiability,
        kasabTerminationEmphasis,
        lawyerStartedPostNoticeExecution,
        maritalFurnitureItemsForFollowup,
        mergeSimilarRecentTimelineEvent,
        nextTimelineId,
        noticeVoluntaryPeriodEndOptimistic,
        openDecisionsModalWithBoot,
        openEvictionResidentialGraceModal,
        openExecutionSeizuresTab,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        openOtherPartyAppealsModal,
        openPoliceAssistanceDetailsForDecision,
        openSeizureRequestsTab,
        otherPartyCreditorMirrorProps,
        otherPartyTabSubmitHandler,
        paidDebt,
        parentDossierId,
        persistExecutionMerge,
        persistFollowupModalViewport,
        persistGuarantorFollowupDetails,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        pushTimelineEvent,
        queueMicrotask,
        registerDebtorVoluntaryAttendance,
        remaining,
        remainingBalanceForSeizure,
        requestFollowupSeizureDecision,
        requestGuarantorSeizure,
        residentialGraceAllowsFieldwork,
        residentialGracePeriodSaved,
        resolvedEmployeeSummonsAssignment,
        runSpecialFollowupSubmit: submitSpecialFollowupRequest,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePoliceAssistanceEntry,
        saveJudicialCustodianEntry,
        saveSeizedMovableInitForDecision,
        saveSeizedPropertyInitForDecision,
        saveStandaloneExecutionMarkForDecision,
        saveThirdPartySeizureForDecision,
        seizureDetailCompletion,
        seizureMatrix,
        setActiveNoticeState,
        setDebtorArrested,
        setDebtorForcedToAttend,
        setDossierActionModalSaving,
        setEncroachmentCaseExpenses,
        setExecutionDebtorTabIndex,
        setExecutionStorageTick,
        setInlineActionGateKey,
        setNonInterferenceIssued,
        setPersonalTabUnlockByDebtor,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setTimelineEvents,
        setUnifiedModalTab,
        settlementGuarantorGate,
        showBreakInventoryRequest,
        showEmployeeAssignmentCoerciveBlock,
        showGuarantorInSeizureFollowupTab,
        showPersonalCoerciveFollowupTab,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        showToast,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestTemplatePick,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        stayOfExecutionActive,
        totalOwed,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        unifiedModalTab,
        viewExecutionData,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic
    } = useFollowupModal();

    const handleDossierActionRef = useRef(handleDossierAction);
    const submitSpecialFollowupRequestRef = useRef(submitSpecialFollowupRequest);
    useEffect(() => {
        handleDossierActionRef.current = handleDossierAction;
    }, [handleDossierAction]);
    useEffect(() => {
        submitSpecialFollowupRequestRef.current = submitSpecialFollowupRequest;
    }, [submitSpecialFollowupRequest]);

    const awaitLiveFollowupHandler = useCallback(
        async <T extends (...args: never[]) => unknown>(
            readHandler: () => T | undefined,
            loadBridge: () => Promise<void>,
            prefetchMode: 'followup-dossier-controls' | 'followup-admin-special',
        ): Promise<T | null> => {
            const immediate = readHandler();
            if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
                return immediate;
            }
            const { prefetchExecutionCoreHandlers } = await import('../executionCoreHandlersPrefetch');
            prefetchExecutionCoreHandlers(prefetchMode);
            await loadBridge();
            const deadline = Date.now() + 2400;
            while (Date.now() < deadline) {
                const candidate = readHandler();
                if (typeof candidate === 'function' && !isExecutionHandlerStubLeaf(candidate)) {
                    return candidate;
                }
                await new Promise((resolve) => setTimeout(resolve, 80));
            }
            return null;
        },
        [],
    );

    const TabPersonal = PersonalTab ?? LazyPersonalTab;
    const TabCoercive = CoerciveTab ?? LazyCoerciveTab;
    const TabSeizureRequests = SeizureRequestsTab ?? LazySeizureRequestsTab;
    const TabFinancial = FinancialTab ?? LazyFinancialTab;
    const TabOtherParty = OtherPartyTab ?? LazyOtherPartyTab;
    const TabCommunications = CommunicationsTab ?? LazyCommunicationsTab;
    const TabDossierControls = DossierControlsTab ?? LazyDossierControlsTab;
    const TabRequests = RequestsTab ?? LazyRequestsTab;
    const ProgressBar = DebtorFinancialProgressBar ?? DebtorFinancialProgressBarComponent;
    const spec = useMemo(() => {
        const base = (followupSpecialization ?? {}) as Record<string, unknown>;
        const encroachmentClaimActive = isEncroachmentRemovalClaim(
            String(claimTypeForExecutionModule || claimType || ''),
        );
        if (!encroachmentClaimActive) return base;
        return {
            ...base,
            showEncroachmentRemovalRequestCards: true,
        };
    }, [claimType, claimTypeForExecutionModule, followupSpecialization]);
    const workspaceCtx = assignmentWorkspaceCtx ?? { activeDebtorKey: '' };
    const safeCloseFollowupModalPersisted = useCallback(() => {
        try {
            if (typeof closeFollowupModalPersisted === 'function') {
                closeFollowupModalPersisted();
            } else if (typeof persistFollowupModalViewport === 'function') {
                persistFollowupModalViewport();
            } else if (typeof setShowUnifiedExecutionModal === 'function') {
                setShowUnifiedExecutionModal(false);
            }
        } finally {
            // مصدر الحقيقة: أغلق الـ store دائماً حتى لو كان close من الـ snapshot stubاً صامتاً
            useExecutionDashboardStore.getState().closeModal('showUnifiedExecutionModal');
        }
    }, [closeFollowupModalPersisted, persistFollowupModalViewport, setShowUnifiedExecutionModal]);

    const debtorsUnified = Array.isArray(allDebtorsUnified) ? allDebtorsUnified : [];
    const followupModalTabs = Array.isArray(effectiveFollowupModalTabs) ? effectiveFollowupModalTabs : [];
    const followupSectionTabOrder = useMemo(
        () => followupModalTabs.map((tab) => String(tab.id)),
        [followupModalTabs],
    );
    const [localUnifiedModalTab, setLocalUnifiedModalTab] = useState(unifiedModalTab);

    useEffect(() => {
        setLocalUnifiedModalTab(unifiedModalTab);
    }, [unifiedModalTab]);

    const commitFollowupTabChange = useCallback(
        (nextTab: typeof unifiedModalTab) => {
            setLocalUnifiedModalTab(nextTab);
            if (typeof setUnifiedModalTab === 'function') {
                setUnifiedModalTab(nextTab);
            }
            queueMicrotask(() => persistFollowupModalViewport());
        },
        [persistFollowupModalViewport, queueMicrotask, setUnifiedModalTab],
    );

    const activePanelKey = useMemo(
        () =>
            resolveFollowupActivePanelKey({
                unifiedModalTab: localUnifiedModalTab,
                showPersonalCoerciveFollowupTab,
                hideFollowupCoerciveTab: spec.hideFollowupCoerciveTab,
                effectiveFollowupSectionTabOrder: followupSectionTabOrder,
            }),
        [localUnifiedModalTab, showPersonalCoerciveFollowupTab, spec.hideFollowupCoerciveTab, followupSectionTabOrder],
    );
    const activeChipTabId = useMemo(
        () =>
            resolveActiveFollowupChipTabId({
                unifiedModalTab: localUnifiedModalTab,
                showPersonalCoerciveFollowupTab,
                hideFollowupCoerciveTab: spec.hideFollowupCoerciveTab,
                effectiveFollowupSectionTabOrder: followupSectionTabOrder,
            }),
        [localUnifiedModalTab, showPersonalCoerciveFollowupTab, spec.hideFollowupCoerciveTab, followupSectionTabOrder],
    );
    const panelsToRender = useFollowupModalTabKeepAlive(activePanelKey);

    const scrollFollowupChipIntoView = useCallback(
        (tabId: string) => {
            queueMicrotask(() => {
                const host = followupModalSectionTabsRef.current;
                if (!host) return;
                const chip = host.querySelector(`[data-followup-tab="${String(tabId)}"]`) as HTMLElement | null;
                chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },
        [followupModalSectionTabsRef, queueMicrotask],
    );

    const switchFollowupTab = useCallback(
        (nextTab: string) => {
            prefetchExecutionFollowupTab(nextTab);
            if (nextTab === 'seizure_requests') {
                setLocalUnifiedModalTab('seizure_requests');
                openSeizureRequestsTab();
                queueMicrotask(() => persistFollowupModalViewport());
                scrollFollowupChipIntoView('seizure_requests');
                return;
            }
            commitFollowupTabChange(nextTab);
            scrollFollowupChipIntoView(nextTab);
        },
        [
            commitFollowupTabChange,
            openSeizureRequestsTab,
            persistFollowupModalViewport,
            queueMicrotask,
            scrollFollowupChipIntoView,
        ],
    );

    const navigateFollowupTabByDelta = useCallback(
        (delta: number) => {
            const order = followupModalTabs.map((tab) => tab.id);
            if (!order.length) return;
            const currentTab = order.includes(activeChipTabId) ? activeChipTabId : order[0];
            const currentIndex = order.indexOf(currentTab);
            const nextTab = order[(currentIndex + delta + order.length) % order.length];
            switchFollowupTab(nextTab);
        },
        [activeChipTabId, followupModalTabs, switchFollowupTab],
    );

    const handleSpecialFollowupSubmit = useCallback(() => {
        if (isRepresentingDebtor) {
            showToast('غير متاح لوكيل المدين: طلبات الإدارة الخاصة', 'warning');
            return undefined;
        }
        const immediate = submitSpecialFollowupRequestRef.current;
        if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
            return immediate();
        }
        void (async () => {
            const { loadExecutionHandlerClusterFollowupAdminSpecialBridge } = await import(
                '../executionDashboardHandlerClusterBridgeLazy'
            );
            const live = await awaitLiveFollowupHandler(
                () => submitSpecialFollowupRequestRef.current,
                loadExecutionHandlerClusterFollowupAdminSpecialBridge,
                'followup-admin-special',
            );
            if (live) {
                live();
                return;
            }
            showToast('جاري تجهيز أدوات الطلبات — أعد المحاولة بعد لحظة.', 'info');
        })();
        return undefined;
    }, [awaitLiveFollowupHandler, isRepresentingDebtor, showToast]);

    const safeHandleDossierAction = useCallback(
        async (payload: unknown) => {
            const immediate = handleDossierActionRef.current;
            if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
                return await immediate(payload);
            }
            const { loadExecutionHandlerClusterFollowupDossierControlsBridge } = await import(
                '../executionDashboardHandlerClusterBridgeLazy'
            );
            const live = await awaitLiveFollowupHandler(
                () => handleDossierActionRef.current,
                loadExecutionHandlerClusterFollowupDossierControlsBridge,
                'followup-dossier-controls',
            );
            if (live) {
                return await live(payload);
            }
            showToast('جاري تجهيز أدوات الإضبارة — أعد المحاولة بعد لحظة.', 'info');
            setDossierActionModalSaving(false);
            return false;
        },
        [awaitLiveFollowupHandler, setDossierActionModalSaving, showToast],
    );

    useEffect(() => {
        prefetchExecutionFollowupTab(activePanelKey);
    }, [activePanelKey]);

    // بمجرد فتح المحضر: سخّن بقية التبويبات وجسورها عند الخمول —
    // التنقل بين التبويبات يصبح لحظياً بدون Suspense بارد عند أول زيارة.
    useEffect(() => {
        const cancel = scheduleIdleWork(() => prefetchAllExecutionFollowupTabs(), 50);
        return cancel;
    }, []);

    return {
        CoerciveTab,
        CommunicationsTab,
        DebtorFinancialProgressBar,
        DossierControlsTab,
        FinancialTab,
        OtherPartyTab,
        PersonalTab,
        ProgressBar,
        RequestsTab,
        SeizureRequestsTab,
        TabCoercive,
        TabCommunications,
        TabDossierControls,
        TabFinancial,
        TabOtherParty,
        TabPersonal,
        TabRequests,
        TabSeizureRequests,
        activeChipTabId,
        activeCoerciveActions,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeDebtorNoticeScope,
        activeFollowupDebtorKey,
        activeNoticeState,
        activePanelKey,
        activeSubFileId,
        activeTimelineEvents,
        allDebtorsUnified,
        appealPerspective,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
        assignmentWorkspaceCtx,
        claimType,
        claimTypeForExecutionModule,
        closeFollowupModalPersisted,
        coerciveUiLocked,
        commitFollowupTabChange,
        consumeFollowupExpandProcedure,
        creditorOtherPartyTrackHandlers,
        daysRemainingInGracePeriod,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorForcedToAttend,
        debtorSummonsProfile,
        debtorsSectionRef,
        debtorsUnified,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        dossierActionModalSaving,
        earnerFinancialPersonalCoerciveActive,
        effectiveFollowupModalTabs,
        employeeForcedBringAwaitingPersonalOutcome,
        employeePersonalTabUnlockStorageKey,
        evictionHeirsNotificationDateYmd,
        evictionPremisesUseResolved,
        evictionProcedureLockHint,
        evictionProcedureLocked,
        executionCoerciveButtonDisabled,
        executionData,
        executionDataRef,
        executionDebtorTabIndex,
        executionDomainContext,
        executionId,
        executionPaused,
        executionStatus,
        finalizeBreakInventoryEntry,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupExpandProcedureKey,
        followupGarnishmentAmountPreview,
        followupModalBodyScrollRef,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalTabs,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        followupSpecialization,
        forcedBringDecisionState,
        forcedSummoningAnalysis,
        getLocalTodayYmd,
        gracePeriodEnded,
        handleCoerciveAction,
        handleDossierAction: safeHandleDossierAction,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentResolveForcedBringOutcome,
        handleEmployeeAssignmentTerminate,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEncroachmentExpenseRecorded,
        handleEndGracePeriod,
        handleEvictionHeirsNotificationDateChange,
        handleGuarantorRequestFromFollowup,
        handleIssueHeirsExecutionNoticeMemo,
        handleSpecialFollowupSubmit,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
        headerFields,
        hideCoerciveTabsForDebtorAgent,
        hideExecutiveDetentionJudgeCard,
        inabaCorrespondenceLog,
        inabaTargets,
        inlineActionGateKey,
        isAlimonyClaimType,
        isEvictionExecutionModule,
        isHistoricalMode,
        isInabaActive,
        isMaritalFurnitureClaim,
        isPersonalStatusExecutionClaim,
        isRepresentingDebtor,
        isSolidaryLiability,
        kasabTerminationEmphasis,
        lawyerStartedPostNoticeExecution,
        maritalFurnitureItemsForFollowup,
        mergeSimilarRecentTimelineEvent,
        navigateFollowupTabByDelta,
        nextTimelineId,
        noticeVoluntaryPeriodEndOptimistic,
        openDecisionsModalWithBoot,
        openEvictionResidentialGraceModal,
        openExecutionSeizuresTab,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        openOtherPartyAppealsModal,
        openPoliceAssistanceDetailsForDecision,
        openSeizureRequestsTab,
        otherPartyCreditorMirrorProps,
        otherPartyTabSubmitHandler,
        paidDebt,
        panelsToRender,
        parentDossierId,
        persistExecutionMerge,
        persistFollowupModalViewport,
        persistGuarantorFollowupDetails,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        pushTimelineEvent,
        queueMicrotask,
        registerDebtorVoluntaryAttendance,
        remaining,
        remainingBalanceForSeizure,
        requestFollowupSeizureDecision,
        requestGuarantorSeizure,
        residentialGraceAllowsFieldwork,
        residentialGracePeriodSaved,
        resolvedEmployeeSummonsAssignment,
        safeCloseFollowupModalPersisted,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePoliceAssistanceEntry,
        saveJudicialCustodianEntry,
        saveSeizedMovableInitForDecision,
        saveSeizedPropertyInitForDecision,
        saveStandaloneExecutionMarkForDecision,
        saveThirdPartySeizureForDecision,
        scrollFollowupChipIntoView,
        seizureDetailCompletion,
        seizureMatrix,
        setActiveNoticeState,
        setDebtorArrested,
        setDebtorForcedToAttend,
        setDossierActionModalSaving,
        setEncroachmentCaseExpenses,
        setExecutionDebtorTabIndex,
        setExecutionStorageTick,
        setInlineActionGateKey,
        setNonInterferenceIssued,
        setPersonalTabUnlockByDebtor,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setTimelineEvents,
        setUnifiedModalTab,
        settlementGuarantorGate,
        showBreakInventoryRequest,
        showEmployeeAssignmentCoerciveBlock,
        showGuarantorInSeizureFollowupTab,
        showPersonalCoerciveFollowupTab,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        showToast,
        spec,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestTemplatePick,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        stayOfExecutionActive,
        submitSpecialFollowupRequest,
        switchFollowupTab,
        totalOwed,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        unifiedModalTab,
        viewExecutionData,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
        workspaceCtx,
    };
}
