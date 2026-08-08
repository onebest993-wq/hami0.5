// @ts-nocheck
/** handler scope bag fragments — fragments لحقائب chunk scope (generated + pick) */
import type { ExecutionDashboardCoreScopeBagInput } from '../buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from '../scopeBagPick';
import { resolveScopeBagHandler } from '../scopeBagResolveHandler';

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
    source: Record<string, unknown> | unknown,
    topLevelFallback?: Record<string, unknown>,
): Partial<ExecutionDashboardCoreScopeBagInput> {
    const nested =
        source && typeof source === 'object' && !Array.isArray(source)
            ? (source as Record<string, unknown>)
            : undefined;
    const out: Record<string, unknown> = {};
    for (const key of SEIZUREASSETMODALHANDLERS_KEYS) {
        out[key] = resolveScopeBagHandler(
            [nested, topLevelFallback],
            key,
            `seizureAssetModalHandlers.${key}`,
        );
    }
    return out as Partial<ExecutionDashboardCoreScopeBagInput>;
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
        "tryOpenPendingCustodianDetails",
        "saveJudicialCustodianEntry"
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

