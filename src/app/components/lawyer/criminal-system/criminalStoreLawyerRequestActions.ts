/**
 * Lawyer requests, detention decisions, judicial appeal lifecycle — barrel
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalDetentionDecisionActions } from './criminalStoreDetentionDecisionActions';
import { createCriminalJudicialDecisionLifecycleActions } from './criminalStoreJudicialDecisionLifecycleActions';
import { createCriminalLawyerRequestCrudActions } from './criminalStoreLawyerRequestCrudActions';
import { createCriminalLawyerRequestCreateActions } from './criminalStoreLawyerRequestCreateActions';
import { createCriminalLawyerRequestTrashActions } from './criminalStoreLawyerRequestTrashActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLawyerRequestActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        ...createCriminalDetentionDecisionActions(set, get),
        ...createCriminalJudicialDecisionLifecycleActions(set, get),
        ...createCriminalLawyerRequestCrudActions(set, get),
        ...createCriminalLawyerRequestCreateActions(set, get),
        ...createCriminalLawyerRequestTrashActions(set, get),
    };
}
