import { describe, expect, it, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
    hydrateExecutionFilesStorageForOwner,
    loadExecutionFilesRaw,
    saveExecutionFilesRawImmediate,
} from '@/app/utils/executionFilesStorage';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { readExecutionFilesBootstrap } from '@/app/utils/executionFilesBootstrap';
import { storageCache } from '@/app/utils/storageCache';

describe('execution files persistence — owner scoped durability', () => {
    const owner = 'lawyer-persist-test';
    const ownerKey = `${EXECUTION_FILES_STORAGE_KEY}:${owner}`;

    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        storageCache.clear();
    });

    it('saves and reloads dossier index under owner key after hydrate', async () => {
        bindExecutionFilesStorageOwner(owner);
        const payload = [{ id: 'exec-1', fileNumber: '100', type: 'execution' }];
        saveExecutionFilesRawImmediate(payload);

        expect(JSON.parse(String(SecureStoreService.getItemSync(ownerKey)))).toEqual(payload);

        __resetExecutionFilesStorageOwnerForTests();
        const hydrated = await hydrateExecutionFilesStorageForOwner(owner);
        expect(hydrated.key).toBe(ownerKey);
        expect(hydrated.rows).toEqual(payload);
        expect(loadExecutionFilesRaw()).toEqual(payload);
        expect(readExecutionFilesBootstrap()).toEqual(payload);
    });

    it('wipe guard blocks empty overwrite of owner-scoped index', () => {
        const existing = JSON.stringify([{ id: 'keep-me' }]);
        expect(shouldRejectDossierWipe(ownerKey, '[]', existing)).toBe(true);
        SecureStoreService.setItemSync(ownerKey, existing);
        bindExecutionFilesStorageOwner(owner);
        // محاولة مسح — يجب أن تُرفض
        saveExecutionFilesRawImmediate([]);
        expect(JSON.parse(String(SecureStoreService.getItemSync(ownerKey)))).toEqual([
            { id: 'keep-me' },
        ]);
    });

    it('durable save writes owner index that survives hydrate cycle', async () => {
        bindExecutionFilesStorageOwner(owner);
        const { saveExecutionFilesRawDurable } = await import('@/app/utils/executionFilesStorage');
        const payload = [{ id: 'durable-1', type: 'execution' }];
        await saveExecutionFilesRawDurable(payload);

        __resetExecutionFilesStorageOwnerForTests();
        const hydrated = await hydrateExecutionFilesStorageForOwner(owner);
        expect(hydrated.rows).toEqual(payload);
    });
});
