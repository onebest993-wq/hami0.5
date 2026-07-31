/** Scope bag fragments — orchestrators + UI / derived pickers */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from './scopeBagPick';

const scopeBagKeys = (serializedKeys: string): string[] => serializedKeys.split('|');

const FOLLOWUPORCHESTRATOR_KEYS = scopeBagKeys(
    'setShowUnifiedExecutionModal|unifiedModalTab|setUnifiedModalTab|specialRequestDate|setSpecialRequestDate|specialRequestContent|setSpecialRequestContent|specialRequestTemplatePick|setSpecialRequestTemplatePick|specialRequestManualTitle|setSpecialRequestManualTitle|showStayOfExecutionModal|setShowStayOfExecutionModal|inlineActionGateKey|setInlineActionGateKey|dossierActionModalOpen|setDossierActionModalOpen|dossierActionModalType|setDossierActionModalType|dossierActionModalSaving|setDossierActionModalSaving|executionDebtorTabIndex|setExecutionDebtorTabIndex|setEmployeeCompulsoryBannerDismissed|solidaryCoerciveActionPending|setSolidaryCoerciveActionPending|followupSolidaryDebtorIndex|setFollowupSolidaryDebtorIndex|coerciveSubjectRef|followupModalChipTablistRef|followupModalDebtorTabsRef|followupModalSectionTabsRef|followupModalBodyScrollRef|debtorWorkspaceChipStripRef|partyDeathModalParty|setPartyDeathModalParty|setPartyDeathModalDecisionId|alimonyBeneficiaryDeathModalOpen|setAlimonyBeneficiaryDeathModalOpen|alimonyBeneficiaryDeathModalProfile|setAlimonyBeneficiaryDeathModalProfile|evictionAssetsTabUnlocked|evictionCaseExpenses|setEncroachmentCaseExpenses|evictionExpenseAmount|setEvictionExpenseAmount|evictionExpenseNote|setEvictionExpenseNote|showVisitationCalendarModal|setShowVisitationCalendarModal|heirNoticeDateDrafts|setHeirNoticeDateDrafts|heirSummonsDatePickerOpenByHeir|setHeirSummonsDatePickerOpenByHeir|evictionExpensePayMode|setEvictionExpensePayMode|lawyerFeeDisburseMode|setLawyerFeeDisburseMode|lawyerFeeDisburseNotes|setLawyerFeeDisburseNotes|setEvictionGraceDecisionId|graceModalStartYmd|setGraceModalStartYmd|graceModalEndYmd|setGraceModalEndYmd|policeAssistanceModalOpen|setPoliceAssistanceModalOpen|followupExpandProcedureKey|consumeFollowupExpandProcedure|setPoliceAssistanceDecisionId|policeAssistanceRequestTitle|setPoliceAssistanceRequestTitle|policeAssistanceAgencyDraft|setPoliceAssistanceAgencyDraft|evictionHeirsNotificationDateYmd|summonsHubInitialMainTab|setSummonsHubInitialMainTab|setSummonsContextDebtorKey|openExecutionSeizuresTab',
);

