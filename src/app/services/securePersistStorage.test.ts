import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { defaultPersistWipeGuard, createSecureStateStorage } from '@/app/services/securePersistStorage';

describe('securePersistStorage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('defaultPersistWipeGuard blocks empty criminal store overwrite', () => {
        const existing = JSON.stringify({
            state: { casesById: { c1: { id: 'c1' } } },
        });
        const incoming = JSON.stringify({ state: { casesById: {} } });
        expect(defaultPersistWipeGuard(incoming, existing, 'hami:criminal:store')).toBe(true);
        expect(defaultPersistWipeGuard(incoming, existing, 'other-key')).toBe(false);
    });

    it('createSecureStateStorage refuses wipe via setItem guard', async () => {
        const storage = createSecureStateStorage();
        const key = 'hami:criminal:store';
        const existing = JSON.stringify({ state: { casesById: { a: { id: 'a' } } } });
        const empty = JSON.stringify({ state: { casesById: {} } });

        vi.spyOn(SecureStoreService, 'ensurePersistedReady').mockResolvedValue(undefined);
        vi.spyOn(SecureStoreService, 'getItem').mockResolvedValue(existing);
        const setItem = vi.spyOn(SecureStoreService, 'setItem').mockResolvedValue(undefined);

        await storage.setItem(key, empty);
        expect(setItem).not.toHaveBeenCalled();

        await storage.setItem(key, existing);
        expect(setItem).toHaveBeenCalledWith(key, existing);
    });

    it('getItem لا يرمي عندما getItem غير معرّف على المخزن', async () => {
        const storage = createSecureStateStorage();
        const store = SecureStoreService as unknown as { getItem?: unknown; ensurePersistedReady?: unknown };
        const prevGet = store.getItem;
        const prevReady = store.ensurePersistedReady;
        store.getItem = undefined;
        store.ensurePersistedReady = () => Promise.resolve();
        try {
            await expect(storage.getItem('execution-dashboard-storage')).resolves.toBeNull();
        } finally {
            store.getItem = prevGet;
            store.ensurePersistedReady = prevReady;
        }
    });

    it('getItem يرحّل مرآة localStorage ثم يمحوها', async () => {
        const key = 'legal-cases-storage';
        const payload = JSON.stringify({ state: { cases: [{ id: 'c1', clientName: 'أ' }] } });
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        localStorage.setItem(key, payload);

        const storage = createSecureStateStorage();
        const raw = await storage.getItem(key);
        expect(raw).toBe(payload);
        expect(localStorage.getItem(key)).toBeNull();
        expect(SecureStoreService.getItemSync(key)).toBe(payload);
    });
});
