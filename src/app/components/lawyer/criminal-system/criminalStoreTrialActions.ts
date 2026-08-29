/**
 * Trial sessions, verdicts, depositions, charge modification — extracted from criminalStore.ts
 * Public factory path preserved; action clusters live in sibling modules.
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalTrialEvidenceActions } from './criminalStoreTrialEvidenceActions';
import { createCriminalTrialHearingActions } from './criminalStoreTrialHearingActions';
import { createCriminalTrialSessionActions } from './criminalStoreTrialSessionActions';
import { createCriminalTrialVerdictCardActions } from './criminalStoreTrialVerdictCardActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrialActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalTrialSessionActions(set, get),
        ...createCriminalTrialHearingActions(set, get),
        ...createCriminalTrialVerdictCardActions(set, get),
        ...createCriminalTrialEvidenceActions(set, get),
    };
}
