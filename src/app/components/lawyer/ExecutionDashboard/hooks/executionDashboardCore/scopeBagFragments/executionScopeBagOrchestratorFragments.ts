// @ts-nocheck
/** orchestrator scope bag fragments — fragments لحقائب chunk scope (generated + pick) */
import type { ExecutionDashboardCoreScopeBagInput } from '../buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from '../scopeBagPick';
const FOLLOWUPORCHESTRATOR_KEYS = [
        "setShowUnifiedExecutionModal",
        "unifiedModalTab",
        "setUnifiedModalTab",
        "specialRequestDate",
        "setSpecialRequestDate",
        "specialRequestContent",
        "setSpecialRequestContent",
        "specialRequestTemplatePick",
        "setSpecialRequestTemplatePick",
        "specialRequestManualTitle",
        "setSpecialRequestManualTitle",
        "showStayOfExecutionModal",
        "setShowStayOfExecutionModal",
        "inlineActionGateKey",
        "setInlineActionGateKey",
        "dossierActionModalOpen",
        "setDossierActionModalOpen",
        "dossierActionModalType",
        "setDossierActionModalType",
        "dossierActionModalSaving",
        "setDossierActionModalSaving",
        "executionDebtorTabIndex",
        "setExecutionDebtorTabIndex",
        "setEmployeeCompulsoryBannerDismissed",
        "solidaryCoerciveActionPending",
        "setSolidaryCoerciveActionPending",
        "followupSolidaryDebtorIndex",
        "setFollowupSolidaryDebtorIndex",
        "coerciveSubjectRef",
        "followupModalChipTablistRef",
        "followupModalDebtorTabsRef",
        "followupModalSectionTabsRef",
        "followupModalBodyScrollRef",
        "debtorWorkspaceChipStripRef",
        "partyDeathModalParty",
        "setPartyDeathModalParty",
        "setPartyDeathModalDecisionId",
        "alimonyBeneficiaryDeathModalOpen",
        "setAlimonyBeneficiaryDeathModalOpen",
        "alimonyBeneficiaryDeathModalProfile",
        "setAlimonyBeneficiaryDeathModalProfile",
        "evictionAssetsTabUnlocked",
        "evictionCaseExpenses",
        "setEncroachmentCaseExpenses",
        "evictionExpenseAmount",
        "setEvictionExpenseAmount",
        "evictionExpenseNote",
        "setEvictionExpenseNote",
        "showVisitationCalendarModal",
        "setShowVisitationCalendarModal",
        "heirNoticeDateDrafts",
        "setHeirNoticeDateDrafts",
        "heirSummonsDatePickerOpenByHeir",
        "setHeirSummonsDatePickerOpenByHeir",
        "evictionExpensePayMode",
        "setEvictionExpensePayMode",
        "lawyerFeeDisburseMode",
        "setLawyerFeeDisburseMode",
        "lawyerFeeDisburseNotes",
        "setLawyerFeeDisburseNotes",
        "setEvictionGraceDecisionId",
        "graceModalStartYmd",
        "setGraceModalStartYmd",
        "graceModalEndYmd",
        "setGraceModalEndYmd",
        "policeAssistanceModalOpen",
        "setPoliceAssistanceModalOpen",
        "followupExpandProcedureKey",
        "consumeFollowupExpandProcedure",
        "setPoliceAssistanceDecisionId",
        "policeAssistanceRequestTitle",
        "setPoliceAssistanceRequestTitle",
        "policeAssistanceAgencyDraft",
        "setPoliceAssistanceAgencyDraft",
        "evictionHeirsNotificationDateYmd",
        "summonsHubInitialMainTab",
        "setSummonsHubInitialMainTab",
        "setSummonsContextDebtorKey",
        "openExecutionSeizuresTab"
    ] as const;

