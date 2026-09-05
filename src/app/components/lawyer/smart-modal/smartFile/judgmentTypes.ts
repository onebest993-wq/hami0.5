export { JUDGMENT_TYPE_VOID } from './judgmentConstants';
export type { FirstInstanceAppealAction, FirstInstanceAppealRights } from './firstInstanceAppealRightsTypes';
export type {
    StageOutcome,
    JudgmentFormType,
    CourtJurisdiction,
    FirstInstanceDegree,
    StageTransitionMetadata,
    AppealStageMetadata,
} from './judgmentStageMetadataTypes';
export {
    STAGE_OUTCOMES,
    JUDGMENT_FORM_TYPES,
    COURT_JURISDICTIONS,
    FIRST_INSTANCE_DEGREES,
    isStageOutcome,
    isJudgmentFormType,
    isCourtJurisdiction,
    isFirstInstanceDegree,
    normalizePartyId,
    normalizePartyIdList,
    parseJudgmentFormType,
    resolveStructuredJudgmentForm,
    legacyAppealOutcomeToStageOutcome,
    stageOutcomeToLegacyAppealOutcome,
    readAppellantPartyIds,
    readAppelleePartyIds,
    buildStageTransitionMetadata,
    mergeAppealStageMetadata,
} from './judgmentStageMetadataTypes';
export { resolveCourtJurisdiction, resolveFirstInstanceDegree } from './stageJurisdictionResolution';
export { resolveLawyerSide } from './lawyerSideResolution';
export { isAppealStageName, isCassationStageName } from './judgmentStageNames';
export { resolveClientMarkedParty } from './clientMarkedParty';
export { resolveClientPartyBucket } from './clientPartyBucket';

export type {
    JudgmentPayload,
    AppealTransitionPayload,
    CrossAppealPayload,
    StageTransitionPayload,
    SmartFileAttachment,
} from './judgmentPayloadTypes';

export {
    str,
    parseJudgmentDateInput,
    addDaysYmd,
    prependTimeline,
    stageAttachments,
    JUDGMENT_TYPE_SULH,
    JUDGMENT_TYPE_SULH_LEGACY,
    JUDGMENT_TYPE_WAIVER,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    isSulhJudgmentType,
    isNonMeritTerminationType,
    JUDGMENT_TYPE_FULL_WIN,
    isSubjectMatterJudgmentType,
    isDefendantOnlyCassationJudgmentType,
} from './judgmentTypeGuards';

export {
    resolveFirstInstanceHadoriAppealRights,
    resolveJudgmentAppealHintForLawyer,
} from './firstInstanceAppealRights';

export {
    isFirstInstanceStageName,
    resolveAllowedOpponentAppealMethods,
    isAwaitingOpponentAppeal,
    shouldShowOpponentAppealRegisterButton,
    isPlaintiffFavorableFinalDecision,
    isClientWonAwaitingOpponentFinalDecision,
    isClientSelfAppealFinalDecision,
    hasMeritJudgmentRecorded,
    shouldShowOpponentAppealWatchPostJudgmentFooter,
    shouldShowClientAppealPostJudgmentFooter,
    isPartialBothInterestFinalDecision,
    isPartialBothInterestStage,
} from './opponentAppealMethods';
