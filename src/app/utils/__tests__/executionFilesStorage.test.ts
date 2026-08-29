import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    __resetExecutionFilesStorageOwnerForTests,
    loadExecutionFilesRaw,
    saveExecutionFilesRawImmediate,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('executionFilesStorage', () => {
    beforeEach(() => {
        __resetExecutionFilesStorageOwnerForTests();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        localStorage.clear();
    });

    it('loads from primary key when present', () => {
        const payload = [{ id: 'a' }, { id: 'b' }];
        SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadExecutionFilesRaw()).toEqual(payload);
    });

    it('migrates from legacy key to primary without deleting legacy', () => {
        const payload = [{ id: 'x' }];
        const legacyKey = EXECUTION_FILES_STORAGE_KEYS_LEGACY[0];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(payload));

        const loaded = loadExecutionFilesRaw();
        expect(loaded).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY)))).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(legacyKey)))).toEqual(payload);
    });

    it('saves to primary and legacy keys', () => {
        const payload = [{ id: 'z', foo: 1 }];
        saveExecutionFilesRawImmediate(payload);

        expect(JSON.parse(String(SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY)))).toEqual(payload);
        EXECUTION_FILES_STORAGE_KEYS_LEGACY.forEach((k) => {
            expect(JSON.parse(String(SecureStoreService.getItemSync(k)))).toEqual(payload);
        });
    });

    it('auto-claims quarantined legacy index when this is the sole owner on device', async () => {
        const {
            bindExecutionFilesStorageOwner,
            hasQuarantinedExecutionFilesIndex,
            __resetExecutionFilesStorageOwnerForTests,
            loadExecutionFilesRaw: load,
        } = await import('@/app/utils/executionFilesStorage');
        __resetExecutionFilesStorageOwnerForTests();
        const payload = [{ id: 'legacy-1' }];
        SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, JSON.stringify(payload));
        bindExecutionFilesStorageOwner('user-a');
        expect(hasQuarantinedExecutionFilesIndex()).toBe(false);
        expect(load()).toEqual(payload);
    });

    it('keeps quarantine when another owned execution index already has rows', async () => {
        const {
            bindExecutionFilesStorageOwner,
            hasQuarantinedExecutionFilesIndex,
            claimQuarantinedExecutionFilesIndex,
            __resetExecutionFilesStorageOwnerForTests,
            loadExecutionFilesRaw: load,
        } = await import('@/app/utils/executionFilesStorage');
        __resetExecutionFilesStorageOwnerForTests();
        SecureStoreService.setItemSync(`${EXECUTION_FILES_STORAGE_KEY}:user-b`, JSON.stringify([{ id: 'other' }]));
        SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, JSON.stringify([{ id: 'legacy-1' }]));
        bindExecutionFilesStorageOwner('user-a');
        expect(hasQuarantinedExecutionFilesIndex()).toBe(true);
        expect(load()).toEqual([]);
        expect(claimQuarantinedExecutionFilesIndex('user-a')).toBe(true);
        expect(hasQuarantinedExecutionFilesIndex()).toBe(false);
        expect(load()).toEqual([{ id: 'legacy-1' }]);
        expect(claimQuarantinedExecutionFilesIndex('user-b')).toBe(false);
    });

    it('يرحّل leftover localStorage للفهرس ويمحوه', () => {
        const payload = [{ id: 'ls-idx' }];
        localStorage.setItem(EXECUTION_FILES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadExecutionFilesRaw()).toEqual(payload);
        expect(localStorage.getItem(EXECUTION_FILES_STORAGE_KEY)).toBeNull();
        expect(JSON.parse(String(SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY)))).toEqual(
            payload,
        );
    });
});

