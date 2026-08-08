import React, { useMemo } from 'react';
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
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';


export function ExecutionFollowupModalPersonalCoercivePanels({ c }: { c: ExecutionFollowupModalPortalController }) {
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
    
    
    } = c;

    const custodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                viewExecutionData as Record<string, unknown> | null | undefined,
                String(claimType || '').trim() || undefined,
            ),
        [viewExecutionData, claimType],
    );

    return (
        <>
{panelsToRender.has('personal') && showPersonalCoerciveFollowupTab ? (
                                    <FollowupTabKeepAlivePanel
                                        key={`personal:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="personal"
                                        active={activePanelKey === 'personal'}
                                        className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
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
                                        custodyRemovalClaimActive={custodyRemovalClaimActive}
                                        hidePersonalJudgePresentation={
                                            spec.hidePersonalJudgePresentation ||
                                            (activeDebtorIsEmployee && !custodyRemovalClaimActive)
                                        }
                                        hideExecutiveDetentionJudgeCard={
                                            hideExecutiveDetentionJudgeCard ||
                                            (activeDebtorIsEmployee && !custodyRemovalClaimActive)
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
                                        key={`coercive:${String(activeFollowupDebtorKey ?? '')}`}
                                        panelId="coercive"
                                        active={activePanelKey === 'coercive'}
                                        className="space-y-4 rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
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
                                            saveJudicialCustodianDetails={saveJudicialCustodianEntry}
                                            saveBreakInventoryLedger={saveBreakInventoryLedgerEntry}
                                            finalizeBreakInventoryRequest={finalizeBreakInventoryEntry}
                                            isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                                            maritalFurnitureItems={maritalFurnitureItemsForFollowup}
                                            saveMaritalFurnitureDeliveryInventory={
                                                saveMaritalFurnitureDeliveryInventoryEntry
                                            }
                                            onOpenDecisionsModal={openDecisionsModalWithBoot}
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
                                            claimType={claimTypeForExecutionModule || claimType}
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
                                            activeCoerciveActions={activeCoerciveActions}
                                            followupGarnishmentAmountPreview={followupGarnishmentAmountPreview}
                                            handleEndGracePeriod={handleEndGracePeriod}
                                            appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                                            decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                                                decisionsStorageExecutionId,
                                                executionId,
                                                executionData: viewExecutionData as Record<string, unknown> | null,
                                            })}
                                            showToast={showToast}
                                            EVICTION_TIMELINE_ACTION_IDS={EVICTION_TIMELINE_ACTION_IDS}
                                            activeDebtorIsEmployee={activeDebtorIsEmployee}
                                            activeDebtorIsDeceased={activeDebtorIsDeceased}
                                            isHistoricalMode={isHistoricalMode}
                                            saveCoerciveAction={saveCoerciveAction}
                                            pushTimelineEvent={pushTimelineEvent}
                                            nextTimelineId={nextTimelineId}
                                            persistExecutionMerge={persistExecutionMerge}
                                            followupSalarySeizureLabel={followupSalarySeizureLabel}
                                        />
                                    </FollowupTabKeepAlivePanel>
                                ) : null}

        </>
    );
}
