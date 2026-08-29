/**
 * Public stage-journey API — barrel re-exporting split modules.
 * Prefer importing from this path; leaf modules are implementation detail.
 */

export type {
    JourneyNode,
    JourneyTransitionKind,
    ProceduralTransitionActionId,
    ProceduralTransitionOption,
    JourneyNodeLabelOptions,
    JourneyNodeLabelStage,
    ProceduralRouteDecisionType,
    JourneyBranchTrack,
} from './stageJourneyTypes';

export {
    CRIMINAL_JOURNEY_ROUTE_COUNT,
    JUVENILE_TRIAL_JOURNEY_LABEL,
    PROCEDURAL_ROUTE_DECISION_TYPES,
    isProceduralRouteDecisionType,
} from './stageJourneyTypes';

export {
    journeyNodeLabel,
    formatJourneyPathDisplayLabel,
    journeyNodeLabelForAppend,
    coerceJuvenileTrialJourneyNodeLabel,
    sanitizeJourneyNodeLabelsForJuvenileScope,
} from './stageJourneyLabels';

export {
    proceduralActionFromConclusion,
    proceduralArrowToJourneyKind,
    resolveJourneyTransitionMeta,
    getStageTransitionOptions,
    findTransitionOption,
} from './stageJourneyTransitions';

export {
    buildInitialStageJourney,
    hasActiveJourneyFork,
    getJourneyBranchTracks,
    forkStageJourneyFromCurrent,
    appendStageJourneyNode,
    appendStageJourneyPhaseOverlay,
    migrateProceduralNodesToStageJourney,
} from './stageJourneyBuild';

export {
    parseEventDateKey,
    isJourneyTenureArchived,
    getCurrentJourneyNode,
    resolveCurrentJourneyNodeId,
    enforceSingleCurrentJourneyNode,
    nodeIdsInBranch,
    eventBelongsToJourneyBranch,
    eventBelongsToJourneyNode,
} from './stageJourneyQuery';

export {
    stripErroneousSameCourtRemandAppendNodes,
    repairSameCourtRemandJourneyNodes,
    reactivateSameCourtRemandJourney,
} from './stageJourneyRepair';
