import {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    loadLawsuitFilesRaw,
    saveLawsuitFilesRaw,
} from '@/app/utils/lawsuitFilesStorage';
import { STORAGE_KEYS } from '@/app/utils/constants';
import SecureStoreService from '@/app/services/SecureStoreService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

describe('lawsuitFilesStorage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        persistenceRepository.remove(LAWSUIT_FILES_STORAGE_KEY);
    });

    it('uses lawyer_files as primary key', () => {
        expect(LAWSUIT_FILES_STORAGE_KEY).toBe(STORAGE_KEYS.LAWYER_FILES);
    });

    it('loads from primary key when present', () => {
        const payload = [{ id: 'a' }, { id: 'b' }];
        SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify(payload));
        expect(loadLawsuitFilesRaw()).toEqual(payload);
    });

    it('migrates from lawsuitFiles legacy key to lawyer_files', () => {
        const payload = [{ id: 'x' }];
        SecureStoreService.setItemSync('lawsuitFiles', JSON.stringify(payload));

        const loaded = loadLawsuitFilesRaw();
        expect(loaded).toEqual(payload);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(
            payload,
        );
    });

    it('migrates from hami-lawsuit-files legacy key', () => {
        const payload = [{ id: 'legacy' }];
        const legacyKey = LAWSUIT_FILES_STORAGE_KEYS_LEGACY[1];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(payload));

        expect(loadLawsuitFilesRaw()).toEqual(payload);
    });

    it('saves to primary and legacy mirror keys', () => {
        const payload = [{ id: 'z', foo: 1 }];
        saveLawsuitFilesRaw(payload);

        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(
            payload,
        );
        expect(JSON.parse(String(SecureStoreService.getItemSync('lawsuitFiles')))).toEqual(payload);
    });

    it('does not replace a richer lawyer_files payload with a poorer list', () => {
        const rich = [{ id: 'a' }, { id: 'b' }];
        saveLawsuitFilesRaw(rich);
        saveLawsuitFilesRaw([{ id: 'a' }]);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(
            rich,
        );
    });

    it('does not resurrect a permanently deleted dossier into the monolith', async () => {
        const { LAWSUIT_DOSSIER_TOMBSTONES_KEY } = await import(
            '@/app/utils/lawsuitDossierTombstones'
        );
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, JSON.stringify(['990001']));
        saveLawsuitFilesRaw([
            { id: 990001, status: 'deleted' },
            { id: 2, status: 'active' },
        ]);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual([
            { id: 2, status: 'active' },
        ]);
        saveLawsuitFilesRaw([{ id: 990001, status: 'deleted' }]);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(
            [],
        );
    });

    it('does not resurrect leftover lawsuitFiles after lawyer_files was emptied', () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_STORAGE_KEY,
            JSON.stringify([{ id: 'seed' }]),
        );
        SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, '[]', {
            allowVerifiedEmptyOverwrite: true,
            allowShrink: true,
        });
        SecureStoreService.setItemSync(
            'lawsuitFiles',
            JSON.stringify([{ id: 990001, status: 'deleted' }]),
        );
        expect(loadLawsuitFilesRaw()).toEqual([]);
        expect(JSON.parse(String(SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY)))).toEqual(
            [],
        );
    });
});
