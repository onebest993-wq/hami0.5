/**
 * Requests actions composer — lawyer requests + trash/margins.
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalLawyerRequestActions } from './criminalStoreLawyerRequestActions';
import { createCriminalTrashMarginActions } from './criminalStoreTrashMarginActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalRequestsActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalLawyerRequestActions(set, get),
        ...createCriminalTrashMarginActions(set, get),
    };
}
