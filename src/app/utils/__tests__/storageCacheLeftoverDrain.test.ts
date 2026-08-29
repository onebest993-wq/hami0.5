import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import { executionUnifiedFundsLedgerStorageKey } from '@/app/utils/executionStorageKeysLite';

const KEY = executionUnifiedFundsLedgerStorageKey('cache-drain');

describe('storageCache leftover drain', () => {
    beforeEach(() => {
        storageCache.clear();
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
    });

    it('يرحّل مرآة localStorage عند القراءة ويمحوها', () => {
        localStorage.setItem(KEY, JSON.stringify({ seeded: true, lawyerFees: [{ id: 'fee-1' }] }));
        const value = storageCache.get(KEY) as { seeded?: boolean; lawyerFees?: { id: string }[] };
        expect(value?.seeded).toBe(true);
        expect(value?.lawyerFees?.[0]?.id).toBe('fee-1');
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toContain('fee-1');
    });

    it('لا يرحّل المرآة فوق أصل مشفّر لم يُفكّ', () => {
        SecureStoreService.setItemSync(KEY, 'hami_enc_v2:ledger-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(KEY, JSON.stringify({ seeded: true, lawyerFees: [{ id: 'poison' }] }));
        expect(SecureStoreService.isUnreadSync(KEY)).toBe(true);
        expect(storageCache.get(KEY)).toBeNull();
        expect(localStorage.getItem(KEY)).not.toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toBeNull();
    });

    it('بعد الكتابة يمحو المرآة الصريحة', () => {
        localStorage.setItem(KEY, JSON.stringify({ stale: true }));
        expect(storageCache.set(KEY, { seeded: true, expenses: [] })).toBe(true);
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toContain('"seeded":true');
    });

    it('الحذف يمحو المرآة الصريحة أيضاً', () => {
        localStorage.setItem(KEY, JSON.stringify({ leftover: true }));
        storageCache.remove(KEY);
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(storageCache.get(KEY)).toBeNull();
    });
});
