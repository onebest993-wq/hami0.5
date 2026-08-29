/**
 * Criminal Zustand store state surface — composed from domain slices.
 */
import type { CriminalStoreStateData } from './criminalStoreStateData.types';
import type { CriminalStoreStateDraftActions } from './criminalStoreStateDraftSlice.types';
import type { CriminalStoreStateEvidenceActions } from './criminalStoreStateEvidenceSlice.types';
import type { CriminalStoreStateRequestTrialActions } from './criminalStoreStateRequestTrialSlice.types';
import type { CriminalStoreStateJudicialActions } from './criminalStoreStateJudicialSlice.types';
import type { CriminalStoreStateLifecycleActions } from './criminalStoreStateLifecycleSlice.types';

export type CriminalStoreState = CriminalStoreStateData &
    CriminalStoreStateDraftActions &
    CriminalStoreStateEvidenceActions &
    CriminalStoreStateRequestTrialActions &
    CriminalStoreStateJudicialActions &
    CriminalStoreStateLifecycleActions;
