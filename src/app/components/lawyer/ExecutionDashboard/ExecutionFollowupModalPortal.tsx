import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
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
} from './executionDashboardLazyShell';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { EVICTION_TIMELINE_ACTION_IDS, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import SecureStoreService from '@/app/services/SecureStoreService';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/coerciveDebtorScope';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { useFollowupModal } from './followupModalContext';

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
        headerFields,
        hideCoerciveTabsForDebtorAgent,
        inabaCorrespondenceLog,
        inabaTargets,
        inlineActionGateKey,
        insertTimelineEventToSupabase,
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
                                            (followupModalChipTablistRef as any).current = el;
                                            (followupModalSectionTabsRef as any).current = el;
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
                                        {effectiveFollowupModalTabs.map((tab) => {
                                            const active = isFollowupTabActive(tab.id);
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    role="tab"
                                                    data-followup-tab={tab.id}
                                                    aria-selected={active}
                                                    onClick={() => {
                                                        if (tab.id === 'seizure_requests') {
                                                            openSeizureRequestsTab();
                                                            return;
                                                        }
                                                        setUnifiedModalTab(tab.id);
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
                                {!isSolidaryLiability && allDebtorsUnified.length > 1 ? (
                                    <div className="sticky top-0 z-[5] border-b border-slate-700/50 bg-[#0B1120]/98 px-2 pt-2 pb-2 backdrop-blur-md">
                                        <p className="mb-1 px-1 text-right text-[9px] text-slate-500">
                                            مدينو الإضبارة — ذمة مستقلة لكل منهم (اختر التبويب قبل الإجراء)
                                        </p>
                                        <div
                                            ref={followupModalDebtorTabsRef}
                                            className="scrollbar-hide flex gap-1 overflow-x-auto pb-1"
                                        >
                                            {allDebtorsUnified.map((d, i) => (
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
                                        {allDebtorsUnified[executionDebtorTabIndex] ? (
                                            <>
                                                <DebtorFinancialProgressBar
                                                    allocated={
                                                        allDebtorsUnified[executionDebtorTabIndex].allocated_debt
                                                    }
                                                    paid={allDebtorsUnified[executionDebtorTabIndex].paid_amount}
                                                    label="حصة المدين النشط"
                                                />
                                                <div className="flex justify-end px-1 -mt-1 pb-1">
                                                    <span className="text-[10px] text-slate-500">
                                                        {`المدين النشط: مدين ${executionDebtorTabIndex + 1}`}
                                                    </span>
                                                </div>
                                                {allDebtorsUnified[executionDebtorTabIndex].cleared ? (
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

                                {isSolidaryLiability && allDebtorsUnified.length >= 1 ? (
                                    <div className="border-b border-amber-500/25 bg-slate-900/50 px-3 py-2">
                                        <p className="mb-2 text-right text-[10px] font-bold text-amber-200/90">
                                            تضامن — عرض موحّد لجميع المدينين
                                        </p>
                                        <ul className="mb-2 space-y-1 text-right text-[11px] text-slate-300">
                                            {allDebtorsUnified.map((d, idx) => (
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
                                        <DebtorFinancialProgressBar
                                            allocated={totalOwed}
                                            paid={paidDebt}
                                            label="تقدّم الإضبارة (إجمالي)"
                                        />
                                    </div>
                                ) : null}

                                {unifiedModalTab === 'personal' && showPersonalCoerciveFollowupTab ? (
                                    <PersonalTab
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
                                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
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
                                        assignmentWorkspaceCtx={assignmentWorkspaceCtx}
                                        primaryDebtorKeyResolved={primaryDebtorKeyResolved}
                                        onOpenDecisions={openDecisionsModalWithBoot}
                                        onOpenSummonsCenter={() => {
                                            setSummonsContextDebtorKey(
                                                String(assignmentWorkspaceCtx.activeDebtorKey)
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
                                            followupSpecialization.hidePersonalJudgePresentation ||
                                            activeDebtorIsEmployee
                                        }
                                        hidePersonalForcedBringActivation={
                                            followupSpecialization.hidePersonalForcedBringActivation
                                        }
                                        activeDebtorNoticeScope={activeDebtorNoticeScope}
                                        handleEmployeeAssignmentRequestInvestigation={handleEmployeeAssignmentRequestInvestigation}
                                        handleEmployeeRegisterArrestOrder={handleEmployeeRegisterArrestOrder}
                                        handleEmployeeAssignmentRequestForcedBring={handleEmployeeAssignmentRequestForcedBring}
                                        handleEmployeeAssignmentResolveForcedBringOutcome={handleEmployeeAssignmentResolveForcedBringOutcome}
                                        handleEmployeeWarrantOutcome={handleEmployeeWarrantOutcome}
                                        handleEmployeeAssignmentTerminate={handleEmployeeAssignmentTerminate}
                                    />
								) : !followupSpecialization.hideFollowupCoerciveTab &&
								  (unifiedModalTab === 'coercive' ||
								  (unifiedModalTab === 'personal' && !showPersonalCoerciveFollowupTab)) ? (
									<motion.div
										key="followup-coercive"
										initial="hidden"
										animate="show"
										variants={{
											hidden: { opacity: 0, y: 10 },
											show: {
												opacity: 1,
												y: 0,
												transition: { duration: 0.25 },
											},
										}}
										className="p-4 sm:p-5 space-y-4"
									>
                                        <CoerciveTab
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
                                            EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
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
                                            hideCoerciveGraceNoticeBanner={followupSpecialization.hideCoerciveGraceNoticeBanner}
                                            hideCoerciveFinancialBanners={followupSpecialization.hideCoerciveFinancialBanners}
                                            hideCoerciveSeizureSalaryAndProperty={followupSpecialization.hideCoerciveSeizureSalaryAndProperty}
                                            hideEncroachmentEvictionProcedureItems={followupSpecialization.hideEncroachmentEvictionProcedureItems}
                                            showEncroachmentRemovalRequestCards={
                                                followupSpecialization.showEncroachmentRemovalRequestCards
                                            }
                                            showSpecificDeliverySurveyorCard={
                                                followupSpecialization.showSpecificDeliverySurveyorCard
                                            }
                                            showSpecificDeliveryConversionCard={
                                                followupSpecialization.showSpecificDeliveryConversionCard
                                            }
                                            hideEvictionCustodianProcedure={
                                                followupSpecialization.hideEvictionCustodianProcedure
                                            }
                                            showSpecificDeliveryBreakInventoryCard={
                                                followupSpecialization.showSpecificDeliveryBreakInventoryCard
                                            }
                                            showSpecificDeliveryFieldProcedures={
                                                followupSpecialization.showSpecificDeliveryFieldProcedures
                                            }
                                            showGenericFieldProcedureCards={
                                                followupSpecialization.showSpecificDeliveryFieldProcedures &&
                                                !isMaritalFurnitureClaim
                                            }
                                            hideFollowupCoerciveTab={
                                                followupSpecialization.hideFollowupCoerciveTab
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
                                            debtAmount={executionData?.debtAmount}
                                            totalAmount={executionData?.totalAmount}
                                            specificDeliveryConvertedAmount={
                                                (executionData as { specificDeliveryConvertedAmount?: number })
                                                    ?.specificDeliveryConvertedAmount
                                            }
                                            onSpecificDeliveryFinancialized={handleSpecificDeliveryFinancialized}
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
                                    </motion.div>
                                ) : unifiedModalTab === 'financial' ? (
                                    <FinancialTab openFinancialHubLedger={openFinancialHubLedger} />
                                ) : unifiedModalTab === 'other_party' ? (
                                    <OtherPartyTab
                                        executionData={viewExecutionData}
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        persistExecutionMerge={persistExecutionMerge}
                                        handleOtherPartyActionSubmitToDecisions={otherPartyTabSubmitHandler}
                                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                                        LazyOtherPartyActionsLog={LazyOtherPartyActionsLog}
                                        showCreditorRequestsMirror={isRepresentingDebtor}
                                        creditorRequestsMirror={otherPartyCreditorMirrorProps ?? undefined}
                                        onOpenAppeals={openOtherPartyAppealsModal}
                                        creditorTrackHandlers={creditorOtherPartyTrackHandlers}
                                        appealPerspective={appealPerspective}
                                    />
                                ) : unifiedModalTab === 'seizure_requests' ? (
                                    <SeizureRequestsTab
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
                                            followupSpecialization.hideGuarantorSeizureSubTab
                                        }
                                        financialGuarantorRequestOnly={
                                            followupSpecialization.showFinancialGuarantorRequestOnly
                                        }
                                        isFinancialDebtCollectionClaim={
                                            followupSpecialization.isFinancialDebtCollection
                                        }
                                        settlementBreachTriggeredAt={
                                            settlementGuarantorGate.settlementBreachTriggeredAt
                                        }
                                        hideAllGuarantorPresence={
                                            followupSpecialization.hideAllGuarantorPresence
                                        }
                                        ledgerPendingSettlement={
                                            settlementGuarantorGate.pendingSettlement
                                        }
                                        isAlimonyClaim={isAlimonyClaimType}
                                        claimType={claimType}
                                    />
								) : unifiedModalTab === 'correspondences' ? (
                                    <CommunicationsTab
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        showToast={showToast}
                                        showSoftFieldProcedures={
                                            followupSpecialization.showCorrespondencesSoftProcedures
                                        }
                                        showEncroachmentSurveyor={
                                            followupSpecialization.showEncroachmentRemovalRequestCards
                                        }
                                        showSpecificDeliverySurveyor={
                                            followupSpecialization.showSpecificDeliverySurveyorCard
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
                                ) : unifiedModalTab === 'dossier_controls' ? (
                                    <motion.div
                                        key="followup-dossier-controls"
                                        initial="hidden"
                                        animate="show"
                                        variants={{
                                            hidden: { opacity: 0, y: 10 },
                                            show: {
                                                opacity: 1,
                                                y: 0,
                                                transition: { duration: 0.25 },
                                            },
                                        }}
                                        className="p-4 sm:p-5"
                                        dir="rtl"
                                    >
                                        <DossierControlsTab
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
                                    </motion.div>
                                ) : unifiedModalTab === 'admin' ? (
                                    <RequestsTab
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
                                                ...followupSpecialization,
                                                showPersonalCoerciveFollowupTab,
                                                showGuarantorInSeizureTab:
                                                    showGuarantorInSeizureFollowupTab,
                                                isPersonalStatusExecutionClaim,
                                                isAlimonyClaim: isAlimonyClaimType,
                                                activeDebtorIsEmployee,
                                                showHiddenExecutiveDossierPresentation:
                                                    !followupSpecialization.hidePersonalJudgePresentation &&
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
													) : null}
                            </div>
                        </div>
						</div>
                    </div>,
        document.body,
    );
}
