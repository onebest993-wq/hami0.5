/**
 * Lifecycle actions composer — party status + case ops + merge/draft.
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalPartyStatusActions } from './criminalStorePartyStatusActions';
import { createCriminalCaseOpsActions } from './criminalStoreCaseOpsActions';
import { createCriminalMergeDraftActions } from './criminalStoreMergeDraftActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLifecycleActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalPartyStatusActions(set, get),
        ...createCriminalCaseOpsActions(set, get),
        ...createCriminalMergeDraftActions(set, get),
    };
}
