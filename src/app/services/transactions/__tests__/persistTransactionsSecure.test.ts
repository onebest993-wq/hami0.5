import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageEncryptionError } from '@/app/services/SecureStoreService';

vi.mock('@/app/services/storage/readSecureOrDrainLegacySync', () => ({
    persistSecurePayloadWhenReady: vi.fn(),
}));

vi.mock('@/app/services/transactions/notifyTransactionsPersistFailure', () => ({
    notifyTransactionsPersistFailure: vi.fn(),
}));

import { persistSecurePayloadWhenReady } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { notifyTransactionsPersistFailure } from '@/app/services/transactions/notifyTransactionsPersistFailure';
import {
    persistTransactionsSecure,
    persistTransactionsSecureAwait,
} from '@/app/services/transactions/persistTransactionsSecure';

describe('persistTransactionsSecure', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('fire-and-forget: فشل التشفير يُبلَّغ ولا يُبتلع صامتاً', async () => {
        const error = new StorageEncryptionError('hami:transactions:v1', new Error('crypto-not-ready'));
        vi.mocked(persistSecurePayloadWhenReady).mockRejectedValueOnce(error);

        persistTransactionsSecure('hami:transactions:v1', '[]');
        await vi.waitFor(() => {
            expect(notifyTransactionsPersistFailure).toHaveBeenCalledWith(error);
        });
    });

    it('await: يُبلَّغ ثم يعيد الرمي حتى لا يُحسب الحفظ نجاحاً', async () => {
        const error = new StorageEncryptionError('hami:transactions:v1', new Error('crypto-not-ready'));
        vi.mocked(persistSecurePayloadWhenReady).mockRejectedValueOnce(error);

        await expect(persistTransactionsSecureAwait('hami:transactions:v1', '[]')).rejects.toBe(error);
        expect(notifyTransactionsPersistFailure).toHaveBeenCalledWith(error);
    });
});