export function followupOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZUREORCHESTRATOR_KEYS = scopeBagKeys(
    'propertySeizureRequestModalOpen|setPropertySeizureRequestModalOpen|propertySeizureSubjectDraft|setPropertySeizureSubjectDraft|movableSeizureRequestModalOpen|setMovableSeizureRequestModalOpen|movableSeizureSubjectDraft|setMovableSeizureSubjectDraft|seizedPropertyStepModalOpen|setSeizedPropertyStepModalOpen|seizedPropertyStepPropertyId|seizedPropertyStepEntityKind|seizedPropertyStepKind|seizedPropertyExpertsNamesDraft|setSeizedPropertyExpertsNamesDraft|seizedPropertyExpertReportDateDraft|setSeizedPropertyExpertReportDateDraft|seizedPropertyExpertPriceDraft|setSeizedPropertyExpertPriceDraft|seizedPropertyAuctionDateDraft|setSeizedPropertyAuctionDateDraft|linkSeizureAuctionToAppointments|setLinkSeizureAuctionToAppointments|seizedPropertyBuyerNameDraft|setSeizedPropertyBuyerNameDraft|seizedPropertyAwardAmountDraft|setSeizedPropertyAwardAmountDraft|seizedPropertyStepNotesDraft|setSeizedPropertyStepNotesDraft|seizedPropertyAuctionResultModalOpen|setSeizedPropertyAuctionResultModalOpen|setSeizedPropertyAuctionResultPropertyId|seizedPropertyAuctionResultEntityKind|setSeizedPropertyAuctionResultEntityKind|seizedPropertyAuctionResultOutcome|setSeizedPropertyAuctionResultOutcome|seizedPropertyAuctionResultBuyerNameDraft|setSeizedPropertyAuctionResultBuyerNameDraft|seizedPropertyAuctionResultAmountDraft|setSeizedPropertyAuctionResultAmountDraft|seizedPropertyAuctionDepositAmountDraft|setSeizedPropertyAuctionDepositAmountDraft|seizureMarkModalOpen|setSeizureMarkModalOpen|seizureMarkModalEntityKind|setSeizureMarkModalEntityId|seizureMarkLetterNumberDraft|setSeizureMarkLetterNumberDraft|seizureMarkDateDraft|setSeizureMarkDateDraft|seizureMarkEntityDraft|setSeizureMarkEntityDraft|publicationModalOpen|setPublicationModalOpen|publicationModalEntityKind|setPublicationModalEntityId|publicationNewspaperNameDraft|setPublicationNewspaperNameDraft|publicationDateYmdDraft|setPublicationDateYmdDraft|realEstateSeizureModalDecisionId|setRealEstateSeizureModalDecisionId|setGuarantorDetailsDecisionId|guarantorNameDraft|setGuarantorNameDraft|guarantorWorkplaceDraft|setGuarantorWorkplaceDraft|guarantorSalaryDraft|setGuarantorSalaryDraft|guarantorDeductionDraft|setGuarantorDeductionDraft|openGuarantorDetailsModal',
);

export function seizureOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SEIZUREORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const COERCIONORCHESTRATOR_KEYS = [
        "activeNoticeState",
        "setActiveNoticeState",
        "debtorAttendedVoluntarily",
        "debtorForcedToAttend",
        "setDebtorForcedToAttend",
        "debtorArrested",
        "setDebtorArrested",
        "setNonInterferenceIssued",
        "summoningRound",
        "voluntaryAttendanceCount",
        "forcedPathAttendanceSecured"
    ] as const;

export function coercionOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIONORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTORWORKSPACECONTEXT_KEYS = scopeBagKeys(
    'allDebtorsUnified|debtorWorkspaceEntries|debtorBrowserTabsMode|multiDebtorMode|liabilityGroupTabsMode|activeGroupEntries|isSolidaryLiability|primaryDebtorWorkspaceKey|primaryDebtorKeyResolved|showFollowupSolidaryDebtorTabs|followupAssignmentWorkspaceCtx|assignmentWorkspaceCtx|unifiedSummonsTargetDebtorKey|activeDebtorNoticeScope|scopedSummonsMarker|modalActiveDebtorNoticeScope|debtorLiabilityGroups|mergedTimelineEventsDebtorScoped|mergedTimelineRadarPreviewLimit|effectiveFollowupDebtorEntry|effectiveCreditors|effectiveDebtors|creditorWorkspaceEntries|debtorsSectionRef',
);

export function debtorWorkspaceContextScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DEBTORWORKSPACECONTEXT_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DOSSIERLIFECYCLEPANEL_KEYS = [
        "dossierLifecyclePanelOpen",
        "dossierLifecyclePanelPhase",
        "dossierLifecyclePopStyle",
        "dossierPendingStatus",
        "dossierReasonDraft",
        "dossierDateDraft",
        "dossierLifecyclePanelPortalRef",
        "dossierLifecyclePopoverRef",
        "dossierStatusDraft",
        "setDossierDateDraft",
        "setDossierLifecyclePanelOpen",
        "setDossierLifecyclePanelPhase",
        "setDossierPendingStatus",
        "setDossierReasonDraft"
    ] as const;

