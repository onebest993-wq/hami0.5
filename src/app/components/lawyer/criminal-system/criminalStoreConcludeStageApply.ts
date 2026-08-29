/**
 * Conclude-stage apply orchestrator.
 */
import type { StageConclusion } from './criminalCaseModel';
import type { CriminalStoreState } from './criminalStoreState.types';
import {
    tryConcludeStageEarly,
    type ConcludeStageReferral,
} from './criminalStoreConcludeStageEarly';
import { applyConcludeStageTerminal } from './criminalStoreConcludeStageTerminal';

export type { ConcludeStageReferral };

export function applyConcludeStageToState(
    state: CriminalStoreState,
    caseId: string,
    conclusion: StageConclusion,
    referral: ConcludeStageReferral | undefined,
): { state: CriminalStoreState; blockingError: string | null } {
    const blocking = { error: null as string | null };
    const early = tryConcludeStageEarly(state, caseId, conclusion, referral, blocking);
    if (early) return { state: early, blockingError: blocking.error };
    const target = state.casesById[caseId];
    if (!target) return { state, blockingError: blocking.error };
    return {
        state: applyConcludeStageTerminal(state, caseId, target, conclusion, referral),
        blockingError: blocking.error,
    };
}
