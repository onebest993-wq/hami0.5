/**
 * Public verdict-cards engine API — barrel re-exporting split modules.
 * Import path `./verdictCardsEngine` is preserved for all consumers.
 */

export type {
    VerdictCard,
    VerdictCardDisplayRow,
    VerdictCardOutcome,
    VerdictCassationResultValue,
    VerdictCorrectionAppealTrack,
    VerdictInterventionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from './verdictCardTypes';

export {
    VERDICT_CASSATION_RESULT_OPTIONS,
    VERDICT_REFERRAL_COURT_OPTIONS,
} from './verdictCardTypes';

export {
    formatVerdictCassationResultLabel,
    verdictCardShellClass,
    verdictOutcomeEmoji,
    verdictOutcomeLabel,
} from './verdictCardPresentation';

export { normalizeVerdictCards } from './verdictCardNormalize';

export {
    canShowVerdictCassationCorrection,
    isVerdictCassationFilingComplete,
    isVerdictCassationUnderReview,
    isVerdictCorrectionAppealFiled,
    isVerdictCorrectionAppealPending,
    isVerdictOrdinaryCassationConsumed,
} from './verdictCardCassationGates';

export {
    buildVerdictCardFromConclusion,
    migrateVerdictCardsOnCase,
    resolveVerdictCardsLifecycle,
    upsertVerdictCardFromConclusion,
} from './verdictCardLifecycle';

export {
    expandVerdictCardsForDisplay,
    mergeCorrectionAppealTrack,
    mergeInterventionAppealTrack,
    mergeOrdinaryAppealTrack,
    patchVerdictCardInList,
} from './verdictCardPatch';
