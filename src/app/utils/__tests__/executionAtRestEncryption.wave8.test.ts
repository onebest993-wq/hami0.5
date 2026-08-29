/**
 * الموجة 8 — سياسة محدّثة: بلوبات التنفيذ plaintext محلياً.
 * التشفير يبقى عند مزامنة السحابة فقط (SupabaseService.encryptJsonPayload).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';
import {
    shouldEncryptValue,
    isSensitiveStorageKey,
    isExecutionLocalPlaintextKey,
} from '@/app/services/secureStorageKeys';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    persistExecutionDossierBlob,
    readExecutionDossierBlob,
} from '@/app/utils/executionDossierBlobPersistence';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';

describe('execution local plaintext at rest (wave 8)', () => {
    const execId = 'exec_at_rest_wave8';
    const blobKey = executionStorageKey(execId);

    beforeAll(async () => {
        await CryptoService.initialize('wave8-test-passphrase');
    });

    afterAll(() => {
        CryptoService.destroy();
    });

    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
    });

    it('marks scoped execution dossier keys as local plaintext (not sensitive encrypt)', () => {
        expect(isExecutionLocalPlaintextKey(blobKey)).toBe(true);
        expect(isSensitiveStorageKey(blobKey)).toBe(false);
        expect(isSensitiveStorageKey('executionFiles')).toBe(false);
    });

    it('does not encrypt typical dossier JSON under the size cap', () => {
        const payload = JSON.stringify({
            id: execId,
            debtors: [{ name: 'مدين', phone: '07700000000' }],
        });
        expect(shouldEncryptValue(blobKey, payload)).toBe(false);
    });

    it('async secure store round-trips plaintext dossier without hami_enc_v2 prefix', async () => {
        const secretName = 'مدين_لا_يُخزَّن_نصاً_صريحاً';
        const ok = persistExecutionDossierBlob(execId, {
            id: execId,
            debtors: [{ name: secretName, phone: '07801112222' }],
        });
        expect(ok).toBe(true);

        const syncPlain = SecureStoreService.getItemSync(blobKey);
        expect(syncPlain).toBeTruthy();
        await SecureStoreService.setItem(blobKey, syncPlain!);

        const reloaded = await SecureStoreService.getItem(blobKey);
        expect(reloaded).toBeTruthy();
        expect(reloaded).toContain(secretName);
        expect(reloaded!.startsWith(ENCRYPTED_PREFIX)).toBe(false);

        const fromBlobReader = readExecutionDossierBlob(execId);
        expect(fromBlobReader?.debtors?.[0]?.name).toBe(secretName);
    });
});