export function dossierLifecyclePanelScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DOSSIERLIFECYCLEPANEL_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DECISIONSORCHESTRATOR_KEYS = [
        "decisionsReloadEpoch",
        "decisionsModalBootHubTab",
        "decisionsModalBootListTab",
        "decisionsModalScrollToDecisionId",
        "appealsModalScrollToDecisionId",
        "decisionsStorageExecutionId",
        "clearDecisionsModalBootState",
        "openDecisionsModalWithBoot"
    ] as const;

export function decisionsOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DECISIONSORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FINANCIALORCHESTRATOR_KEYS = [
        "isFinancialCenterExpanded",
        "setIsFinancialCenterExpanded",
        "activeFinancialTab",
        "setActiveFinancialTab",
        "showExecutionFinancialHub",
        "setShowExecutionFinancialHub",
        "financialHubAutoOpenMode",
        "setFinancialHubAutoOpenMode",
        "financialHubSeizedMovableId",
        "setFinancialHubSeizedMovableId",
        "financialHubSeizedPropertyId",
        "setFinancialHubSeizedPropertyId",
        "openFinancialHubLedger"
    ] as const;

export function financialOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FINANCIALORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FINANCIALLEDGERSTATE_KEYS = [
        "financialLedger",
        "financialStatus",
        "hasFinancialLedger",
        "paidClientFees",
        "paidCourtFees",
        "paidDebt",
        "paidDirectorateFees",
        "paymentAmount",
        "paymentDate",
        "setPaymentAmount",
        "setPaymentDate",
        "total_execution_expenses"
    ] as const;

export function financialLedgerStateScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FINANCIALLEDGERSTATE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PARTYEDITWORKFLOW_KEYS = [
        "editPartyTarget",
        "setEditPartyTarget",
        "partyEditDraft",
        "setPartyEditDraft",
        "partyEditHeirDeleteConfirmIdx",
        "setPartyEditHeirDeleteConfirmIdx",
        "heirsQuickView",
        "setHeirsQuickView",
        "openEditParty",
        "openHeirsQuickView",
        "savePartyEditDraft",
        "removeHeirFromPartyEditDraftAtIndex",
        "togglePartyEditHeirClient",
        "buildPartyHeirsRows"
    ] as const;

export function partyEditWorkflowScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PARTYEDITWORKFLOW_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const UNIFIEDSEIZURELOG_KEYS = [
        "showUnifiedSeizureLogModal",
        "closeUnifiedSeizureLog",
        "unifiedSeizureLogTab",
        "setUnifiedSeizureLogTab",
        "unifiedSeizureLogEntries",
        "unifiedSeizureTabCounts",
        "hasUnifiedSeizureLogContent",
        "openUnifiedSeizureLog",
        "seizedMovablesForSeizureLog",
        "seizedPropertiesForSeizureLog",
        "seizureLogExecutorDecisions",
        "thirdPartyFundsDraftById",
        "setThirdPartyFundsDraftById"
    ] as const;

export function unifiedSeizureLogScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, UNIFIEDSEIZURELOG_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DOSSIERLIFECYCLEACTIONS_KEYS = [
        "handleDossierLifecycleConfirmDetails",
        "handleDossierLifecyclePick"
    ] as const;

export function dossierLifecycleActionsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DOSSIERLIFECYCLEACTIONS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DOSSIERMETAWORKFLOW_KEYS = [
        "openEditDossierMeta",
        "saveDossierMetaDraft",
        "dossierMetaDraft",
        "setDossierMetaDraft"
    ] as const;

export function dossierMetaWorkflowScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DOSSIERMETAWORKFLOW_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTORSUMMONSPROFILE_KEYS = [
        "debtorSummonsProfile",
        "followupDebtorSummonsProfile",
        "followupIsDebtorGovernmentEmployee",
        "followupIsDebtorRetired",
        "isDebtorGovernmentEmployee",
        "isDebtorFreelancer"
    ] as const;

