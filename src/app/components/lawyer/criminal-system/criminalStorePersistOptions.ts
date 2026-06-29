// @ts-nocheck
import { createCriminalShardedJSONStorage, CRIMINAL_STORE_KEY } from '@/app/services/criminalShardedPersistStorage';
import { makeInitialDraft } from './criminalCaseDraftFactory';

export const CRIMINAL_STORE_PERSIST_VERSION = 49;

export { CRIMINAL_STORE_KEY };

export function createCriminalStorePersistStorage<T>() {
    return createCriminalShardedJSONStorage<T>();
}

type CriminalPersistSlice = {
    casesById: unknown;
    pendingSeveranceContext: unknown | null;
    draft: unknown;
};

export function criminalStorePartialize(state: CriminalPersistSlice) {
    return {
        casesById: state.casesById,
        pendingSeveranceContext: state.pendingSeveranceContext,
        draft: state.pendingSeveranceContext != null ? makeInitialDraft() : state.draft,
    };
}
