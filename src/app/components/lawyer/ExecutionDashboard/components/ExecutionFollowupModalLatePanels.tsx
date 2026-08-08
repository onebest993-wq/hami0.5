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


export function ExecutionFollowupModalLatePanels({ c }: { c: ExecutionFollowupModalPortalController }) {
    const {


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
{panelsToRender.has('correspondences') ? (
                                    <FollowupTabKeepAlivePanel
                                        key={`correspondences:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="correspondences"
                                        active={activePanelKey === 'correspondences'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                                    >
                                    <TabCommunications
                                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                                        executionData={viewExecutionData as Record<string, unknown>}
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
                                        key={`dossier_controls:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="dossier_controls"
                                        active={activePanelKey === 'dossier_controls'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
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
                                            onSubmit={async (payload) => {
                                                setDossierActionModalSaving(true);
                                                return await handleDossierAction(payload);
                                            }}
                                        />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

                                {panelsToRender.has('admin') ? (
                                    <FollowupTabKeepAlivePanel
                                        key={`admin:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="admin"
                                        active={activePanelKey === 'admin'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                                    >
                                    <TabRequests
                                        executionId={requireDecisionsStorageExecutionId({
                                            decisionsStorageExecutionId,
                                            executionId,
                                            executionData: viewExecutionData as Record<string, unknown> | null,
                                        })}
                                        executionData={viewExecutionData as Record<string, unknown> | null}
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
                                        runSpecialFollowupSubmit={handleSpecialFollowupSubmit}
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
                                                personalTabLockedForEmployee,
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
        </>
    );
}
