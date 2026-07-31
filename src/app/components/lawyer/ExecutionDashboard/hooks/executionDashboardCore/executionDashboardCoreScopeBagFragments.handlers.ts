/** Scope bag fragments — handler pickers (party / eviction / seizure / coercive) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { scopeBagPick } from './scopeBagPick';

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
