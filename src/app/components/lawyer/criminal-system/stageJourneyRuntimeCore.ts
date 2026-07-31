/**
 * Canonical stage-journey runtime helpers — re-exported from stageJourney.ts
 * to avoid logic drift between duplicate implementations.
 */
export type { JourneyNode } from '@/app/types/criminal';
export type { JourneyBranchTrack } from './stageJourney';

export {
    buildInitialStageJourney,
    hasActiveJourneyFork,
    getJourneyBranchTracks,
    forkStageJourneyFromCurrent,
    appendStageJourneyPhaseOverlay,
    migrateProceduralNodesToStageJourney,
    repairSameCourtRemandJourneyNodes,
    reactivateSameCourtRemandJourney,
    appendStageJourneyNode,
    isJourneyTenureArchived,
    getCurrentJourneyNode,
    resolveCurrentJourneyNodeId,
    parseEventDateKey,
    eventBelongsToJourneyBranch,
    eventBelongsToJourneyNode,
} from './stageJourney';
