/**
 * Canonical stage-journey runtime helpers — re-exported from split modules
 * to avoid logic drift between duplicate implementations.
 * Imports leaf modules (not stageJourney barrel) to keep the graph acyclic.
 */

export type { JourneyNode } from '@/app/types/criminal';
export type { JourneyBranchTrack } from './stageJourneyTypes';

export {
    buildInitialStageJourney,
    hasActiveJourneyFork,
    getJourneyBranchTracks,
    forkStageJourneyFromCurrent,
    appendStageJourneyPhaseOverlay,
    migrateProceduralNodesToStageJourney,
    appendStageJourneyNode,
} from './stageJourneyBuild';

export {
    repairSameCourtRemandJourneyNodes,
    reactivateSameCourtRemandJourney,
} from './stageJourneyRepair';

export {
    isJourneyTenureArchived,
    getCurrentJourneyNode,
    resolveCurrentJourneyNodeId,
    parseEventDateKey,
    eventBelongsToJourneyBranch,
    eventBelongsToJourneyNode,
} from './stageJourneyQuery';