export function debtorSummonsProfileScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DEBTORSUMMONSPROFILE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SUBSEQUENTNOTICEFLOW_KEYS = [
        "followupEarnerForcedActionUnlocked",
        "followupEmployeeFinancialSalaryOnlyCoercive",
        "followupGarnishmentAmountPreview",
        "followupMonetaryCoerciveLimitedOnly",
        "earnerFinancialPersonalCoerciveActive",
        "earnerForcedActionUnlocked",
        "subsequentNoticeUnlocked",
        "primaryMemoNoticeBadge",
        "primaryDebtorAbsenceBadge",
        "showDebtorUnservedMemoBadge",
        "showDebtorSummonsAttendanceBadge",
        "noticeKindGoalStrictBinding",
        "employeeAssignmentTabEnabled",
        "resolvedEmployeeSummonsAssignment",
        "showEmployeeAssignmentCoerciveBlock"
    ] as const;

export function subsequentNoticeFlowScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SUBSEQUENTNOTICEFLOW_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const TIMELINEUI_KEYS = scopeBagKeys(
    'timelineAccordionExpanded|setTimelineAccordionExpanded|activeTimelineFilter|setActiveTimelineFilter|timelineEvents|setTimelineEvents|timelineEditDraft|setTimelineEditDraft|timelineFilterOptions|timelineDebtorMetadata|timelineRadarPreviewLimit|activeTimelineEvents|activeTimelineEventsDebtorScoped|showOnlyActiveFileTimeline|setShowOnlyActiveFileTimeline|mergedTimelineEvents|mergeSimilarRecentTimelineEvent|nextTimelineId|trashedCaseNotes|trashedCaseTasks|trashedTimelineEvents',
);

export function timelineUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, TIMELINEUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EXECUTIONFILECONTEXT_KEYS = scopeBagKeys(
    'executionData|executionDataRef|executionId|viewExecutionData|currentFile|currentFileId|file|fileNumber|fileYear|executionStatus|executionPaused|executionReportPrompt|executionAppealBanner|executionMemoBadgePopoverOpen|onClose|onUpdate|activeSubFileId|docNumber|activeTabId|setActiveTabId|childDossiers|subFiles|parentDossierId|parentExecutionFile|hasChildDossiers|visitChildNames|linkedDossierToView|setLinkedDossierToView',
);

export function executionFileContextScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EXECUTIONFILECONTEXT_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZURESTATE_KEYS = scopeBagKeys(
    'seizedAssets|setSeizedAssets|seizureDraftsByDecisionId|setSeizureDraftsByDecisionId|seizureMatrix|seizureMatrixLedgerParamsRef|seizureDetailCompletion|movableSeizureRegistryAssets|realEstateSeizureAssets|realEstateSeizureRegistryAssets|salarySeizureRegistryAssets|thirdPartySeizureAssets|thirdPartySeizureRegistryAssets|thirdPartySeizuresUi|setThirdPartySeizuresUi',
);

export function seizureStateScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SEIZURESTATE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const NOTESAPPOINTMENTUI_KEYS = [
        "noteBody",
        "setNoteBody",
        "noteTitle",
        "setNoteTitle",
        "editingNoteId",
        "editingAppointmentId",
        "editingTaskId",
        "setEditingAppointmentId",
        "setEditingTaskId",
        "appointmentDateOnly",
        "setAppointmentDateOnly",
        "appointmentPurpose",
        "setAppointmentPurpose",
        "setAppointmentTimeOptional",
        "savedNotesSplit",
        "savedNotesView",
        "setSavedNotesView",
        "caseTasksPending",
        "setCaseTasksPending",
        "setIsTask",
        "setTaskDueDate",
        "setTaskStatus",
        "isTask",
        "dockPinnedNotes",
        "dockPinnedTasks"
    ] as const;

export function notesAppointmentUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, NOTESAPPOINTMENTUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SCOPESTATICFNS_KEYS = [
        "buildDebtorSummonsMarkerPatchForKey",
        "buildEmployeeAssignmentPatchForDebtorKey",
        "buildPublicationNoticePatchForDebtorKey",
        "computeTaklifDeadlineYmd",
        "getDebtorSummonsMarkerForKey",
        "getDebtorSummonsProfile",
        "getEmployeeAssignmentForDebtorKey",
        "getExecutionPartyDisplayName",
        "getLocalTodayYmd",
        "getPersonalCoerciveSubtypeOutcome",
        "getPublicationNoticeForDebtorKey"
    ] as const;

