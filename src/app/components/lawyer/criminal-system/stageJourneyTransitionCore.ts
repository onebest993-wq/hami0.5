/**
 * Transition/label surface used by case-transform and store actions.
 * Implementation lives in stageJourney* modules; this file preserves the prior import path.
 */

export type { JourneyTransitionKind, ProceduralTransitionActionId } from './stageJourneyTypes';
export type {
    ProceduralTransitionOption,
    JourneyNodeLabelOptions,
    JourneyNodeLabelStage,
    ProceduralRouteDecisionType,
} from './stageJourneyTypes';

export {
    CRIMINAL_JOURNEY_ROUTE_COUNT,
    JUVENILE_TRIAL_JOURNEY_LABEL,
    PROCEDURAL_ROUTE_DECISION_TYPES,
    isProceduralRouteDecisionType,
} from './stageJourneyTypes';

export {
    isGenericJuvenileTrialJourneyLabel,
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
