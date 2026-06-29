import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';
import { useDecisionsAppealsCassationMutations } from './useDecisionsAppealsCassationMutations';
import { useDecisionsAppealsGrievanceMutations } from './useDecisionsAppealsGrievanceMutations';
import { useDecisionsAppealsWaiveAppealMutations } from './useDecisionsAppealsWaiveAppealMutations';
import { useDecisionsAppealsTransitionWorkflow } from './useDecisionsAppealsTransitionWorkflow';
import { useDecisionsAppealsAppealEntryMutations } from './useDecisionsAppealsAppealEntryMutations';

export function useDecisionsAppealsAppealWorkflowMutations(
    params: DecisionsAppealsMutationsCoreParams,
) {
    const { applyCassationCourtDecision } = useDecisionsAppealsCassationMutations(params);
    const { applyGrievanceCourtOutcome } = useDecisionsAppealsGrievanceMutations(params);
    const { applyWaiveCassationAfterDebtorGrievance, applyWaiveInitialAppeal } =
        useDecisionsAppealsWaiveAppealMutations(params);
    const { transitionAppealWorkflow } = useDecisionsAppealsTransitionWorkflow(params);
    const { commitExecutorSideAppealEntry, commitQueueRequestAppealEntry, applyLawyerCassationEntry } =
        useDecisionsAppealsAppealEntryMutations({ ...params, transitionAppealWorkflow });

    return {
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        commitQueueRequestAppealEntry,
        applyLawyerCassationEntry,
    };
}
