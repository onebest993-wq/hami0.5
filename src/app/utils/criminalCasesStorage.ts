/**
 * Criminal cases storage — public barrel.
 * Import path `@/app/utils/criminalCasesStorage` is preserved for all consumers.
 */

export {
    CRIMINAL_STORE_KEY,
    CRIMINAL_STORAGE_PATCHED_EVENT,
    CRIMINAL_CARD_INDEX_KEY,
} from '@/app/utils/criminalCasesStorageHelpers';

export {
    loadCriminalCasesRaw,
    loadCriminalCasesRawAsync,
    loadCriminalCaseRecordByIdSync,
    loadCriminalCaseRecordByIdAsync,
    loadCriminalCasesCardIndexSync,
    loadCriminalCasesCardIndexAsync,
} from '@/app/utils/criminalCasesStorageRead';

export {
    patchCriminalCaseRecord,
    purgeCriminalCaseRecord,
} from '@/app/utils/criminalCasesStorageWrite';
