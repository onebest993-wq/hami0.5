import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';
import { useDecisionsAppealsRowMutations } from './useDecisionsAppealsRowMutations';
import { useDecisionsAppealsExecutorResolve } from './useDecisionsAppealsExecutorResolve';
import { useDecisionsAppealsAppealWorkflowMutations } from './useDecisionsAppealsAppealWorkflowMutations';

export type { DecisionsAppealsMutationsCoreParams as UseDecisionsAppealsMutationsParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        patchDecisionRow,
        logAppealTimeline,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
    } = useDecisionsAppealsRowMutations(params);

    const { handleExecutorResolveById } = useDecisionsAppealsExecutorResolve(params);

    const {
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyLawyerCassationEntry,
    } = useDecisionsAppealsAppealWorkflowMutations(params);

    return {
        patchDecisionRow,
        applyCassationCourtDecision,
        applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance,
        applyWaiveInitialAppeal,
        logAppealTimeline,
        handleExecutorResolveById,
        handleDeleteDecision,
        handleArchiveDecision,
        handleAddDecision,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyLawyerCassationEntry,
    };
}
