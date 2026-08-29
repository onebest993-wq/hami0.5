/**
 * Conclude-stage store actions — public factory path preserved.
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalReferCaseToTrialActions } from './criminalStoreReferCaseToTrialActions';
import { applyConcludeStageToState } from './criminalStoreConcludeStageApply';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalConcludeStageActions(set: SetFn, get: GetFn) {
    return {
        concludeStage: (caseId, conclusion, referral) => {
            let blockingError: string | null = null;
            set((state) => {
                const result = applyConcludeStageToState(state, caseId, conclusion, referral);
                blockingError = result.blockingError;
                return result.state;
            });
            return blockingError;
        },
        ...createCriminalReferCaseToTrialActions(set, get),
    };
}
