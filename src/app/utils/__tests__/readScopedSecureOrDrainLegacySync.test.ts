import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { scopeExecutionDeviceStorageKey } from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { readScopedSecureOrDrainLegacySync } from '@/app/utils/readScopedSecureOrDrainLegacySync';

const LOGICAL = 'execution_scoped_drain_1';

describe('readScopedSecureOrDrainLegacySync', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
    });

    it('يرحّل leftover ويحذف المرآة', () => {
        localStorage.setItem(LOGICAL, JSON.stringify({ id: 'scoped_drain_1', fileNumber: 'ls' }));
        const raw = readScopedSecureOrDrainLegacySync(LOGICAL);
        expect(raw).toContain('"fileNumber":"ls"');
        expect(localStorage.getItem(LOGICAL)).toBeNull();
        expect(SecureStoreService.getItemSync(LOGICAL)).toContain('"fileNumber":"ls"');
    });

    it('لا يرحّل المرآة فوق أصل مقيّد لم يُفكّ', () => {
        setLiveAuthUserId('owner-a');
        const scoped = scopeExecutionDeviceStorageKey(LOGICAL);
        SecureStoreService.setItemSync(scoped, 'hami_enc_v2:scoped-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(LOGICAL, JSON.stringify({ fileNumber: 'poison' }));
        expect(SecureStoreService.isUnreadSync(scoped)).toBe(true);
        expect(readScopedSecureOrDrainLegacySync(LOGICAL)).toBeNull();
        expect(localStorage.getItem(LOGICAL)).not.toBeNull();
    });
});
