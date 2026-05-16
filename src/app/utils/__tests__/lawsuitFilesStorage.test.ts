import {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    loadLawsuitFilesRaw,
    saveLawsuitFilesRaw,
} from '@/app/utils/lawsuitFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('lawsuitFilesStorage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('loads from primary key when present', () => {
        const payload = [{ id: 'a' }, { id: 'b' }];
        SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadLawsuitFilesRaw()).toEqual(payload);
    });

    it('migrates from legacy key to primary without deleting legacy', () => {
        const payload = [{ id: 'x' }];
        const legacyKey = LAWSUIT_FILES_STORAGE_KEYS_LEGACY[0];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(payload));

        const loaded = loadLawsuitFilesRaw();
        expect(loaded).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(legacyKey)))).toEqual(payload);
    });

    it('saves to primary and legacy keys', () => {
        const payload = [{ id: 'z', foo: 1 }];
        saveLawsuitFilesRaw(payload);

        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(payload);
        LAWSUIT_FILES_STORAGE_KEYS_LEGACY.forEach((k) => {
            expect(JSON.parse(String(SecureStoreService.getItemSync(k)))).toEqual(payload);
        });
    });
});