export function scopeStaticFnsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SCOPESTATICFNS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const QUEUEMICROTASK_KEYS = [
        "queueMicrotask"
    ] as const;

export function queueMicrotaskScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'queueMicrotask') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SCOPERUNTIMEFNS_KEYS = [
        "getMilestoneTimelineSnapshot",
        "todayYmd"
    ] as const;

export function scopeRuntimeFnsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SCOPERUNTIMEFNS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EVICTIONPROCEDURES_KEYS = [
        "appendEvictionExecutorRequest",
        "appendEvictionProcedure"
    ] as const;

export function evictionProceduresScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EVICTIONPROCEDURES_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SUMMONSNOTICE_KEYS = [
        "setDebtorNotificationDate",
        "setDebtorSummonsMarkerLocal",
        "debtorNotificationDate",
        "debtorSummonsMarkerLocal",
        "setSummonsMarkerPopoverOpen",
        "setSummonsPurposeDraft",
        "summonsMarkerPopoverOpen",
        "summonsPurposeDraft",
        "notificationCount",
        "noticeVoluntaryPeriodEndOptimistic",
        "voluntaryEndOptimistic",
        "dismissDebtorAbsenceBadge",
        "syncRollingCalendarSessions"
    ] as const;

export function summonsNoticeScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SUMMONSNOTICE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EVICTIONGRACEUI_KEYS = [
        "evictionFullAddressField",
        "evictionGraceBadgeInfo",
        "evictionGraceHidden",
        "evictionGracePinned",
        "evictionPremisesUseResolved",
        "evictionProcedureLockHint",
        "evictionPropertyDistrict",
        "evictionPropertyNumber",
        "evictionPropertyTypeField",
        "graceHiddenKey",
        "gracePeriodEnded",
        "residentialGraceAllowsFieldwork",
        "residentialGracePeriodSaved",
        "residentialVacateDeadlineMaxIso",
        "showResidentialEvictionGraceControl",
        "showResidentialGraceEarlyEndRequest",
        "toggleEvictionGracePinned",
        "setEvictionGraceHidden"
    ] as const;

export function evictionGraceUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EVICTIONGRACEUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const COERCIVEMODALUI_KEYS = [
        "activeCoerciveActions",
        "setActiveCoerciveActions",
        "saveCoerciveActionRef",
        "setShowCoerciveActionForm",
        "setShowCoerciveModal",
        "showCoerciveModal"
    ] as const;

export function coerciveModalUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIVEMODALUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const MODALFLAGS_KEYS = [
        "showBreakInventoryRequest",
        "showExecutionTrashModal",
        "showExtraCreditors",
        "showExtraDebtors",
        "showJudgmentMeta",
        "showToast",
        "setShowExecutionTrashModal",
        "setShowExtraCreditors",
        "setShowExtraDebtors",
        "setShowUnifiedSummonsModal",
        "setIsPaused",
        "setPauseReason",
        "setManualGraceCalendarExtra"
    ] as const;

export function modalFlagsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, MODALFLAGS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FOLLOWUPMODALDERIVED_KEYS = [
        "followupModalDebtorIsDeceased",
        "followupModalDebtorIsEmployee",
        "followupModalSpecializationEffectiveWithEarnerGate",
        "followupSpecializationWithEarnerGate",
        "modalKasabTerminationEmphasis",
        "modalResolvedEmployeeSummonsAssignment",
        "modalShowEmployeeAssignmentCoerciveBlock"
    ] as const;

export function followupModalDerivedScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPMODALDERIVED_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const CLAIMDISPLAY_KEYS = [
        "claimType",
        "claimTypeArabicDisplay",
        "classificationDisplay",
        "headerFields",
        "judgmentDateDisplay",
        "parentClaimTypeArabicDisplay",
        "parentClassificationDisplay",
        "parentHeaderFields",
        "parentJudgmentDateDisplay",
        "parentShowJudgmentMeta",
        "parsedClientFees",
        "parsedCourtFees",
        "parsedDirectorateFees",
        "parsedLawyerFees",
        "partyBadgesExecutionId",
        "initiator",
        "appealPerspective",
        "isPersonalStatusExecutionClaim",
        "isRepresentingDebtor",
        "isUnifiedTabActive",
        "hideCoerciveTabsForDebtorAgent",
        "hideExecutiveDetentionJudgeCard",
        "shouldShowGuarantorExternalHub",
        "kasabTerminationEmphasis",
        "firstActiveAppealDecisionId",
        "daysRemainingUntilDeadline"
    ] as const;

