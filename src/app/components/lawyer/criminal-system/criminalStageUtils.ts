export type { CaseStage } from '@/app/types/criminal';
export { INVESTIGATION_EVENT_CATEGORIES, TRIAL_EVENT_CATEGORIES } from '@/app/types/criminal';

export {
    CRIMINAL_PROCEDURAL_STAGES,
    JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS,
    formatCriminalStageLabel,
    formatInvestigationDepositLocation,
    formatProceduralStageLabel,
    formatTrialCourtHeaderPrimary,
    hasJuvenileAccused,
    hasJuvenileParty,
    isInvestigationStoredStage,
    isJuvenileExclusiveStoredStage,
    isJuvenileOnlyDefendantScope,
    isJuvenileTrialStage,
    isReferralTrialStage,
    isStageAllowedForNewCasePartyMix,
    isValidCriminalStage,
    mapLegacyJuvenileCourtNameToAdultStage,
    normalizeLegacyCriminalStage,
    resolveCourtDisplayName,
    resolveNewCaseStageSelectOptions,
    resolveStageListLabel,
    shouldUseJuvenileTrialJourneyLabels,
    stageToProceduralKey,
    todayIsoDate,
} from './criminalProceduralStageUtils';
export type {
    CourtDisplayContext,
    CriminalProceduralKey,
    InvestigationDepositLocationFields,
    TrialCourtHeaderFields,
} from './criminalProceduralStageUtils';

export {
    CONFIDENTIAL_SESSION_BADGE,
    CORE_DEFENDANT_STATUSES,
    DEFENDANT_STATUS_UI_LABELS,
    JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS,
    JUVENILE_REMEDIAL_DECISION_OPTIONS,
    coerceDefendantStatusToCore,
    filterDefendantStatusOptions,
    formatDefendantStatusLabel,
    formatDefendantStatusShortLabel,
    getDefendantStatusButtonClass,
    getDefendantStatusSelectOptions,
    getJuvenileDefendantStatusSelectOptions,
    isJuvenileOnlyDefendantStatus,
    isValidJuvenileDetentionPlacement,
    isValidSocialInquiryWorkflowStatus,
    juvenileDetentionPlacementLabel,
    normalizeDefendantStatusForJuvenileToggle,
    resolveDefendantStatusCaseType,
    resolveDefendantStatusProceduralStage,
    socialInquiryWorkflowLabel,
} from './criminalDefendantStatusUtils';
export type {
    CoreDefendantStatus,
    DefendantStatusCaseType,
    DefendantStatusProceduralStage,
    DefendantStatusSelectOption,
    JuvenileDetentionPlacement,
    SocialInquiryWorkflowStatus,
} from './criminalDefendantStatusUtils';

export {
    PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
    PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY,
    PRIVATE_RIGHT_WAIVER_DECISION_VALUE,
    PRIVATE_RIGHT_WAIVER_DECISION_LABEL,
    isPrivateRightWaiverDecisionValue,
    isPrivateRightWaiverTimelineCategory,
    INVESTIGATION_ARTICLE_130_DECISIONS,
    INVESTIGATION_CLOSURE_REASONS,
    INVESTIGATION_TIMELINE_OTHER_CATEGORY,
    INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY,
    isInvestigationAffidavitTimelineCategory,
    INVESTIGATION_TIMELINE_CATEGORIES,
    LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY,
    isInvestigationTimelineCategory,
    isLockedInvestigationTimelineEvent,
    isInvestigationPersonalDefendantCategory,
    isInvestigationNonPersonalCategory,
    isInvalidTimelineTitlePlaceholder,
    normalizeTimelineCategoryForDisplay,
    formatTimelineCategoryDisplayLabel,
    resolveTimelineEventTitle,
    isTimelineNextDateInvalid,
    isInvestigationDetentionCategory,
    isInvestigationReferralCategory,
    isInvestigationCassationAppealCategory,
    isDetentionArrestCategory,
    resolveInvestigationTimelineEventType,
} from './criminalTimelineCategoryUtils';
export type { InvestigationClosureReason } from './criminalTimelineCategoryUtils';

export {
    caseStageFromStoredStage,
    storedStageFromCaseStage,
    syncStoredStageFromJourneyCaseStage,
    resolveCaseStageFromRecord,
    resolveOperationalCaseStage,
    resolveMergeEligibilityStage,
    isInvestigationMergeBucket,
    resolveMergeStageBucket,
    resolveMergeComparisonStage,
    isTrialCaseStage,
} from './criminalMergeStageUtils';
export type { MergeStageBucket } from './criminalMergeStageUtils';

export {
    legacyRoleFromRepresentation,
    anonymizeJuvenilePartyName,
    displayPartyNameForCase,
    formatConcernedPartyLabel,
    formatLawyerRequestStatusLabel,
    formatInvestigationLogStatusLabel,
    normalizeInvestigationLogStatus,
    buildCriminalActionParties,
    isComplainantAlsoAccused,
} from './criminalActionPartyUtils';
export type { CriminalActionParty, InvestigationLogStatus } from './criminalActionPartyUtils';
