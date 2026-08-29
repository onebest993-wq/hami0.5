import { describe, expect, it, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
    saveExecutionFilesRawImmediate,
} from '@/app/utils/executionFilesStorage';
import {
    peekExecutionFilesIndexCache,
    syncExecutionFilesIndexCache,
} from '@/app/utils/executionFilesIndexCache';
import { storageCache } from '@/app/utils/storageCache';

describe('executionFilesIndexCache', () => {
    const owner = 'lawyer-index-cache';

    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        storageCache.clear();
    });

    it('يكتب ويقرأ كاش المالك لا المفتاح العام', () => {
        bindExecutionFilesStorageOwner(owner);
        saveExecutionFilesRawImmediate([{ id: 'owned-disk' }]);
        syncExecutionFilesIndexCache([{ id: 'owned-memory' }]);
        expect(peekExecutionFilesIndexCache()).toEqual([{ id: 'owned-memory' }]);
        expect(SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY)).toBeFalsy();
    });
});