export function followupOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZUREORCHESTRATOR_KEYS = [
        "propertySeizureRequestModalOpen",
        "setPropertySeizureRequestModalOpen",
        "propertySeizureSubjectDraft",
        "setPropertySeizureSubjectDraft",
        "movableSeizureRequestModalOpen",
        "setMovableSeizureRequestModalOpen",
        "movableSeizureSubjectDraft",
        "setMovableSeizureSubjectDraft",
        "seizedPropertyStepModalOpen",
        "setSeizedPropertyStepModalOpen",
        "seizedPropertyStepPropertyId",
        "seizedPropertyStepEntityKind",
        "seizedPropertyStepKind",
        "seizedPropertyExpertsNamesDraft",
        "setSeizedPropertyExpertsNamesDraft",
        "seizedPropertyExpertReportDateDraft",
        "setSeizedPropertyExpertReportDateDraft",
        "seizedPropertyExpertPriceDraft",
        "setSeizedPropertyExpertPriceDraft",
        "seizedPropertyAuctionDateDraft",
        "setSeizedPropertyAuctionDateDraft",
        "linkSeizureAuctionToAppointments",
        "setLinkSeizureAuctionToAppointments",
        "seizedPropertyBuyerNameDraft",
        "setSeizedPropertyBuyerNameDraft",
        "seizedPropertyAwardAmountDraft",
        "setSeizedPropertyAwardAmountDraft",
        "seizedPropertyStepNotesDraft",
        "setSeizedPropertyStepNotesDraft",
        "seizedPropertyAuctionResultModalOpen",
        "setSeizedPropertyAuctionResultModalOpen",
        "setSeizedPropertyAuctionResultPropertyId",
        "seizedPropertyAuctionResultEntityKind",
        "setSeizedPropertyAuctionResultEntityKind",
        "seizedPropertyAuctionResultOutcome",
        "setSeizedPropertyAuctionResultOutcome",
        "seizedPropertyAuctionResultBuyerNameDraft",
        "setSeizedPropertyAuctionResultBuyerNameDraft",
        "seizedPropertyAuctionResultAmountDraft",
        "setSeizedPropertyAuctionResultAmountDraft",
        "seizedPropertyAuctionDepositAmountDraft",
        "setSeizedPropertyAuctionDepositAmountDraft",
        "seizureMarkModalOpen",
        "setSeizureMarkModalOpen",
        "seizureMarkModalEntityKind",
        "setSeizureMarkModalEntityId",
        "seizureMarkLetterNumberDraft",
        "setSeizureMarkLetterNumberDraft",
        "seizureMarkDateDraft",
        "setSeizureMarkDateDraft",
        "seizureMarkEntityDraft",
        "setSeizureMarkEntityDraft",
        "publicationModalOpen",
        "setPublicationModalOpen",
        "publicationModalEntityKind",
        "setPublicationModalEntityId",
        "publicationNewspaperNameDraft",
        "setPublicationNewspaperNameDraft",
        "publicationDateYmdDraft",
        "setPublicationDateYmdDraft",
        "realEstateSeizureModalDecisionId",
        "setRealEstateSeizureModalDecisionId",
        "setGuarantorDetailsDecisionId",
        "guarantorNameDraft",
        "setGuarantorNameDraft",
        "guarantorWorkplaceDraft",
        "setGuarantorWorkplaceDraft",
        "guarantorSalaryDraft",
        "setGuarantorSalaryDraft",
        "guarantorDeductionDraft",
        "setGuarantorDeductionDraft",
        "openGuarantorDetailsModal"
    ] as const;

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
        "forcedPathAttendanceSecured",
        "investigationMemoIssued"
    ] as const;

export function coercionOrchestratorScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIONORCHESTRATOR_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTORWORKSPACECONTEXT_KEYS = [
        "allDebtorsUnified",
        "debtorWorkspaceEntries",
        "debtorBrowserTabsMode",
        "multiDebtorMode",
        "liabilityGroupTabsMode",
        "activeGroupEntries",
        "isSolidaryLiability",
        "primaryDebtorWorkspaceKey",
        "primaryDebtorKeyResolved",
        "showFollowupSolidaryDebtorTabs",
        "followupAssignmentWorkspaceCtx",
        "assignmentWorkspaceCtx",
        "unifiedSummonsTargetDebtorKey",
        "activeDebtorNoticeScope",
        "scopedSummonsMarker",
        "modalActiveDebtorNoticeScope",
        "debtorLiabilityGroups",
        "mergedTimelineEventsDebtorScoped",
        "mergedTimelineRadarPreviewLimit",
        "effectiveFollowupDebtorEntry",
        "effectiveCreditors",
        "effectiveDebtors",
        "creditorWorkspaceEntries",
        "debtorsSectionRef"
    ] as const;

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
        "showEmployeeAssignmentCoerciveBlock",
        "primaryDebtorTaklifActive"
    ] as const;

export function subsequentNoticeFlowScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SUBSEQUENTNOTICEFLOW_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const TIMELINEUI_KEYS = [
        "timelineAccordionExpanded",
        "setTimelineAccordionExpanded",
        "activeTimelineFilter",
        "setActiveTimelineFilter",
        "timelineEvents",
        "setTimelineEvents",
        "timelineEditDraft",
        "setTimelineEditDraft",
        "timelineFilterOptions",
        "timelineDebtorMetadata",
        "timelineRadarPreviewLimit",
        "activeTimelineEvents",
        "activeTimelineEventsDebtorScoped",
        "showOnlyActiveFileTimeline",
        "setShowOnlyActiveFileTimeline",
        "mergedTimelineEvents",
        "mergeSimilarRecentTimelineEvent",
        "nextTimelineId",
        "trashedCaseNotes",
        "trashedCaseTasks",
        "trashedTimelineEvents"
    ] as const;

export function timelineUiScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, TIMELINEUI_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EXECUTIONFILECONTEXT_KEYS = [
        "executionData",
        "executionDataRef",
        "executionId",
        "viewExecutionData",
        "currentFile",
        "currentFileId",
        "file",
        "fileNumber",
        "fileYear",
        "executionStatus",
        "executionPaused",
        "executionReportPrompt",
        "executionAppealBanner",
        "executionMemoBadgePopoverOpen",
        "onClose",
        "onUpdate",
        "activeSubFileId",
        "docNumber",
        "activeTabId",
        "setActiveTabId",
        "childDossiers",
        "subFiles",
        "parentDossierId",
        "parentExecutionFile",
        "hasChildDossiers",
        "visitChildNames",
        "linkedDossierToView",
        "setLinkedDossierToView"
    ] as const;

export function executionFileContextScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EXECUTIONFILECONTEXT_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZURESTATE_KEYS = [
        "seizedAssets",
        "setSeizedAssets",
        "seizureDraftsByDecisionId",
        "setSeizureDraftsByDecisionId",
        "seizureMatrix",
        "seizureMatrixLedgerParamsRef",
        "seizureDetailCompletion",
        "movableSeizureRegistryAssets",
        "realEstateSeizureAssets",
        "realEstateSeizureRegistryAssets",
        "salarySeizureRegistryAssets",
        "thirdPartySeizureAssets",
        "thirdPartySeizureRegistryAssets",
        "thirdPartySeizuresUi",
        "setThirdPartySeizuresUi"
    ] as const;

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

