import React from 'react';
import {
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyEvictionFieldProceduresPanel,
    LazyOtherPartyActionsLog,
    LazyPersonalCoerciveFollowupPanel,
} from '../executionDashboardLazyRegistry';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { EVICTION_TIMELINE_ACTION_IDS, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import SecureStoreService from '@/app/services/SecureStoreService';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';


export function ExecutionFollowupModalMidPanels({ c }: { c: ExecutionFollowupModalPortalController }) {
    const {


        CoerciveTab,
        CommunicationsTab,
        DebtorFinancialProgressBar,
        DossierControlsTab,
        OtherPartyTab,
        PersonalTab,
        ProgressBar,
        RequestsTab,
        SeizureRequestsTab,
        TabCoercive,
        TabCommunications,
        TabDossierControls,
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
    
    
    } = c;

    return (
        <>
{panelsToRender.has('other_party') ? (
                                    <FollowupTabKeepAlivePanel
                                        key={`other_party:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="other_party"
                                        active={activePanelKey === 'other_party'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                                    >
                                    <TabOtherParty
                                        executionData={viewExecutionData}
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        persistExecutionMerge={persistExecutionMerge}
                                        handleOtherPartyActionSubmitToDecisions={otherPartyTabSubmitHandler}
                                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                                        LazyOtherPartyActionsLog={LazyOtherPartyActionsLog}
                                        showCreditorRequestsMirror={isRepresentingDebtor}
                                        isRepresentingDebtor={isRepresentingDebtor}
                                        showToast={showToast}
                                        pushTimelineEvent={pushTimelineEvent}
                                        nextTimelineId={nextTimelineId}
                                        creditorRequestsMirror={otherPartyCreditorMirrorProps ?? undefined}
                                        onOpenAppeals={openOtherPartyAppealsModal}
                                        creditorTrackHandlers={creditorOtherPartyTrackHandlers}
                                        appealPerspective={appealPerspective}
                                    />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('seizure_requests') &&
                                !spec.hideFollowupSeizureRequestsTab &&
                                !seizureMatrix.hideSeizureTab ? (
                                    <FollowupTabKeepAlivePanel
                                        key={`seizure_requests:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="seizure_requests"
                                        active={activePanelKey === 'seizure_requests'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                                    >
                                    <TabSeizureRequests
                                        executionId={requireDecisionsStorageExecutionId({
                                            decisionsStorageExecutionId,
                                            executionId,
                                            executionData: viewExecutionData as Record<string, unknown> | null,
                                        })}
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

        </>
    );
}
