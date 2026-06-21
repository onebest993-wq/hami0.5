import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    loadExecutionFilesRaw,
    saveExecutionFilesRawImmediate,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('executionFilesStorage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
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
});

