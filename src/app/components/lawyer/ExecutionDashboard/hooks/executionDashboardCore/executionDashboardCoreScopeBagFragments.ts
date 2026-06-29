// @ts-nocheck
/** Phase C Slice 18+20 — fragments لحقائب chunk scope (generated + pick) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from './scopeBagPick';

const FOLLOWUPTABASSEMBLY_KEYS = [
        "executionDomainContext",
        "followupSpecialization",
        "followupSpecializationEffective",
        "showPersonalCoerciveFollowupTab",
        "showSalarySeizureInFollowupModal",
        "followupSalarySeizureLabel",
        "showEmployeeCompulsoryProceduresBanner",
        "activeFollowupDebtorKey",
        "personalTabUnlockByDebtor",
        "setPersonalTabUnlockByDebtor",
        "employeePersonalTabUnlockStorageKey",
        "custodyRemovalClaimActive",
        "employeeCoerciveDetentionRestricted",
        "modalEmployeeCoerciveDetentionRestricted",
        "modalShowPersonalCoerciveFollowupTab",
        "personalTabLockedForEmployee",
        "modalPersonalTabLockedForEmployee",
        "followupTabsRestricted",
        "followupSectionTabOrder",
        "followupModalTabs",
        "isFollowupTabActive",
        "openFollowupModalPersisted",
        "closeFollowupModalPersisted",
        "persistFollowupModalViewport",
        "goFollowupSectionTabByDelta"
    ] as const;

export function followupTabAssemblyScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPTABASSEMBLY_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const RUNTIMEBINDINGS_KEYS = [
        "insertTimelineEventToSupabase",
        "syncSeizedAssets",
        "syncSeizureDrafts",
        "syncActiveCoerciveActions",
        "evictionExecutorWorkflow",
        "seizedAssetsModalExecutionId",
        "totalExecutionExpenses",
        "initialFileNumber"
    ] as const;

export function runtimeBindingsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, RUNTIMEBINDINGS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const NOTESTASKSHANDLERS_KEYS = [
        "handleAddTimelineEvent",
        "handleCompleteTask",
        "handleDeleteTask",
        "handleMemoFollowupClick",
        "handleSaveTask",
        "handleUpdateTask",
        "commitDossierNote"
    ] as const;

export function notesTasksHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, NOTESTASKSHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const TRASHANDPINS_KEYS = [
        "moveTimelineEventToTrash",
        "toggleTimelineEventPin",
        "requestEditTimelineEvent",
        "restoreTimelineEventFromTrash",
        "permanentlyDeleteTimelineEvent",
        "moveCaseNoteToTrash",
        "moveCaseTaskToTrash",
        "toggleCaseNotePin",
        "toggleCaseTaskPin",
        "saveTimelineEditDraft",
        "restoreCaseNoteFromTrash",
        "permanentlyDeleteCaseNote",
        "restoreCaseTaskFromTrash",
        "permanentlyDeleteCaseTask"
    ] as const;

export function trashAndPinsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, TRASHANDPINS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const CLAIMFINANCIALS_KEYS = [
        "isNonFinancialClaim",
        "isVisitationClaim",
        "isMaritalFurnitureClaim",
        "maritalFurnitureItemsForFollowup",
        "isAlimonyClaimType",
        "principalDebtAmount",
        "financialPrincipalAmount",
        "financialLawyerFeesAmount",
        "claimTypeForExecutionModule",
        "isEvictionExecutionModule",
        "judicialCustodiansResolved",
        "judicialCustodianSalariesExpenseIqd",
        "evictionCaseExpensesTotalForFinancial",
        "evictionLawyerFeesInTotals",
        "totalOwed",
        "unifiedLedgerRevision",
        "setUnifiedLedgerRevision",
        "debtorNotifiedForEvictionGrace",
        "isAlimonyClaim"
    ] as const;

export function claimFinancialsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, CLAIMFINANCIALS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const GRACEANDSUMMONING_KEYS = [
        "daysSinceNoticeCalculated",
        "daysRemainingInGracePeriod",
        "isGracePeriodExpiredNow",
        "isEvictionGraceExpiredCalendar",
        "isEvictionGraceEffectivelyExpired",
        "forcedSummoningAnalysis",
        "shouldCalculateExecutionFee",
        "calculatedExecutionFee",
        "totalWithExecutionFee",
        "remaining"
    ] as const;

export function graceAndSummoningScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, GRACEANDSUMMONING_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const LEDGERSYNC_KEYS = [
        "remainingBalanceForSeizure",
        "settlementGuarantorGate"
    ] as const;

export function ledgerSyncScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, LEDGERSYNC_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const COERCIVEUISTATE_KEYS = [
        "coerciveUiLocked",
        "executionCoerciveButtonDisabled",
        "executionActionsGridLocked",
        "executionToolsTimelineLockedUi",
        "evictionProcedureLocked"
    ] as const;

export function coerciveUiStateScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIVEUISTATE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PARTYDEATHHANDLERS_KEYS = [
        "handlePartyDeathSave",
        "handleAlimonyBeneficiaryDeathConfirm",
        "handleRequestDebtorSubstitution",
        "handleRequestCreditorSubstitution",
        "handleCreditorDeathMenuAction",
        "handleDebtorDeathMenuAction",
        "debtorSubstitutionRequestStatus",
        "creditorSubstitutionRequestStatus"
    ] as const;

export function partyDeathHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PARTYDEATHHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EMPLOYEEASSIGNMENTHANDLERS_KEYS = [
        "handleEmployeeAssignmentConfirm",
        "handleEmployeeAssignmentAttend",
        "handleEmployeeAssignmentDeclareAbsent",
        "handleEmployeeAssignmentRequestForcedBring",
        "handleEmployeeAssignmentRequestInvestigation",
        "handleEmployeeAssignmentResolveForcedBringOutcome",
        "handleEmployeeAssignmentTerminate",
        "handleEmployeeRegisterArrestOrder",
        "handleEmployeeWarrantOutcome"
    ] as const;

export function employeeAssignmentHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EMPLOYEEASSIGNMENTHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const HEIRSNOTIFICATIONHANDLERS_KEYS = [
        "activeDebtorHeirsForNotification",
        "heirsWorkflowByHeir",
        "normalizeHeirWorkflowKey",
        "computeDeadlineYmd",
        "computeDaysRemaining",
        "openHeirsNotificationCenter",
        "issueHeirMemoNotice",
        "issueHeirSummons",
        "markHeirSummonsAttended",
        "markHeirSummonsPeriodEnded",
        "closeHeirMemoManually"
    ] as const;

export function heirsNotificationHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, HEIRSNOTIFICATIONHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTORSUMMONSCOERCIVEHANDLERS_KEYS = [
        "clearDebtorSummonsMarker",
        "terminateDebtorSummonsMarker",
        "saveSummonsMarkerPurposeEdit",
        "handleForcedAttendance",
        "handleDebtorEvasion"
    ] as const;

export function debtorSummonsCoerciveHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DEBTORSUMMONSCOERCIVEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const VOLUNTARYPERIODHANDLERS_KEYS = [
        "handleDeclareEvictionVoluntaryPeriodEnd",
        "handleDeclareNoticeVoluntaryPeriodEnd",
        "registerDebtorVoluntaryAttendance"
    ] as const;

export function voluntaryPeriodHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, VOLUNTARYPERIODHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PUBLICATIONNOTICEHANDLERS_KEYS = [
        "handlePublicationNoticeRegister",
        "handlePublicationNoticeTerminate",
        "handlePublicationNoticeDebtorAttended"
    ] as const;

export function publicationNoticeHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PUBLICATIONNOTICEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const NOTIFYDEBTORHANDLER_KEYS = [
        "handleNotifyDebtor"
    ] as const;

export function notifyDebtorHandlerScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, NOTIFYDEBTORHANDLER_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DEBTOREMPLOYMENTHANDLER_KEYS = [
        "handleDebtorEmploymentToggle"
    ] as const;

export function debtorEmploymentHandlerScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DEBTOREMPLOYMENTHANDLER_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const GRACEPERIODENDHANDLER_KEYS = [
        "handleEndGracePeriod"
    ] as const;

export function gracePeriodEndHandlerScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, GRACEPERIODENDHANDLER_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const STAYHANDLERS_KEYS = [
        "handleLiftStayOfExecution",
        "handleSpecialCasesStay",
        "handleResumeExecution"
    ] as const;

export function stayHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, STAYHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const DOSSIERFOLLOWUPHANDLERS_KEYS = [
        "handleDossierAction",
        "runSpecialFollowupSubmit",
        "creditorOtherPartyTrackHandlers",
        "otherPartyTabSubmitHandler",
        "openOtherPartyAppealsModal"
    ] as const;

export function dossierFollowupHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, DOSSIERFOLLOWUPHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PAYMENTHANDLERS_KEYS = [
        "handlePayment",
        "handlePaymentFromCalculator",
        "handleFundsLedgerPayment",
        "handleSettlementFromCalculator"
    ] as const;

export function paymentHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PAYMENTHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EVICTIONRESIDENTIALGRACEHANDLERS_KEYS = [
        "residentialGraceModalShowPrimarySave",
        "openEvictionResidentialGraceModal",
        "submitEvictionResidentialGraceFromModal",
        "completeEvictionResidentialGrace"
    ] as const;

export function evictionResidentialGraceHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EVICTIONRESIDENTIALGRACEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EVICTIONHEIRSMEMOHANDLERS_KEYS = [
        "handleEvictionHeirsNotificationDateChange",
        "handleIssueHeirsExecutionNoticeMemo"
    ] as const;

export function evictionHeirsMemoHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EVICTIONHEIRSMEMOHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const POLICEASSISTANCEHANDLERS_KEYS = [
        "completePoliceAssistance",
        "openPoliceAssistanceFromBadge",
        "openPoliceAssistanceDetailsForDecision",
        "savePoliceAssistanceFromModal",
        "savePoliceAssistanceEntry"
    ] as const;

export function policeAssistanceHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, POLICEASSISTANCEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const BREAKINVENTORYHANDLERS_KEYS = [
        "saveBreakInventoryLedgerEntry",
        "finalizeBreakInventoryEntry",
        "saveMaritalFurnitureDeliveryInventoryEntry"
    ] as const;

export function breakInventoryHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, BREAKINVENTORYHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const GUARANTORFOLLOWUPHANDLERS_KEYS = [
        "appendGuarantorFollowupRequest",
        "archiveAndClearGuarantor",
        "handleGuarantorRequestFromFollowup",
        "persistGuarantorFollowupDetails",
        "requestGuarantorSeizure",
        "requestFollowupSeizureDecision"
    ] as const;

export function guarantorFollowupHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, GUARANTORFOLLOWUPHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EVICTIONFINANCIALHANDLERS_KEYS = [
        "handleEvictionLawyerFeeRequest",
        "runEvictionLawyerFeeSubmit",
        "handleEvictionLedgerActivated",
        "runEvictionExpenseSubmit"
    ] as const;

export function evictionFinancialHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, EVICTIONFINANCIALHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const MODULEEXPENSEHANDLERS_KEYS = [
        "handleEncroachmentExpenseRecorded",
        "handleSpecificDeliveryExpenseRecorded",
        "handleSpecificDeliveryFinancialized",
        "handleSpecificDeliveryItemDeclaredDestroyed"
    ] as const;

export function moduleExpenseHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, MODULEEXPENSEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FOLLOWUPSEIZUREHANDLERS_KEYS = [
        "submitPropertySeizureRequest",
        "submitMovableSeizureRequest",
        "saveSeizedPropertyInitForDecision",
        "saveSeizedMovableInitForDecision"
    ] as const;

export function followupSeizureHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPSEIZUREHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZUREASSETMODALHANDLERS_KEYS = [
        "focusSeizurePropertyInlineCompletion",
        "focusSeizureMovableInlineCompletion",
        "saveSeizureMarkConfirmation",
        "savePublicationDetails",
        "saveSeizedPropertyStepDetails",
        "saveSeizedPropertyAuctionSessionResult"
    ] as const;

export function seizureAssetModalHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SEIZUREASSETMODALHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const THIRDPARTYRECEIVEHANDLERS_KEYS = [
        "beginThirdPartyReceiveStep",
        "updateThirdPartyReceiveDraft",
        "cancelThirdPartyReceiveStep",
        "confirmThirdPartyReceive"
    ] as const;

export function thirdPartyReceiveHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, THIRDPARTYRECEIVEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const COERCIVEACTIONBRIDGE_KEYS = [
        "saveCoerciveAction",
        "clearActiveSalarySeizurePath"
    ] as const;

export function coerciveActionBridgeScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIVEACTIONBRIDGE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const COERCIVEACTIONHANDLERS_KEYS = [
        "handleCoerciveAction"
    ] as const;

export function coerciveActionHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, COERCIVEACTIONHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const STANDALONEMARKHANDLERS_KEYS = [
        "saveStandaloneExecutionMarkForDecision"
    ] as const;

export function standaloneMarkHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, STANDALONEMARKHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SALARYSEIZUREPATCH_KEYS = [
        "patchSalarySeizureAssetDetails"
    ] as const;

export function salarySeizurePatchScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SALARYSEIZUREPATCH_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const THIRDPARTYSEIZUREHANDLERS_KEYS = [
        "saveThirdPartySeizureForDecision"
    ] as const;

export function thirdPartySeizureHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, THIRDPARTYSEIZUREHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const REALESTATESEIZUREHANDLERS_KEYS = [
        "realEstateModalInitial",
        "saveRealEstateSeizureFromModal"
    ] as const;

export function realEstateSeizureHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, REALESTATESEIZUREHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SEIZURERELEASEHANDLERS_KEYS = [
        "releaseSeizureAssetRow"
    ] as const;

export function seizureReleaseHandlersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, SEIZURERELEASEHANDLERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const FOLLOWUPSEIZURETABS_KEYS = [
        "showGuarantorInSeizureFollowupTab",
        "effectiveFollowupModalTabs",
        "openSeizureRequestsTab"
    ] as const;

export function followupSeizureTabsScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, FOLLOWUPSEIZURETABS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PERSISTEXECUTIONMERGE_KEYS = [
        "persistExecutionMerge"
    ] as const;

export function persistExecutionMergeScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PERSISTEXECUTIONMERGE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PUSHTIMELINEEVENT_KEYS = [
        "pushTimelineEvent"
    ] as const;

export function pushTimelineEventScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PUSHTIMELINEEVENT_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PENDINGEXECUTOROPENERS_KEYS = [
        "tryOpenPendingBreakInventoryLedger",
        "tryOpenPendingCustodianDetails"
    ] as const;

export function pendingExecutorOpenersScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PENDINGEXECUTOROPENERS_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const APPOINTMENTHANDLER_KEYS = [
        "handleSaveAppointment"
    ] as const;

export function appointmentHandlerScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, APPOINTMENTHANDLER_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PARENTDOSSIERPERSISTENCE_KEYS = [
        "parentIsEvictionForExpandedHeader",
        "openParentDossierMetaEdit"
    ] as const;

export function parentDossierPersistenceScopeFragment(
    source: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagPick(source, PARENTDOSSIERPERSISTENCE_KEYS) as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const JUDICIALCUSTODIANREMOVE_KEYS = [
        "removeJudicialCustodianEntry"
    ] as const;

export function judicialCustodianRemoveScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'removeJudicialCustodianEntry') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const EXECUTORAPPROVALACTIONS_KEYS = [
        "executorApprovalActions"
    ] as const;

export function executorApprovalActionsScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'executorApprovalActions') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const OTHERPARTYMIRROR_KEYS = [
        "otherPartyCreditorMirrorProps"
    ] as const;

export function otherPartyMirrorScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'otherPartyCreditorMirrorProps') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const PROPERTYINLINESAVECTX_KEYS = [
        "propertyInlineSaveCtx"
    ] as const;

export function propertyInlineSaveCtxScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'propertyInlineSaveCtx') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

const SALARYSEIZURETABROWS_KEYS = [
        "salarySeizureTabRows"
    ] as const;

export function salarySeizureTabRowsScopeFragment(binding: unknown): Partial<ExecutionDashboardCoreScopeBagInput> {
    return scopeBagBindingFragment(binding, 'salarySeizureTabRows') as Partial<ExecutionDashboardCoreScopeBagInput>;
}

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
        "forcedPathAttendanceSecured"
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
        "showEmployeeAssignmentCoerciveBlock"
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

export function mergeExecutionDashboardCoreScopeBagFragments(
    ...fragments: Array<Partial<ExecutionDashboardCoreScopeBagInput>>
): Partial<ExecutionDashboardCoreScopeBagInput> {
    return Object.assign({}, ...fragments) as Partial<ExecutionDashboardCoreScopeBagInput>;
}
