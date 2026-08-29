/**
 * Barrel — public path for appeal / cassation remand / correction stage transitions.
 * Implementation lives in cohesive modules; keep imports pointed here.
 */
export {
    flipPartiesForAppealStage,
    resolveAppealRoleTitles,
    resolveOpponentAsAppellant,
    type AppealPartyFlipSelection,
} from './appealPartyFlip';
export {
    resolveAppealStageName,
    migrateAppealIncidentalCases,
    applyAppealStageTransition,
    shouldShowFirstInstanceIncidentalUi,
} from './appealStageTransitionApply';
export {
    resolveCassationRemandTarget,
    applyCassationRemand,
    cassationRemandSuccessMessage,
    normalizeLegacyCassationRemandStages,
} from './cassationRemandTransition';
export {
    applyCassationCorrectionOpen,
    applyCorrectionComplete,
    applyCorrectionRejected,
} from './cassationCorrectionTransition';
