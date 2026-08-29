import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { createDeletedIdsLiteStore } from '@/app/services/storage/deletedIdsLiteStore';

const KEY = 'hami:smartvault:deleted:v1';

describe('deletedIdsLiteStore — لا تهيّئ فارغاً فوق unread', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        try {
            localStorage.removeItem(KEY);
        } catch {
            /* ignore */
        }
    });

    it('add أثناء ciphertext بارد لا يكتب قائمة جزئية عبر الجسر', async () => {
        SecureStoreService.setItemSync(KEY, 'hami_enc_v2:deleted-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(KEY)).toBe(true);

        const store = createDeletedIdsLiteStore(KEY, (k) => k.includes(':'));
        store.add(['author:doc-new']);
        await vi.waitFor(() => {
            /* microtask persist bridge */
        });
        await new Promise((r) => queueMicrotask(r));
        await new Promise((r) => setTimeout(r, 0));

        expect(SecureStoreService.getItemSync(KEY)).toBe(null);
        expect(SecureStoreService.isUnreadSync(KEY)).toBe(true);
        expect(store.has('author:doc-new')).toBe(true);

        store.resetForTests();
    });

    it('قرص فارغ حقيقي يسمح بالإضافة والكتابة', async () => {
        const store = createDeletedIdsLiteStore(KEY, (k) => k.includes(':'));
        store.add(['a:1']);
        await new Promise((r) => queueMicrotask(r));
        await new Promise((r) => setTimeout(r, 0));
        expect(store.has('a:1')).toBe(true);
        expect(SecureStoreService.getItemSync(KEY)).toBe(JSON.stringify(['a:1']));
        store.resetForTests();
    });
});
