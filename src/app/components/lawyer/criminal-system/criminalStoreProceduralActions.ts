/**
 * Procedural canvas / container / sub-item actions — extracted from criminalStore.ts
 * Public factory path preserved; action clusters live in sibling modules.
 */
import type { StoreApi } from 'zustand';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalProceduralContainerActions } from './criminalStoreProceduralContainerActions';
import { createCriminalProceduralSubItemActions } from './criminalStoreProceduralSubItemActions';
import { createCriminalProceduralTreeActions } from './criminalStoreProceduralTreeActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalProceduralActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalProceduralContainerActions(set, get),
        ...createCriminalProceduralSubItemActions(set, get),
        ...createCriminalProceduralTreeActions(set, get),
    };
}