export function claimDisplayScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, CLAIMDISPLAY_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PARTYDEATHLABELS_KEYS = [
        "creditorDeathMenuLabel",
        "creditorExtraMinorLabel",
        "creditorExtraMinorNames",
        "debtorDeathMenuLabel",
        "debtorEmploymentToggleMenuLabel"
    ] as const;

export function partyDeathLabelsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PARTYDEATHLABELS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTORPROFILE_KEYS = [
        "activeDebtorIsDeceased",
        "activeDebtorIsEmployee",
        "activeDebtorIsLegalEntity",
        "debtorEvaded",
        "employeeForcedBringAwaitingPersonalOutcome",
        "isDebtorRowEmployee"
    ] as const;

export function debtorProfileScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DEBTORPROFILE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const MASTERSTATE_KEYS = [
        "statusMetadata",
        "forcedBringDecisionState",
        "forcedAttendanceIssued",
        "stayOfExecutionActive",
        "statuteStatus",
        "standaloneExecutionMarks",
        "unifiedCollectionApproved",
        "isPaused",
        "pauseReason",
        "permanentDeleteTimelineId",
        "setPermanentDeleteTimelineId",
        "isHistoricalMode",
        "isAssignmentDeadlinePassed",
        "activeGraceTasks",
        "policeAssistanceBadgeInfo",
        "publicationNoticeDeadlineYmd"
    ] as const;

export function masterStateScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, MASTERSTATE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const INABA_KEYS = [
        "inabaCorrespondenceLog",
        "inabaTargets",
        "isInabaActive"
    ] as const;

export function inabaScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, INABA_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EXECUTORSCHEDULE_KEYS = [
        "executorScheduleContext",
        "executorScheduleModalOpen",
        "setExecutorScheduleContext",
        "setExecutorScheduleModalOpen",
        "setExecutionStorageTick",
        "setExecutionReportPrompt",
        "setExecutionMemoBadgePopoverOpen"
    ] as const;

export function executorScheduleScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EXECUTORSCHEDULE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const BREAKINVENTORYMODAL_KEYS = [
        "breakInventoryFurnitureModalCtx",
        "breakInventoryFurnitureModalOpen",
        "setBreakInventoryFurnitureModalCtx",
        "setBreakInventoryFurnitureModalOpen"
    ] as const;

export function breakInventoryModalScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, BREAKINVENTORYMODAL_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const JUDICIALCUSTODIANMODAL_KEYS = [
        "judicialCustodianModalCtx",
        "judicialCustodianModalOpen",
        "setJudicialCustodianModalCtx",
        "setJudicialCustodianModalOpen"
    ] as const;

export function judicialCustodianModalScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, JUDICIALCUSTODIANMODAL_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FINANCIALALIMONY_KEYS = [
        "guarantorFollowupAwaitingDetailsSave",
        "lawyerFeePayoutApproved",
        "lawyerStartedPostNoticeExecution",
        "specificDeliveryConvertedAmount",
        "specificDeliveryFinancialized",
        "accumulatedAlimony",
        "monthlyAlimony",
        "alimonyBeneficiaryProfile"
    ] as const;

export function financialAlimonyScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FINANCIALALIMONY_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const HEADERUI_KEYS = [
        "toggleHeaderExpanded",
        "isHeaderExpanded"
    ] as const;

export function headerUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, HEADERUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const RUNTIMECONSTANTS_KEYS = [
        "useExecutionDashboardStore",
        "voiceUserId",
        "FollowupModalContext",
        "resolveCalendarUserId"
    ] as const;

export function runtimeConstantsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, RUNTIMECONSTANTS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}
