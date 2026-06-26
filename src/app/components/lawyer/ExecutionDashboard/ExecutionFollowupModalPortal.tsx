import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyEvictionFieldProceduresPanel,
    LazyFinancialTab,
    LazyOtherPartyActionsLog,
    LazyOtherPartyTab,
    LazyPersonalCoerciveFollowupPanel,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from './executionDashboardLazyRegistry';
import { EXEC_SECTION_LAZY_FALLBACK } from './executionDashboardLazyShellUi';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { EVICTION_TIMELINE_ACTION_IDS, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import SecureStoreService from '@/app/services/SecureStoreService';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/coerciveDebtorScope';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { useFollowupModal } from './followupModalContext';
import { assignMutableRefCurrent } from './utils/assignMutableRefCurrent';
import { DebtorFinancialProgressBar as DebtorFinancialProgressBarComponent } from './components/DebtorFinancialProgressBar';
import { FollowupTabKeepAlivePanel } from './components/FollowupTabKeepAlivePanel';
import {
    resolveFollowupActivePanelKey,
    useFollowupModalTabKeepAlive,
} from './followupTabKeepAlive';
import { prefetchExecutionFollowupTab } from './executionFollowupTabPrefetch';

export function ExecutionFollowupModalPortal() {
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
        goFollowupSectionTabByDelta,
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
        isFollowupTabActive,
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
        runSpecialFollowupSubmit,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePoliceAssistanceEntry,
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

    const TabPersonal = PersonalTab ?? LazyPersonalTab;
    const TabCoercive = CoerciveTab ?? LazyCoerciveTab;
    const TabSeizureRequests = SeizureRequestsTab ?? LazySeizureRequestsTab;
    const TabFinancial = FinancialTab ?? LazyFinancialTab;
    const TabOtherParty = OtherPartyTab ?? LazyOtherPartyTab;
    const TabCommunications = CommunicationsTab ?? LazyCommunicationsTab;
    const TabDossierControls = DossierControlsTab ?? LazyDossierControlsTab;
    const TabRequests = RequestsTab ?? LazyRequestsTab;
    const ProgressBar = DebtorFinancialProgressBar ?? DebtorFinancialProgressBarComponent;
    const spec = followupSpecialization ?? {};
    const workspaceCtx = assignmentWorkspaceCtx ?? { activeDebtorKey: '' };

    const debtorsUnified = Array.isArray(allDebtorsUnified) ? allDebtorsUnified : [];
    const followupModalTabs = Array.isArray(effectiveFollowupModalTabs) ? effectiveFollowupModalTabs : [];

    const activePanelKey = useMemo(
        () =>
            resolveFollowupActivePanelKey({
                unifiedModalTab,
                showPersonalCoerciveFollowupTab,
                hideFollowupCoerciveTab: spec.hideFollowupCoerciveTab,
            }),
        [unifiedModalTab, showPersonalCoerciveFollowupTab, spec.hideFollowupCoerciveTab],
    );
    const panelsToRender = useFollowupModalTabKeepAlive(activePanelKey);

    useEffect(() => {
        prefetchExecutionFollowupTab(activePanelKey);
    }, [activePanelKey]);

    if (typeof document === 'undefined') return null;

    return createPortal(
                        <div
                            className={`fixed inset-0 ${EXEC_MODAL_BACKDROP_STRONG}`}
                            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
                            role="presentation"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) closeFollowupModalPersisted();
                            }}
                        >
						<div className="w-full" onClick={(e) => e.stopPropagation()}>
							<div className="relative mx-auto flex h-[min(90vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-3xl">
								<div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-3xl">
									<button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeFollowupModalPersisted();
                                    }}
										className="rounded-full p-2 text-slate-200/90 transition-all hover:bg-white/10 hover:text-white"
                                    aria-label="إغلاق محضر المتابعة"
                                >
                                    <X size={20} className="text-white" />
                                </button>
								<h2 className="flex flex-row-reverse items-center gap-2 text-lg font-bold tracking-wide text-amber-200">
                                    <span>محضر المتابعة</span>
									<ClipboardList
										size={22}
										className="shrink-0 text-amber-300 drop-shadow-[0_0_14px_rgba(230,198,115,0.35)]"
									/>
                                </h2>
                                    <span className="w-9" aria-hidden />
                            </div>

                                <div
                                    className="shrink-0 border-b border-white/10 bg-gradient-to-b from-[#0A0F1C]/80 to-transparent px-3 py-2.5"
                                    dir="rtl"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold text-slate-500">أقسام المحضر</p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => goFollowupSectionTabByDelta(-1)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                                                title="التبويب السابق (Alt + ←)"
                                                aria-label="التبويب السابق"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => goFollowupSectionTabByDelta(1)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                                                title="التبويب التالي (Alt + →)"
                                                aria-label="التبويب التالي"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        ref={(el) => {
                                            assignMutableRefCurrent(followupModalChipTablistRef, el);
                                            assignMutableRefCurrent(followupModalSectionTabsRef, el);
                                        }}
                                        role="tablist"
                                        aria-label="أقسام محضر المتابعة"
                                        className="flex gap-1.5 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                        onWheelCapture={(e) => {
                                            const el = e.currentTarget;
                                            if (el.scrollWidth <= el.clientWidth) return;
                                            const delta =
                                                Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                                            if (delta === 0) return;
                                            e.preventDefault();
                                            el.scrollLeft += delta;
                                        }}
                                    >
                                        {followupModalTabs.map((tab) => {
                                            const active = isFollowupTabActive(tab.id);
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    role="tab"
                                                    data-followup-tab={tab.id}
                                                    aria-selected={active}
                                                    onClick={() => {
                                                        prefetchExecutionFollowupTab(tab.id);
                                                        if (tab.id === 'seizure_requests') {
                                                            openSeizureRequestsTab();
                                                            return;
                                                        }
                                                        setUnifiedModalTab(tab.id);
                                                        queueMicrotask(() => persistFollowupModalViewport());
                                                    }}
                                                    title={
                                                        tab.id === 'personal' && personalTabLockedForEmployee
                                                            ? 'المدين موظف — الخيارات مقفلة حتى فك القفل'
                                                            : undefined
                                                    }
                                                    className={`flex shrink-0 snap-start flex-row-reverse items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[11px] font-bold transition-all ${
                                                        active
                                                            ? 'border-amber-400/35 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-50 shadow-[0_0_22px_-8px_rgba(230,198,115,0.45)]'
                                                            : 'border-transparent bg-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-slate-200'
                                                    }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

								<div
                                    ref={followupModalBodyScrollRef}
                                    onScroll={() => persistFollowupModalViewport()}
                                    className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                                >
                                {!isSolidaryLiability && debtorsUnified.length > 1 ? (
                                    <div className="sticky top-0 z-[5] border-b border-slate-700/50 bg-[#0B1120]/98 px-2 pt-2 pb-2 backdrop-blur-md">
                                        <p className="mb-1 px-1 text-right text-[9px] text-slate-500">
                                            مدينو الإضبارة — ذمة مستقلة لكل منهم (اختر التبويب قبل الإجراء)
                                        </p>
                                        <div
                                            ref={followupModalDebtorTabsRef}
                                            className="scrollbar-hide flex gap-1 overflow-x-auto pb-1"
                                        >
                                            {debtorsUnified.map((d, i) => (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExecutionDebtorTabIndex(i);
                                                    }}
                                                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                                                        executionDebtorTabIndex === i
                                                            ? 'border-amber-500/50 bg-amber-950/40 text-amber-100'
                                                            : 'border-slate-600/40 bg-slate-900/60 text-slate-400 hover:border-slate-500/50'
                                                    }`}
                                                >
                                                    {`مدين ${i + 1}`}
                                                </button>
                                            ))}
                                        </div>
                                        {debtorsUnified[executionDebtorTabIndex] ? (
                                            <>
                                                <ProgressBar
                                                    allocated={
                                                        debtorsUnified[executionDebtorTabIndex].allocated_debt
                                                    }
                                                    paid={debtorsUnified[executionDebtorTabIndex].paid_amount}
                                                    label="حصة المدين النشط"
                                                />
                                                <div className="flex justify-end px-1 -mt-1 pb-1">
                                                    <span className="text-[10px] text-slate-500">
                                                        {`المدين النشط: مدين ${executionDebtorTabIndex + 1}`}
                                                    </span>
                                                </div>
                                                {debtorsUnified[executionDebtorTabIndex].cleared ? (
                                                    <div className="flex justify-end px-1 pb-1">
                                                        <span className="rounded-lg border border-emerald-500/45 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                                            براءة ذمة / Cleared
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}

                                {isSolidaryLiability && debtorsUnified.length >= 1 ? (
                                    <div className="border-b border-amber-500/25 bg-slate-900/50 px-3 py-2">
                                        <p className="mb-2 text-right text-[10px] font-bold text-amber-200/90">
                                            تضامن — عرض موحّد لجميع المدينين
                                        </p>
                                        <ul className="mb-2 space-y-1 text-right text-[11px] text-slate-300">
                                            {debtorsUnified.map((d, idx) => (
                                                <li key={d.id}>
                                                    • {`مدين ${idx + 1}`}
                                                    {d.cleared ? (
                                                        <span className="mr-1 text-[9px] text-emerald-400">
                                                            (براءة ذمة جزئية)
                                                        </span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                        <ProgressBar
                                            allocated={totalOwed}
                                            paid={paidDebt}
                                            label="تقدّم الإضبارة (إجمالي)"
                                        />
                                    </div>
                                ) : null}

                                {panelsToRender.has('personal') && showPersonalCoerciveFollowupTab ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="personal"
                                        active={activePanelKey === 'personal'}
                                    >
                                    <TabPersonal
                                        personalTabLockedForEmployee={personalTabLockedForEmployee}
                                        onConfirmUnlock={() =>
                                            setPersonalTabUnlockByDebtor((prev) => {
                                                const next = { ...prev, [activeFollowupDebtorKey]: true };
                                                if (employeePersonalTabUnlockStorageKey) {
                                                    try {
                                                        SecureStoreService.setItemSync(
                                                            employeePersonalTabUnlockStorageKey,
                                                            JSON.stringify(next)
                                                        );
                                                    } catch {}
                                                }
                                                return next;
                                            })
                                        }
                                        activeNoticeState={activeNoticeState}
                                        debtorSummonsProfile={debtorSummonsProfile}
                                        setDebtorForcedToAttend={setDebtorForcedToAttend}
                                        setActiveNoticeState={setActiveNoticeState}
                                        showToast={showToast}
                                        setNonInterferenceIssued={setNonInterferenceIssued}
                                        debtorArrested={debtorArrested}
                                        setDebtorArrested={setDebtorArrested}
                                        showEmployeeAssignmentCoerciveBlock={showEmployeeAssignmentCoerciveBlock}
                                        resolvedEmployeeSummonsAssignment={resolvedEmployeeSummonsAssignment}
                                        EXEC_SECTION_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                                        LazyEmployeeAssignmentCoerciveFollowupBlock={LazyEmployeeAssignmentCoerciveFollowupBlock}
                                        forcedBringDecisionState={forcedBringDecisionState}
                                        employeeForcedBringAwaitingPersonalOutcome={employeeForcedBringAwaitingPersonalOutcome}
                                        LazyPersonalCoerciveFollowupPanel={LazyPersonalCoerciveFollowupPanel}
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        decisionsReloadEpoch={decisionsReloadEpoch}
                                        coerciveUiLocked={coerciveUiLocked}
                                        debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                                        debtorForcedToAttend={debtorForcedToAttend}
                                        voluntaryAttendanceCount={voluntaryAttendanceCount}
                                        isEvictionExecutionModule={isEvictionExecutionModule}
                                        executionData={viewExecutionData}
                                        voluntaryEndOptimistic={voluntaryEndOptimistic}
                                        noticeVoluntaryPeriodEndOptimistic={noticeVoluntaryPeriodEndOptimistic}
                                        forcedSummoningAnalysis={forcedSummoningAnalysis}
                                        viewExecutionData={viewExecutionData}
                                        isHistoricalMode={isHistoricalMode}
                                        remaining={remaining}
                                        persistExecutionMerge={persistExecutionMerge}
                                        pushTimelineEvent={pushTimelineEvent}
                                        nextTimelineId={nextTimelineId}
                                        assignmentWorkspaceCtx={workspaceCtx}
                                        primaryDebtorKeyResolved={primaryDebtorKeyResolved}
                                        onOpenDecisions={openDecisionsModalWithBoot}
                                        onOpenSummonsCenter={() => {
                                            setSummonsContextDebtorKey(
                                                String(workspaceCtx.activeDebtorKey)
                                            );
                                            setSummonsHubInitialMainTab('tabligh');
                                            setShowUnifiedSummonsModal(true);
                                        }}
                                        onOpenGuarantorDetails={() => {
                                            setShowUnifiedExecutionModal(false);
                                            setExecutionDebtorTabIndex(0);
                                            if (primaryDebtorWorkspaceKey) {
                                                debtorsSectionRef.current?.expandDebtor(
                                                    primaryDebtorWorkspaceKey
                                                );
                                            }
                                            openGuarantorDetailsModal();
                                        }}
                                        kasabTerminationEmphasis={kasabTerminationEmphasis}
                                        activeDebtorIsEmployee={activeDebtorIsEmployee}
                                        hidePersonalJudgePresentation={
                                            spec.hidePersonalJudgePresentation ||
                                            activeDebtorIsEmployee
                                        }
                                        hideExecutiveDetentionJudgeCard={
                                            hideExecutiveDetentionJudgeCard ||
                                            activeDebtorIsEmployee
                                        }
                                        earnerFinancialPersonalCoerciveActive={
                                            earnerFinancialPersonalCoerciveActive
                                        }
                                        hidePersonalForcedBringActivation={
                                            earnerFinancialPersonalCoerciveActive
                                                ? false
                                                : spec.hidePersonalForcedBringActivation
                                        }
                                        activeDebtorNoticeScope={activeDebtorNoticeScope}
                                        handleEmployeeAssignmentRequestInvestigation={handleEmployeeAssignmentRequestInvestigation}
                                        handleEmployeeRegisterArrestOrder={handleEmployeeRegisterArrestOrder}
                                        handleEmployeeAssignmentRequestForcedBring={handleEmployeeAssignmentRequestForcedBring}
                                        handleEmployeeAssignmentResolveForcedBringOutcome={handleEmployeeAssignmentResolveForcedBringOutcome}
                                        handleEmployeeWarrantOutcome={handleEmployeeWarrantOutcome}
                                        handleEmployeeAssignmentTerminate={handleEmployeeAssignmentTerminate}
                                    />
                                    </FollowupTabKeepAlivePanel>
								) : null}

                                {panelsToRender.has('coercive') && !spec.hideFollowupCoerciveTab ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="coercive"
                                        active={activePanelKey === 'coercive'}
                                        className="p-4 sm:p-5 space-y-4"
                                    >
                                        <TabCoercive
                                            coerciveUiLocked={coerciveUiLocked}
                                            isEvictionExecutionModule={isEvictionExecutionModule}
                                            executionData={viewExecutionData}
                                            gracePeriodEnded={gracePeriodEnded}
                                            daysRemainingInGracePeriod={daysRemainingInGracePeriod}
                                            executionStatus={executionStatus}
                                            debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                                            lawyerStartedPostNoticeExecution={lawyerStartedPostNoticeExecution}
                                            registerDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendance}
                                            openExecutionSeizuresTab={openExecutionSeizuresTab}
                                            EXEC_OVERLAY_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                                            LazyEvictionFieldProceduresPanel={LazyEvictionFieldProceduresPanel}
                                            evictionProcedureLocked={evictionProcedureLocked}
                                            evictionProcedureLockHint={evictionProcedureLockHint}
                                            activeTimelineEvents={activeTimelineEvents}
                                            evictionPremisesUseResolved={evictionPremisesUseResolved}
                                            showResidentialEvictionGraceControl={showResidentialEvictionGraceControl}
                                            residentialGracePeriodSaved={residentialGracePeriodSaved}
                                            openEvictionResidentialGraceModal={openEvictionResidentialGraceModal}
                                            showResidentialGraceEarlyEndRequest={showResidentialGraceEarlyEndRequest}
                                            showBreakInventoryRequest={showBreakInventoryRequest}
                                            showEvictionFieldworkRequests={residentialGraceAllowsFieldwork}
                                            evictionHeirsNotificationDateYmd={evictionHeirsNotificationDateYmd}
                                            handleEvictionHeirsNotificationDateChange={handleEvictionHeirsNotificationDateChange}
                                            handleIssueHeirsExecutionNoticeMemo={handleIssueHeirsExecutionNoticeMemo}
                                            appendEvictionProcedure={appendEvictionProcedure}
                                            tryOpenPendingBreakInventoryLedger={tryOpenPendingBreakInventoryLedger}
                                            tryOpenPendingCustodianDetails={tryOpenPendingCustodianDetails}
                                            openPoliceAssistanceDetails={openPoliceAssistanceDetailsForDecision}
                                            savePoliceAssistance={savePoliceAssistanceEntry}
                                            saveBreakInventoryLedger={saveBreakInventoryLedgerEntry}
                                            finalizeBreakInventoryRequest={finalizeBreakInventoryEntry}
                                            isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                                            maritalFurnitureItems={maritalFurnitureItemsForFollowup}
                                            saveMaritalFurnitureDeliveryInventory={
                                                saveMaritalFurnitureDeliveryInventoryEntry
                                            }
                                            expandProcedureKey={followupExpandProcedureKey}
                                            onExpandProcedureConsumed={consumeFollowupExpandProcedure}
                                            followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                                            followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                                            hideCoerciveGraceNoticeBanner={spec.hideCoerciveGraceNoticeBanner}
                                            hideCoerciveFinancialBanners={spec.hideCoerciveFinancialBanners}
                                            hideCoerciveSeizureSalaryAndProperty={spec.hideCoerciveSeizureSalaryAndProperty}
                                            hideEncroachmentEvictionProcedureItems={spec.hideEncroachmentEvictionProcedureItems}
                                            showEncroachmentRemovalRequestCards={
                                                spec.showEncroachmentRemovalRequestCards
                                            }
                                            showSpecificDeliverySurveyorCard={
                                                spec.showSpecificDeliverySurveyorCard
                                            }
                                            showSpecificDeliveryConversionCard={
                                                spec.showSpecificDeliveryConversionCard
                                            }
                                            hideEvictionCustodianProcedure={
                                                spec.hideEvictionCustodianProcedure
                                            }
                                            showSpecificDeliveryBreakInventoryCard={
                                                spec.showSpecificDeliveryBreakInventoryCard
                                            }
                                            showSpecificDeliveryFieldProcedures={
                                                spec.showSpecificDeliveryFieldProcedures
                                            }
                                            showGenericFieldProcedureCards={
                                                spec.showSpecificDeliveryFieldProcedures &&
                                                !isMaritalFurnitureClaim
                                            }
                                            hideFollowupCoerciveTab={
                                                spec.hideFollowupCoerciveTab
                                            }
                                            isSpecificDeliveryModule={isSpecificDeliveryClaim(
                                                claimTypeForExecutionModule
                                            )}
                                            specificDeliveryFinancialized={Boolean(
                                                (executionData as { specificDeliveryFinancialized?: boolean })
                                                    ?.specificDeliveryFinancialized
                                            )}
                                            specificDeliveryItemName={headerFields.specificDeliveryItemName}
                                            specificDeliveryItemNature={headerFields.specificDeliveryItemNature}
                                            specificDeliveryItems={
                                                (executionData as { specificDeliveryItems?: unknown })
                                                    ?.specificDeliveryItems as
                                                    | import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[]
                                                    | undefined
                                            }
                                            debtAmount={executionData?.debtAmount}
                                            totalAmount={executionData?.totalAmount}
                                            specificDeliveryConvertedAmount={specificDeliveryConvertedAmount ?? 0}
                                            onSpecificDeliveryFinancialized={handleSpecificDeliveryFinancialized}
                                            onSpecificDeliveryItemDeclaredDestroyed={
                                                handleSpecificDeliveryItemDeclaredDestroyed
                                            }
                                            onEncroachmentExpenseRecorded={handleEncroachmentExpenseRecorded}
                                            onSpecificDeliveryExpenseRecorded={handleSpecificDeliveryExpenseRecorded}
                                            executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                                            inlineActionGateKey={inlineActionGateKey}
                                            setInlineActionGateKey={setInlineActionGateKey}
                                            handleCoerciveAction={handleCoerciveAction}
                                            handleEndGracePeriod={handleEndGracePeriod}
                                            appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                                            decisionsStorageExecutionId={decisionsStorageExecutionId}
                                            showToast={showToast}
                                            EVICTION_TIMELINE_ACTION_IDS={EVICTION_TIMELINE_ACTION_IDS}
                                            activeDebtorIsEmployee={activeDebtorIsEmployee}
                                            activeCoerciveActions={activeCoerciveActions}
                                            followupSalarySeizureLabel={followupSalarySeizureLabel}
                                            followupGarnishmentAmountPreview={followupGarnishmentAmountPreview}
                                        />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('financial') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="financial"
                                        active={activePanelKey === 'financial'}
                                    >
                                    <TabFinancial openFinancialHubLedger={openFinancialHubLedger} />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('other_party') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="other_party"
                                        active={activePanelKey === 'other_party'}
                                    >
                                    <TabOtherParty
                                        executionData={viewExecutionData}
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        persistExecutionMerge={persistExecutionMerge}
                                        handleOtherPartyActionSubmitToDecisions={otherPartyTabSubmitHandler}
                                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                                        LazyOtherPartyActionsLog={LazyOtherPartyActionsLog}
                                        showCreditorRequestsMirror={isRepresentingDebtor}
                                        creditorRequestsMirror={otherPartyCreditorMirrorProps ?? undefined}
                                        onOpenAppeals={openOtherPartyAppealsModal}
                                        creditorTrackHandlers={creditorOtherPartyTrackHandlers}
                                        appealPerspective={appealPerspective}
                                    />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('seizure_requests') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="seizure_requests"
                                        active={activePanelKey === 'seizure_requests'}
                                    >
                                    <TabSeizureRequests
                                        executionId={decisionsStorageExecutionId ?? executionId}
                                        executionData={viewExecutionData}
                                        remainingBalanceIqd={remainingBalanceForSeizure}
                                        financialCenterTotalIqd={remainingBalanceForSeizure}
                                        seizureMatrix={seizureMatrix}
                                        seizureDetailCompletion={seizureDetailCompletion}
                                        saveCoerciveAction={saveCoerciveAction}
                                        persistExecutionMerge={persistExecutionMerge}
                                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                                        pushTimelineEvent={pushTimelineEvent}
                                        nextTimelineId={nextTimelineId}
                                        getLocalTodayYmd={getLocalTodayYmd}
                                        showToast={showToast}
                                        activeDebtorIsDeceased={activeDebtorIsDeceased}
                                        activeDebtorIsEmployee={activeDebtorIsEmployee}
                                        executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                                        coerciveUiLocked={coerciveUiLocked}
                                        isHistoricalMode={isHistoricalMode}
                                        inlineActionGateKey={inlineActionGateKey}
                                        setInlineActionGateKey={setInlineActionGateKey}
                                        handleCoerciveAction={handleCoerciveAction}
                                        handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                                        requestFollowupSeizureDecision={requestFollowupSeizureDecision}
                                        saveSeizedPropertyInitForDecision={saveSeizedPropertyInitForDecision}
                                        saveSeizedMovableInitForDecision={saveSeizedMovableInitForDecision}
                                        saveThirdPartySeizureForDecision={saveThirdPartySeizureForDecision}
                                        saveStandaloneExecutionMarkForDecision={
                                            saveStandaloneExecutionMarkForDecision
                                        }
                                        requestGuarantorSeizure={requestGuarantorSeizure}
                                        forceHideGuarantorSeizureSubTab={
                                            spec.hideGuarantorSeizureSubTab
                                        }
                                        financialGuarantorRequestOnly={
                                            spec.showFinancialGuarantorRequestOnly
                                        }
                                        isFinancialDebtCollectionClaim={
                                            spec.isFinancialDebtCollection
                                        }
                                        settlementBreachTriggeredAt={
                                            settlementGuarantorGate.settlementBreachTriggeredAt
                                        }
                                        hideAllGuarantorPresence={
                                            spec.hideAllGuarantorPresence
                                        }
                                        ledgerPendingSettlement={
                                            settlementGuarantorGate.pendingSettlement
                                        }
                                        isAlimonyClaim={isAlimonyClaimType}
                                        claimType={claimType}
                                    />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('correspondences') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="correspondences"
                                        active={activePanelKey === 'correspondences'}
                                    >
                                    <TabCommunications
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        showToast={showToast}
                                        showSoftFieldProcedures={
                                            spec.showCorrespondencesSoftProcedures
                                        }
                                        showEncroachmentSurveyor={
                                            spec.showEncroachmentRemovalRequestCards
                                        }
                                        showSpecificDeliverySurveyor={
                                            spec.showSpecificDeliverySurveyorCard
                                        }
                                        inlineActionGateKey={inlineActionGateKey}
                                        setInlineActionGateKey={setInlineActionGateKey}
                                        onEncroachmentExpenseRecorded={(row) => {
                                            setEncroachmentCaseExpenses((prev) => [...prev, row]);
                                        }}
                                        pushTimelineEvent={(event) => {
                                            setTimelineEvents((prev) => {
                                                const next = mergeSimilarRecentTimelineEvent(prev, event);
                                                queueMicrotask(() => {
                                                    persistExecutionMerge({ timelineEvents: next });
                                                    const execId = String(
                                                        executionDataRef.current?.id ?? executionId ?? ''
                                                    );
                                                    if (!execId || execId === 'undefined') return;
                                                    const findEvent = next.find((e) => e.id === event.id) ?? next[0];
                                                    if (!findEvent) return;
                                                    void import('@/app/services/timelineEventsSupabase').then(
                                                        ({ insertTimelineEventToSupabase }) =>
                                                            insertTimelineEventToSupabase({
                                                                executionFileId: execId,
                                                                event: findEvent,
                                                            })
                                                    );
                                                });
                                                return next;
                                            });
                                        }}
                                        nextTimelineId={nextTimelineId}
                                    />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('dossier_controls') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="dossier_controls"
                                        active={activePanelKey === 'dossier_controls'}
                                        className="p-4 sm:p-5"
                                        dir="rtl"
                                    >
                                        <TabDossierControls
                                            parentFileId={parentDossierId}
                                            decisionsStorageExecutionId={decisionsStorageExecutionId}
                                            appealPerspective={appealPerspective}
                                            inabaTargets={inabaTargets}
                                            inabaCorrespondenceLog={inabaCorrespondenceLog}
                                            onExecutorOutcomeApplied={() => {
                                                setExecutionStorageTick((t) => t + 1);
                                            }}
                                            showInabaCorrespondence={
                                                activeSubFileId === null &&
                                                !isInabaActive &&
                                                inabaTargets.length > 0
                                            }
                                            showRenew={
                                                activeSubFileId === null &&
                                                (executionPaused ||
                                                    stayOfExecutionActive ||
                                                    normalizeDossierLifecycleStatus(
                                                        (executionData as any)?.dossier_lifecycle_status
                                                    ) === 'paused' ||
                                                    normalizeDossierLifecycleStatus(
                                                        (executionData as any)?.dossier_lifecycle_status
                                                    ) === 'suspended')
                                            }
                                            saving={dossierActionModalSaving}
                                            onSubmit={(payload) => {
                                                setDossierActionModalSaving(true);
                                                return handleDossierAction(payload);
                                            }}
                                        />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('admin') ? (
                                    <FollowupTabKeepAlivePanel
                                        panelId="admin"
                                        active={activePanelKey === 'admin'}
                                    >
                                    <TabRequests
                                        executionId={decisionsStorageExecutionId ?? executionId}
                                        appealPerspective={appealPerspective}
                                        specialRequestTemplatePick={specialRequestTemplatePick}
                                        setSpecialRequestTemplatePick={setSpecialRequestTemplatePick}
                                        specialRequestDate={specialRequestDate}
                                        setSpecialRequestDate={setSpecialRequestDate}
                                        specialRequestContent={specialRequestContent}
                                        setSpecialRequestContent={setSpecialRequestContent}
                                        specialRequestManualTitle={specialRequestManualTitle}
                                        setSpecialRequestManualTitle={setSpecialRequestManualTitle}
                                        inlineActionGateKey={inlineActionGateKey}
                                        setInlineActionGateKey={setInlineActionGateKey}
                                        runSpecialFollowupSubmit={runSpecialFollowupSubmit}
                                        activeDebtorIsDeceased={activeDebtorIsDeceased}
                                        activeDebtorIsLegalEntity={activeDebtorIsLegalEntity}
                                        hideHiddenFollowupRequests={
                                            activeDebtorIsLegalEntity || hideCoerciveTabsForDebtorAgent
                                        }
                                        hiddenFollowupRequestOptions={{
                                            domainContext: executionDomainContext,
                                            flags: {
                                                ...spec,
                                                showPersonalCoerciveFollowupTab,
                                                showGuarantorInSeizureTab:
                                                    showGuarantorInSeizureFollowupTab,
                                                isPersonalStatusExecutionClaim,
                                                isAlimonyClaim: isAlimonyClaimType,
                                                activeDebtorIsEmployee,
                                                showHiddenExecutiveDossierPresentation:
                                                    !hideExecutiveDetentionJudgeCard &&
                                                    !activeDebtorIsEmployee &&
                                                    remainingBalanceForSeizure > 0,
                                            },
                                            guarantorCtx: {
                                                executionData: viewExecutionData,
                                                settlementBreachTriggeredAt:
                                                    settlementGuarantorGate.settlementBreachTriggeredAt,
                                                ledgerPendingSettlement:
                                                    settlementGuarantorGate.pendingSettlement,
                                                financialCenterTotalIqd: remainingBalanceForSeizure,
                                                activeDebtorIsDeceased,
                                                activeDebtorIsEmployee,
                                            },
                                            personal: {
                                                appealPerspective,
                                                coerciveUiLocked,
                                                isHistoricalMode,
                                                activeDebtorKey:
                                                    assignmentWorkspaceCtx.activeDebtorKey,
                                                primaryDebtorKey: primaryDebtorKeyResolved,
                                                kasabRelaxedGates: !activeDebtorIsEmployee,
                                                forcedSummonAllowed:
                                                    forcedSummoningAnalysis.canForceSummon,
                                                forcedSummonLockReason:
                                                    forcedSummoningAnalysis.lockReasonAr,
                                                showToast,
                                                persistExecutionMerge,
                                                onOpenDecisions: openDecisionsModalWithBoot,
                                            },
                                            guarantor: {
                                                executionData: viewExecutionData,
                                                coerciveUiLocked,
                                                isHistoricalMode,
                                                handleGuarantorRequestFromFollowup,
                                                requestGuarantorSeizure,
                                                onOpenDecisions: openDecisionsModalWithBoot,
                                                showToast,
                                            },
                                        }}
                                    />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}
                            </div>
                        </div>
						</div>
                    </div>,
        document.body,
    );
}
