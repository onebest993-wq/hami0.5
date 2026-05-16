import {
    GLOBAL_NOTES_STORAGE_KEY,
    GLOBAL_NOTES_STORAGE_KEYS_LEGACY,
    loadGlobalNotesRaw,
    saveGlobalNotesRaw,
} from '@/app/utils/globalNotesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('globalNotesStorage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('loads from primary key when present', () => {
        const payload = [{ id: 'a' }, { id: 'b' }];
        SecureStoreService.setItemSync(GLOBAL_NOTES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadGlobalNotesRaw()).toEqual(payload);
    });

    it('migrates from legacy key to primary without deleting legacy', () => {
        const payload = [{ id: 'x' }];
        const legacyKey = GLOBAL_NOTES_STORAGE_KEYS_LEGACY[0];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(payload));

        const loaded = loadGlobalNotesRaw();
        expect(loaded).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(GLOBAL_NOTES_STORAGE_KEY)))).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(legacyKey)))).toEqual(payload);
    });

    it('saves to primary and legacy keys', () => {
        const payload = [{ id: 'z', foo: 1 }];
        saveGlobalNotesRaw(payload);

        expect(JSON.parse(String(SecureStoreService.getItemSync(GLOBAL_NOTES_STORAGE_KEY)))).toEqual(payload);
        GLOBAL_NOTES_STORAGE_KEYS_LEGACY.forEach((k) => {
            expect(JSON.parse(String(SecureStoreService.getItemSync(k)))).toEqual(payload);
        });
    });
});

