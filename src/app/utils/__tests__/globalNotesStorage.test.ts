import {
    GLOBAL_NOTES_STORAGE_KEY,
    GLOBAL_NOTES_STORAGE_KEYS_LEGACY,
    loadGlobalNotesRaw,
    saveGlobalNotesRaw,
} from '@/app/utils/globalNotesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

describe('globalNotesStorage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        persistenceRepository.remove(STORAGE_KEYS.LAWYER_NOTES);
        GLOBAL_NOTES_STORAGE_KEYS_LEGACY.forEach((k) => persistenceRepository.remove(k));
        localStorage.clear();
    });

    it('loads from lawyer_notes when present', () => {
        const payload = [{ id: 'a' }, { id: 'b' }];
        SecureStoreService.setItemSync(STORAGE_KEYS.LAWYER_NOTES, JSON.stringify(payload));
        expect(loadGlobalNotesRaw()).toEqual(payload);
    });

    it('migrates from legacy key to lawyer_notes', () => {
        const payload = [{ id: 'x' }];
        const legacyKey = GLOBAL_NOTES_STORAGE_KEYS_LEGACY[0];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(payload));

        expect(loadGlobalNotesRaw()).toEqual(payload);
        expect(loadGlobalNotesRaw()).toEqual(payload);
    });

    it('saves to lawyer_notes canonical key', () => {
        const payload = [{ id: 'z', foo: 1 }];
        saveGlobalNotesRaw(payload);
        expect(loadGlobalNotesRaw()).toEqual(payload);
        expect(GLOBAL_NOTES_STORAGE_KEY).toBe(STORAGE_KEYS.LAWYER_NOTES);
    });

    it('يرحّل leftover localStorage ويمحوه', () => {
        const payload = [{ id: 'note-legacy' }];
        localStorage.setItem(GLOBAL_NOTES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadGlobalNotesRaw()).toEqual(payload);
        expect(localStorage.getItem(GLOBAL_NOTES_STORAGE_KEY)).toBeNull();
        expect(JSON.parse(String(SecureStoreService.getItemSync(GLOBAL_NOTES_STORAGE_KEY)))).toEqual(payload);
    });
});
