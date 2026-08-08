// @ts-nocheck
/** ui/state scope bag fragments — fragments لحقائب chunk scope (generated + pick) */
import type { ExecutionDashboardCoreScopeBagInput } from '../buildExecutionDashboardCoreScopeBags';
import { scopeBagPick, scopeBagBindingFragment } from '../scopeBagPick';
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
